import React, { useEffect, useState } from 'react';

export default function AdminFeedback({ backendBaseUrl = 'http://127.0.0.1:5000' }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [routeFilter, setRouteFilter] = useState('');
  const [indicatorFilter, setIndicatorFilter] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const qs = new URLSearchParams();
        if (routeFilter) qs.set('route', routeFilter);
        if (indicatorFilter) qs.set('indicator_name', indicatorFilter);
        const res = await fetch(`${backendBaseUrl}/api/feedback?${qs.toString()}`);
        const data = await res.json();
        setItems(Array.isArray(data.items) ? data.items : []);
      } catch (e) {
        setError('Failed to fetch feedback.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [backendBaseUrl, routeFilter, indicatorFilter]);

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Feedback Admin</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <label className="label">Route filter</label>
          <input className="input" value={routeFilter} onChange={(e)=>setRouteFilter(e.target.value)} placeholder="/new-evaluation" />
        </div>
        <div>
          <label className="label">Indicator filter</label>
          <input className="input" value={indicatorFilter} onChange={(e)=>setIndicatorFilter(e.target.value)} placeholder="Indicator name" />
        </div>
      </div>
      {loading && <div>Loading…</div>}
      {error && <div className="helper" style={{ color: '#b00020' }}>{error}</div>}
      {!loading && !error && (
        <div className="grid" style={{ marginTop: 12 }}>
          {items.map(it => (
            <div key={it.id} className="card" style={{ gridColumn: 'span 12' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <div className="helper">{new Date(it.created_at).toLocaleString()} · {it.route}</div>
                  <div style={{ marginTop: 6 }}>
                    <strong>User:</strong> {it.message}
                  </div>
                  {it.assistant_message && (
                    <div style={{ marginTop: 4 }}>
                      <strong>Assistant:</strong> {it.assistant_message}
                    </div>
                  )}
                </div>
                <div className="helper" style={{ minWidth: 220 }}>
                  <div>Session: {it.session_id}</div>
                  {it.indicator_name && <div>Indicator: {it.indicator_name}</div>}
                  {it.drg_short_code && <div>DRG: {it.drg_short_code}</div>}
                  <div>Consent: {String(it.consent)}</div>
                  {it.device && <div>Device: {it.device}</div>}
                  {it.viewport_w && <div>Viewport: {it.viewport_w}</div>}
                </div>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <div className="card" style={{ gridColumn: 'span 12' }}>
              <div>No feedback found.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


