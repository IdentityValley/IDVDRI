// deno-lint-ignore-file no-explicit-any
// Supabase Edge Function: feedback-bot
// Single endpoint supporting subpaths: /chat and /feedback

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";
const CHAT_MODEL = Deno.env.get("CHAT_MODEL") || "gpt-4o-mini";
const CHAT_TEMPERATURE = Number(Deno.env.get("CHAT_TEMPERATURE") || 0.2);
const CHAT_MAX_TOKENS = Math.min(Number(Deno.env.get("CHAT_MAX_TOKENS") || 256), 512);
const CHAT_SYSTEM_PROMPT = Deno.env.get("CHAT_SYSTEM_PROMPT") || (
  "You are a friendly, concise assistant for the Digital Responsibility Index website. " +
  "Note: ‘DRG’ always means Digital Responsibility Goal (not group). " +
  "Your job is to: (1) help users provide actionable feedback on the evaluation, and (2) answer questions about the website, the evaluation flow, indicators/DRGs (including brief overviews of any DRG 1–7), and Identity Valley. " +
  "Stay within those topics; if something is clearly out of scope, gently say so. " +
  "Ask at most one short clarifying question, and only when needed to help. " +
  "Keep answers brief (1–3 sentences), warm in tone, and avoid links."
);

// Note: Supabase blocks secrets starting with SUPABASE_. Use custom names.
const SUPABASE_PROJECT_URL = Deno.env.get("PROJECT_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") || "";

const DRG_SUMMARIES: Record<string, string> = {
  "1": "Digital Literacy: Prerequisite for sovereign, self-determined use of digital tech; competent access and skills.",
  "2": "Cybersecurity: Protects systems and users/data across lifecycle; prerequisite for responsible operation.",
  "3": "Privacy: Human dignity and self-determination; purpose limitation and data minimization; control and accountability.",
  "4": "Data Fairness: Protect non-personal data, enable transfer/applicability; balanced cooperation in ecosystems.",
  "5": "Trustworthy Algorithms: Data processing must be trustworthy from simple to autonomous systems.",
  "6": "Transparency: Proactive transparency of principles, solutions, and components for all stakeholders.",
  "7": "Human Agency & Identity: Protect identity and preserve human responsibility; human-centered and inclusive.",
};

function cors(req: Request, resp: Response) {
  const origin = req.headers.get("origin") || "*";
  const headers = new Headers(resp.headers);
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Vary", "Origin");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, apikey, x-client-info, prefer");
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  headers.set("Access-Control-Max-Age", "86400");
  return new Response(resp.body, { status: resp.status, headers });
}

function ok(req: Request, data: any, init?: number) {
  return cors(req, new Response(JSON.stringify(data), { status: init || 200, headers: { "Content-Type": "application/json" } }));
}

function err(req: Request, message: string, init?: number) {
  return cors(req, new Response(JSON.stringify({ error: message }), { status: init || 400, headers: { "Content-Type": "application/json" } }));
}

