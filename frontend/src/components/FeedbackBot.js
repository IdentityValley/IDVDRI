import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../supabase';

function getOrCreateSessionId() {
  try {
    const existing = localStorage.getItem('sessionId');
    if (existing) return existing;
    const next = (self.crypto && self.crypto.randomUUID) ? self.crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
    localStorage.setItem('sessionId', next);
    return next;
  } catch (_) {
    return String(Date.now());
  }
}

const INITIAL_PROMPT = 'Hi! I\'m here to collect your feedback or clarify questions about the evaluation. What\'s on your mind?';

export default function FeedbackBot({ route = '/new-evaluation', indicatorName = '', drgShortCode = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(() => [{ role: 'assistant', content: INITIAL_PROMPT }]);
  const [input, setInput] = useState('');
  const [consent, setConsent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const sessionId = useMemo(() => getOrCreateSessionId(), []);
  const panelRef = useRef(null);

  const device = useMemo(() => (typeof window !== 'undefined' && window.innerWidth <= 768 ? 'mobile' : 'desktop'), []);
  const viewportWidth = useMemo(() => (typeof window !== 'undefined' ? window.innerWidth : 0), []);

  const callLLM = async (userText) => {
    try {
      console.log('Calling LLM API with:', { userText, route, indicatorName, sessionId });
      const res = await fetch('http://127.0.0.1:5000/api/llm/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: userText }],
          context: { route, indicator_name: indicatorName, session_id: sessionId },
          max_tokens: 256,
          temperature: 0.3
        })
      });
      console.log('LLM API response status:', res.status);
      const data = await res.json();
      console.log('LLM API response data:', data);
      const reply = (data && data.reply) ? data.reply : 'Thanks for sharing. Could you add one concrete example or suggestion?';
      return reply;
    } catch (error) {
      console.error('LLM API error:', error);
      const base = indicatorName ? `Thanks. Regarding "${indicatorName}": ` : 'Thanks. ';
      const follow = 'Could you share what felt unclear or hard to use?';
      return base + follow;
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    setIsSending(true);
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');

    try {
      const assistant = await callLLM(text);
      setMessages(prev => [...prev, { role: 'assistant', content: assistant }]);

      // Optional: store to Supabase when consent is checked
      if (consent && supabase) {
        await supabase.from('feedback').insert([
          {
            session_id: sessionId,
            route: route,
            indicator_name: indicatorName || null,
            drg_short_code: drgShortCode || null,
            feedback_type: indicatorName ? 'clarify_question' : 'general',
            message: text,
            assistant_message: assistant,
            consent: true,
            device: device,
            viewport_w: viewportWidth,
          }
        ]);
      }
    } catch (e) {
      // Non-blocking error handling; keep chat flowing
    } finally {
      setIsSending(false);
    }
  };

  // Close on escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setIsOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div style={{ position: 'fixed', right: 'max(16px, calc((100vw - 1100px)/2 - 16px))', bottom: 72, zIndex: 9999 }}>
      {!isOpen && (
        <button
          aria-label="Open feedback chat"
          onClick={() => setIsOpen(true)}
          style={{
            width: 68,
            height: 68,
            borderRadius: '50%',
            background: '#ffdd00',
            border: '3px solid #000',
            boxShadow: '6px 6px 0 #000',
            cursor: 'pointer',
            fontWeight: 700,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'pulse-double 8s infinite'
          }}
        >
          <span role="img" aria-label="assistant" style={{ fontSize: 36, lineHeight: 1 }}>👾</span>
          <span
            style={{
              position: 'absolute',
              left: '100%',
              top: '50%',
              transform: 'translateY(-50%)',
              background: '#fff',
              color: '#000',
              border: '2px solid #000',
              boxShadow: '4px 4px 0 #000',
              padding: '6px 10px',
              fontSize: 12,
              borderRadius: 12,
              whiteSpace: 'nowrap',
              marginLeft: 8
            }}
          >
            Feedback? Question?
          </span>
        </button>
      )}

      {isOpen && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Feedback chatbot"
          style={{
            width: 320,
            maxWidth: '90vw',
            background: '#fff',
            border: '2px solid #000',
            boxShadow: '8px 8px 0 #000',
            padding: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontWeight: 800 }}>Feedback</div>
            <button onClick={() => setIsOpen(false)} style={{ background: '#fff', border: '2px solid #000', padding: '4px 8px', boxShadow: '3px 3px 0 #000', cursor: 'pointer' }}>Close</button>
          </div>

          <div style={{ height: 220, overflowY: 'auto', border: '2px solid #000', padding: 8, background: '#fff', boxShadow: 'inset 3px 3px 0 #00000012', marginBottom: 8 }}>
            {messages.map((m, idx) => (
              <div key={idx} style={{ marginBottom: 8, color: '#000' }}>
                <strong>{m.role === 'assistant' ? 'Bot' : 'You'}:</strong> {m.content}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <textarea
              rows={2}
              placeholder={indicatorName ? `Ask about: ${indicatorName}` : 'Type your feedback here...'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              style={{ width: '100%', border: '2px solid #000', padding: 8, boxShadow: 'inset 3px 3px 0 #00000012' }}
            />
            <label className="helper" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              Store my feedback anonymously (no personal data).
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={handleSend}
                disabled={isSending || !input.trim()}
                style={{ background: '#fff', border: '2px solid #000', padding: '8px 12px', boxShadow: '3px 3px 0 #000', cursor: 'pointer', fontWeight: 700 }}
              >
                {isSending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


