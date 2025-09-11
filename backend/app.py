import os
import json
import csv
from flask import Flask, request, jsonify, send_from_directory, Response
from flask_cors import CORS
# Optional LLM integration (disabled if SDK/credentials not available)
try:
    from vertexai.preview.generative_models import GenerativeModel
    _vertex_available = True
except Exception:
    _vertex_available = False

try:
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))
except Exception:
    pass

app = Flask(__name__)
CORS(app, origins=['*']) # Enable CORS for all routes and origins
# --- OpenAI (optional) ---
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

# Chat config (env-configurable defaults)
CHAT_MODEL = os.getenv('CHAT_MODEL', 'gpt-4o-mini')
CHAT_TEMPERATURE = float(os.getenv('CHAT_TEMPERATURE', '0.2'))
CHAT_MAX_TOKENS = int(os.getenv('CHAT_MAX_TOKENS', '256'))
CHAT_SYSTEM_PROMPT = os.getenv('CHAT_SYSTEM_PROMPT', (
    "You are a friendly, concise assistant for the Digital Responsibility Index website. "
    "Note: ‘DRG’ always means Digital Responsibility Goal (not group). "
    "Your job is to: (1) help users provide actionable feedback on the evaluation, and (2) answer questions about the website, the evaluation flow, indicators/DRGs (including brief overviews of any DRG 1–7), and Identity Valley. "
    "Stay within those topics; if something is clearly out of scope, gently say so. "
    "Ask at most one short clarifying question, and only when needed to help. "
    "Keep answers brief (1–3 sentences), warm in tone, and avoid links."
))


# --- Supabase client (optional) ---
SUPABASE_URL = os.getenv('SUPABASE_URL') or 'https://pyvcwxkqtqmqwykayrto.supabase.co'
SUPABASE_KEY = os.getenv('SUPABASE_ANON_KEY') or 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5dmN3eGtxdHFtcXd5a2F5cnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjAyMTEsImV4cCI6MjA3Mjk5NjIxMX0.ZsGqB6ihkQ6B7FzeUhR9wlaw1rY2_0q4ZlkpKzaU3hw'

if SUPABASE_URL and SUPABASE_KEY:
    try:
        from supabase import create_client, Client
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception:
        supabase = None
else:
    supabase = None

# --- Vertex AI model (optional) ---
if _vertex_available:
    try:
        _model = GenerativeModel("gemini-1.5-flash")
    except Exception:
        _model = None
else:
    _model = None