async function handleChat(req: Request): Promise<Response> {
  let body: any = {};
  try {
    const ctype = req.headers.get("content-type") || "";
    if (ctype.includes("application/json")) {
      body = await req.json();
    } else {
      const text = await req.text();
      body = text ? JSON.parse(text) : {};
    }
  } catch (_) {
    body = {};
  }
  const messages: ChatMessage[] = body.messages || [];
  const context = body.context || {};
  const maxTokens = Math.max(32, Math.min(Number(body.max_tokens || CHAT_MAX_TOKENS), 512));
  const temperature = Math.max(0, Math.min(Number(body.temperature || CHAT_TEMPERATURE), 1));
  const model = String(body.model || CHAT_MODEL);
  const systemPromptOverride = body.system_prompt ? String(body.system_prompt) : null;

  const oaiMessages: ChatMessage[] = [
    { role: "system", content: systemPromptOverride || CHAT_SYSTEM_PROMPT },
  ];

  // Context and DRG
  const indicatorName: string | undefined = context.indicator_name || undefined;
  const drgShort: string = String(context.drg_short_code || "").trim();
  if (indicatorName) {
    oaiMessages.push({ role: "system", content: "Indicator context is provided to help tailor your reply. Do not restrict or reprimand users; accept feedback about any part of the evaluation." });
  }
  if (drgShort) {
    const drgSummary = DRG_SUMMARIES[drgShort];
    if (drgSummary) {
      oaiMessages.push({ role: "system", content: `DRG summary: ${drgSummary}` });
    }
  }
  const ctxParts = [`route: ${context.route}`];
  if (indicatorName) ctxParts.push(`indicator: ${indicatorName}`);
  if (drgShort) ctxParts.push(`drg: ${drgShort}`);
  oaiMessages.push({ role: "system", content: "Context — " + ctxParts.join("; ") });
  if (context.asked_followup) {
    oaiMessages.push({ role: "system", content: "Do not ask any more follow-ups. Respond concisely." });
  }

  // Append last few conversation messages
  const tail = messages.slice(-8);
  tail.forEach((m) => {
    const role = m.role === "user" ? "user" : "assistant";
    oaiMessages.push({ role, content: String(m.content || "").slice(0, 2000) });
  });

  if (!OPENAI_API_KEY) {
    return ok(req, { reply: "Thanks for sharing. Could you add one concrete example or suggestion?" });
  }

  try {
    // Add a timeout to avoid hanging requests
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages: oaiMessages, max_tokens: maxTokens, temperature }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));
    if (!resp.ok) {
      return ok(req, { reply: "Thanks for sharing. Could you add one concrete example or suggestion?" });
    }
    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content?.trim() || "Thanks for sharing. Could you add one concrete example or suggestion?";
    return ok(req, { reply: content });
  } catch (_e) {
    return ok(req, { reply: "Thanks for sharing. Could you add one concrete example or suggestion?" });
  }
}

async function handleFeedback(req: Request): Promise<Response> {
  let body: any = {};
  try {
    const ctype = req.headers.get("content-type") || "";
    if (ctype.includes("application/json")) {
      body = await req.json();
    } else {
      const text = await req.text();
      body = text ? JSON.parse(text) : {};
    }
  } catch (_) {
    body = {};
  }
  const record = {
    session_id: String(body.session_id || "").slice(0, 128),
    route: String(body.route || "").slice(0, 256),
    indicator_name: body.indicator_name || null,
    drg_short_code: body.drg_short_code || null,
    feedback_type: body.feedback_type || "general",
    message: String(body.message || "").slice(0, 6000),
    assistant_message: body.assistant_message ? String(body.assistant_message).slice(0, 6000) : null,
    consent: Boolean(body.consent || false),
    device: body.device || null,
    viewport_w: Number(body.viewport_w || 0) || null,
  };
  if (!record.session_id || !record.route || !record.message) {
    return err(req, "Missing required fields", 400);
  }
  if (!SUPABASE_PROJECT_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return err(req, "Supabase not configured for server-side insert", 500);
  }
  try {
    const supabase = createClient(SUPABASE_PROJECT_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { error } = await supabase.from("feedback").insert([record]);
    if (error) return err(req, error.message, 500);
    return ok(req, { saved: true }, 201);
  } catch (e: any) {
    return err(req, String(e?.message || e), 500);
  }
}

function routeFor(req: Request): "chat" | "feedback" | "unknown" {
  const url = new URL(req.url);
  // Expected paths: /functions/v1/feedback-bot, optionally with /chat or /feedback suffix
  const parts = url.pathname.split("/").filter(Boolean);
  const last = parts[parts.length - 1] || "";
  if (last === "chat" || last === "feedback") return last as any;
  // Also check query param ?path=chat
  const qp = url.searchParams.get("path");
  if (qp === "chat" || qp === "feedback") return qp as any;
  // Fallback to infer from body.action
  return "unknown";
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return cors(req, new Response(null, { status: 204 }));
  if (req.method !== "POST") return err(req, "Only POST supported", 405);
  const r = routeFor(req);
  if (r === "chat") return handleChat(req);
  if (r === "feedback") return handleFeedback(req);
  // Infer from body if no route segment
  const body = await req.json().catch(() => ({}));
  if (body && body.action === "chat") return handleChat(new Request(req.url, { method: "POST", body: JSON.stringify(body) }));
  if (body && body.action === "feedback") return handleFeedback(new Request(req.url, { method: "POST", body: JSON.stringify(body) }));
  return err(req, "Unknown path. Use /chat or /feedback.", 404);
}

// Standard export for Supabase Edge Functions
export default handler;