# Load companies data
def load_companies():
    try:
        with open('companies.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return []

def save_companies(companies_data):
    with open('companies.json', 'w', encoding='utf-8') as f:
        json.dump(companies_data, f, indent=2, ensure_ascii=False)

companies_data = load_companies()

# Load indicators data
def load_indicators():
    try:
        # Try to load from CSV first using built-in csv module
        # Prefer Infosites CSV if present; adjust filename as needed
        csv_paths = [
            '../Indicator_Shortlist_with_Q_Rationale.csv',
            '../Indicator_Shortlist_with_Infosites.csv',
        ]
        for path in csv_paths:
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    reader = csv.DictReader(f)
                    indicators = []
                    for row in reader:
                        indicators.append({
                            'Criterion/Metric Name': str(row.get('Criterion/Metric Name', '') or ''),
                            'Rationale': str(row.get('Rationale', '') or ''),
                            'Scoring Logic': str(row.get('Scoring Logic', '') or ''),
                            'DRG': str(row.get('DRG', '') or ''),
                            'Legend': str(row.get('Legend', '') or ''),
                            'DRG Short Code': str(row.get('DRG Short Code', '') or ''),
                            'Question': str(row.get('Question', '') or ''),
                        })
                    if indicators:
                        return indicators
            except FileNotFoundError:
                continue
    except Exception as e:
        print(f"Error loading indicators from CSV: {e}")
    # Fallback to hardcoded data
    return [
        {
            'Criterion/Metric Name': 'Digital Literacy Policy & Governance',
            'Rationale': 'This evaluates whether the organization has established clear policies and governance structures for digital literacy.',
            'Scoring Logic': '0=No policy; 1=Basic policy; 2=Comprehensive policy with governance',
            'DRG': '1',
            'Legend': 'No policy – Basic policy – Comprehensive policy with governance'
        },
        {
            'Criterion/Metric Name': 'Incident response plan',
            'Rationale': 'This assesses whether the organization has a documented and tested incident response plan for cybersecurity incidents.',
            'Scoring Logic': '0=No plan; 1=Basic plan; 2=Comprehensive plan with testing',
            'DRG': '2',
            'Legend': 'No plan – Basic plan – Comprehensive plan with testing'
        }
    ]

INDICATORS_STATIC = load_indicators()

# --- Static site context (optional) ---
def _load_site_context() -> str:
    try:
        base_dir = os.path.dirname(__file__)
        path = os.path.join(base_dir, 'site_context.md')
        if os.path.exists(path):
            with open(path, 'r', encoding='utf-8') as f:
                txt = f.read().strip()
                return txt[:5000]
    except Exception:
        pass
    return ''

SITE_CONTEXT_TEXT = _load_site_context()

# DRG summaries (provided)
DRG_SUMMARIES = {
    '1': 'Digital Literacy: Prerequisite for sovereign, self-determined use of digital tech; competent access and skills.',
    '2': 'Cybersecurity: Protects systems and users/data across lifecycle; prerequisite for responsible operation.',
    '3': 'Privacy: Human dignity and self-determination; purpose limitation and data minimization; control and accountability.',
    '4': 'Data Fairness: Protect non-personal data, enable transfer/applicability; balanced cooperation in ecosystems.',
    '5': 'Trustworthy Algorithms: Data processing must be trustworthy from simple to autonomous systems.',
    '6': 'Transparency: Proactive transparency of principles, solutions, and components for all stakeholders.',
    '7': 'Human Agency & Identity: Protect identity, preserve human responsibility; human-centered, inclusive, ethical, sustainable.',
}

# Optional detailed DRG context (long-form)
def _load_drg_context() -> dict:
    mapping = {}
    try:
        base_dir = os.path.dirname(__file__)
        path = os.path.join(base_dir, 'drg_context.md')
        if os.path.exists(path):
            with open(path, 'r', encoding='utf-8') as f:
                text = f.read()
            # Expect sections like: \n## DRG1\n...paragraphs...
            current = None
            lines = text.splitlines()
            for line in lines:
                if line.strip().lower().startswith('## drg'):
                    # Extract number after DRG
                    import re
                    m = re.search(r'drg\s*#?\s*(\d+)', line, re.I)
                    if m:
                        current = m.group(1)
                        mapping[current] = []
                elif current:
                    mapping[current].append(line)
            for k in list(mapping.keys()):
                mapping[k] = ("\n".join(mapping[k]).strip())[:4000]
    except Exception:
        pass
    return mapping

DRG_DETAILS = _load_drg_context()

@app.route('/')
def serve_index():
    return send_from_directory('../frontend/build', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('../frontend/build', path)

@app.route('/api/indicators', methods=['GET'])
def get_indicators():
    return jsonify(INDICATORS_STATIC)

@app.route('/api/companies', methods=['GET'])
def get_companies():
    return jsonify(companies_data)

@app.route('/api/companies', methods=['POST'])
def add_company():
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    # Generate new ID
    new_id = max([c.get('id', 0) for c in companies_data], default=0) + 1
    
    # Create company object
    company = {
        'id': new_id,
        'name': data.get('name', ''),
        'description': data.get('description', ''),
        'website': data.get('website', ''),
        'evaluations': data.get('evaluations', []),
        'overallScore': data.get('overallScore', 0),
        'drgScores': data.get('drgScores', {}),
        'lastUpdated': data.get('lastUpdated', '')
    }
    
    companies_data.append(company)
    save_companies(companies_data)
    return jsonify(company), 201

@app.route('/api/companies/<int:company_id>', methods=['PUT'])
def update_company(company_id):
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    company = next((c for c in companies_data if c['id'] == company_id), None)
    if not company:
        return jsonify({"error": "Company not found"}), 404
    
    # Update company data
    company.update({
        'name': data.get('name', company['name']),
        'description': data.get('description', company['description']),
        'website': data.get('website', company['website']),
        'evaluations': data.get('evaluations', company['evaluations']),
        'overallScore': data.get('overallScore', company['overallScore']),
        'drgScores': data.get('drgScores', company['drgScores']),
        'lastUpdated': data.get('lastUpdated', company['lastUpdated'])
    })
    
    save_companies(companies_data)
    return jsonify(company), 200

@app.route('/api/companies/<int:company_id>', methods=['DELETE'])
def delete_company(company_id):
    global companies_data
    companies_data = [c for c in companies_data if c['id'] != company_id]
    save_companies(companies_data)
    return jsonify({"deleted": company_id}), 200

@app.route('/api/llm-explain', methods=['POST'])
def llm_explain():
    data = request.json
    criterion_name = data.get('criterion_name')
    if criterion_name:
        # Find the rationale from the loaded indicators
        rationale = "No rationale found."
        scoring_logic = "No scoring logic found."
        for indicator in INDICATORS_STATIC: # Use INDICATORS_STATIC here
            if indicator['Criterion/Metric Name'] == criterion_name:
                rationale = indicator.get('Rationale') or rationale
                scoring_logic = indicator.get('Scoring Logic') or scoring_logic
                break

        # Default concise explanation without external LLM
        default_explanation = (
            f"{criterion_name}: This criterion evaluates an organisation's practice in this area. "
            f"Why it matters: {rationale} "
            f"How it's scored: {scoring_logic}"
        )

        # If Vertex AI model is available, try enhancing the explanation
        if _model is not None:
            prompt = (
                f"Explain the following digital responsibility criterion in up to 4 sentences.\n"
                f"Name: {criterion_name}\n"
                f"Rationale: {rationale}\n"
                f"Scoring Logic: {scoring_logic}\n"
                f"Use plain, user-friendly language."
            )
            try:
                response = _model.generate_content(prompt)
                explanation_text = getattr(response, 'text', None) or default_explanation
                return jsonify({"explanation": explanation_text})
            except Exception:
                pass

        return jsonify({"explanation": default_explanation})
    return jsonify({"error": "Criterion name not provided"}), 400


@app.route('/api/llm/chat', methods=['POST'])
def llm_chat():
    """Proxy endpoint for OpenAI chat. Keeps API key server-side.
    Expects JSON: { messages: [{role, content}], context: {route, indicator_name, session_id}, max_tokens?, temperature? }
    """
    try:
        data = request.json or {}
        messages = data.get('messages') or []
        context = data.get('context') or {}
        # Defaults from env; allow bounded overrides per-request
        max_tokens = int(data.get('max_tokens', CHAT_MAX_TOKENS))
        max_tokens = max(32, min(max_tokens, 512))
        temperature = float(data.get('temperature', CHAT_TEMPERATURE))
        temperature = max(0.0, min(temperature, 1.0))
        model = str(data.get('model', CHAT_MODEL))
        # Optional per-request system prompt override (trim + length cap)
        system_prompt_override = data.get('system_prompt')

        # Safety: constrain and prefix with system prompt
        system_prompt = CHAT_SYSTEM_PROMPT if not system_prompt_override else str(system_prompt_override)[:2000]

        oai_messages = [{"role": "system", "content": system_prompt}]
        # Inject static site context if available (brief)
        if SITE_CONTEXT_TEXT:
            oai_messages.append({"role": "system", "content": f"Site context (brief):\n{SITE_CONTEXT_TEXT[:1200]}"})
        # Add limited per-request context
        indicator_name = context.get('indicator_name') or None
        drg_short_code = str(context.get('drg_short_code') or '').strip()
        ctx_lines = [
            f"route: {context.get('route')}",
        ]
        if indicator_name:
            ctx_lines.append(f"indicator: {indicator_name}")
            oai_messages.append({"role": "system", "content": "Indicator context is provided to help tailor your reply. Do not restrict or reprimand users; accept feedback about any part of the evaluation."})
        if drg_short_code:
            ctx_lines.append(f"drg: {drg_short_code}")
            drg_sum = DRG_SUMMARIES.get(drg_short_code)
            if drg_sum:
                oai_messages.append({"role": "system", "content": f"DRG summary: {drg_sum}"})
        extra_ctx = context.get('extra_context')
        if extra_ctx:
            oai_messages.append({"role": "system", "content": str(extra_ctx)[:1200]})
        oai_messages.append({"role": "system", "content": "Context — " + "; ".join(ctx_lines)})
        # Enforce one follow-up max
        if context.get('asked_followup'):
            oai_messages.append({"role": "system", "content": "Do not ask any more follow-ups. Respond concisely."})
        # Append user/assistant messages (truncate to last few)
        tail = messages[-8:]
        for m in tail:
            role = 'user' if m.get('role') == 'user' else 'assistant'
            oai_messages.append({"role": role, "content": m.get('content', '')[:2000]})

        # If the latest user message appears to ask about a DRG by name/number, inject detail
        try:
            import re
            last_user = None
            for m in reversed(tail):
                if m.get('role') == 'user':
                    last_user = m.get('content', '')
                    break
            if last_user:
                # Match patterns: DRG1, DRG 1, Digital Literacy, Privacy, Cybersecurity, etc.
                patterns = [
                    (r'\bdrg\s*#?\s*([1-7])\b', None),
                    (r'\bdigital\s+literacy\b', '1'),
                    (r'\bcyber\s*security|cybersecurity\b', '2'),
                    (r'\bprivacy\b', '3'),
                    (r'\bdata\s+fairness\b', '4'),
                    (r'\btrustworthy\s+algorithms?\b', '5'),
                    (r'\btransparency\b', '6'),
                    (r'\bhuman\s+agency(\s+and\s+identity)?\b', '7'),
                ]
                found = None
                for pat, static_num in patterns:
                    m = re.search(pat, last_user, re.I)
                    if m:
                        found = static_num or m.group(1)
                        break
                if found:
                    # Prefer long-form details if available; else one-liner summary
                    detail = DRG_DETAILS.get(found)
                    if detail:
                        oai_messages.append({"role": "system", "content": f"Detailed DRG{found} context:\n{detail[:1500]}"})
                    else:
                        drg_sum = DRG_SUMMARIES.get(found)
                        if drg_sum:
                            oai_messages.append({"role": "system", "content": f"DRG{found} summary: {drg_sum}"})
        except Exception:
            pass

        if not OPENAI_API_KEY:
            # Fallback: canned reply when key is missing
            return jsonify({"reply": "Thanks for sharing. Could you add one concrete example or suggestion?"})

        import requests
        headers = {"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"}
        payload = {
            "model": model,
            "messages": oai_messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        resp = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        content = data.get('choices', [{}])[0].get('message', {}).get('content', '').strip()
        if not content:
            content = "Thanks for sharing. Could you add one concrete example or suggestion?"
        return jsonify({"reply": content})
    except Exception:
        return jsonify({"reply": "Thanks for sharing. Could you add one concrete example or suggestion?"})


@app.route('/api/feedback', methods=['POST'])
def save_feedback():
    """Persist feedback to Supabase (preferred) or accept it as received.
    Expected JSON body with fields similar to:
      {
        session_id, route, indicator_name?, drg_short_code?, feedback_type?,
        message, assistant_message?, consent, device?, viewport_w?
      }
    """
    try:
        payload = request.json or {}
        # Minimal required fields
        session_id = payload.get('session_id') or ''
        route = payload.get('route') or ''
        message = payload.get('message') or ''
        consent = bool(payload.get('consent', False))

        if not (session_id and route and message):
            return jsonify({"error": "Missing required fields"}), 400

        record = {
            'session_id': str(session_id)[:128],
            'route': str(route)[:256],
            'indicator_name': (payload.get('indicator_name') or None),
            'drg_short_code': (payload.get('drg_short_code') or None),
            'feedback_type': (payload.get('feedback_type') or 'general'),
            'message': str(message)[:6000],
            'assistant_message': (str(payload.get('assistant_message') or '')[:6000] or None),
            'consent': consent,
            'device': (payload.get('device') or None),
            'viewport_w': int(payload.get('viewport_w') or 0) or None,
        }

        if supabase is None:
            # Supabase not configured; return explicit error
            return jsonify({"saved": False, "error": "Supabase not configured on backend (set SUPABASE_URL and SUPABASE_ANON_KEY)"}), 500

        # Insert into Supabase table 'feedback'
        try:
            res = supabase.table('feedback').insert(record).execute()
            return jsonify({"saved": True}), 201
        except Exception as e:
            # Log server-side for debugging
            try:
                print('Feedback insert error:', str(e))
            except Exception:
                pass
            return jsonify({"saved": False, "error": str(e)}), 500
    except Exception as e:
        try:
            print('Feedback endpoint error:', str(e))
        except Exception:
            pass
        return jsonify({"saved": False, "error": str(e)}), 500


@app.route('/api/feedback', methods=['GET'])
def list_feedback():
    """List recent feedback records (server-side). Supports optional query params:
       limit (default 100, max 1000), route, indicator_name.
    """
    try:
        if supabase is None:
            return jsonify({"items": [], "warning": "Supabase not configured"}), 200

        limit = int(request.args.get('limit', '100'))
        limit = max(1, min(limit, 1000))

        query = supabase.table('feedback').select('*').order('created_at', desc=True).limit(limit)

        route = request.args.get('route')
        indicator_name = request.args.get('indicator_name')
        if route:
            query = query.eq('route', route)
        if indicator_name:
            query = query.eq('indicator_name', indicator_name)

        result = query.execute()
        items = getattr(result, 'data', []) or []
        return jsonify({"items": items})
    except Exception as e:
        return jsonify({"items": [], "error": str(e)}), 500


@app.route('/api/health', methods=['GET'])
def health():
    """Simple health check to verify backend config/state."""
    return jsonify({
        "ok": True,
        "supabase_configured": bool(supabase is not None),
        "openai_configured": bool(OPENAI_API_KEY is not None and len(OPENAI_API_KEY) > 0),
    })

@app.route('/api/badge/<int:company_id>', methods=['GET'])
def get_badge(company_id):
    company = next((c for c in companies_data if c['id'] == company_id), None)
    if not company:
        return "Company not found", 404

    score = company.overallScore
    color = "#ffdd00"  # Yellow from the palette

    svg_content = f'''
    <svg width="120" height="30" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="black"/>
      <rect x="0" y="0" width="{(score/5)*100}" height="100%" fill="{color}"/>
      <text x="50%" y="50%" font-family="Arial" font-size="14" fill="white" text-anchor="middle" alignment-baseline="middle">
        Score: {score:.1f}
      </text>
    </svg>
    '''
    return Response(svg_content, mimetype="image/svg+xml")

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
