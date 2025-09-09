import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import BadgeGenerator from './BadgeGenerator';
import { apiUrl } from '../api';
import { INDICATORS_FALLBACK } from '../indicators';

function CompanyProfile() {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState({ id: companyId, name: "Loading...", overallScore: 0, scores: {}, perDRG: {} });
  const [indicators, setIndicators] = useState([]);
  const [explanation, setExplanation] = useState({});
  const [open, setOpen] = useState({});

  // Parse maximum score from an indicator's "Scoring Logic" string
  const getMaxScoreFromScoringLogic = (scoringLogic) => {
    try {
      const logic = String(scoringLogic || '');
      const parts = logic.split(';').map(p => p.trim()).filter(Boolean);
      const numbers = [];
      parts.forEach(part => {
        const left = part.split('=')[0];
        const digits = (left || '').replace(/[^0-9]/g, '');
        if (digits !== '') numbers.push(parseInt(digits, 10));
      });
      return numbers.length ? Math.max(...numbers) : 5;
    } catch (e) {
      return 5;
    }
  };

  // Parse legend string into [{title, desc}] using en dash or hyphen separators
  const parseLegend = (legend) => {
    if (!legend) return [];
    const items = String(legend)
      .split(';')
      .map(part => part.trim())
      .filter(Boolean);
    return items.map(item => {
      const split = item.split('–');
      if (split.length > 1) {
        return { title: split[0].trim(), desc: split.slice(1).join('–').trim() };
      }
      const hy = item.split(' - ');
      if (hy.length > 1) {
        return { title: hy[0].trim(), desc: hy.slice(1).join(' - ').trim() };
      }
      return { title: item.trim(), desc: '' };
    });
  };

  const refresh = () => {
    fetch(apiUrl(`/api/companies/${companyId}`))
      .then(response => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); })
      .then(data => setCompany(data))
      .catch(error => console.error(`Error fetching company ${companyId}:`, error));
  };

  useEffect(() => {
    refresh();
    fetch(apiUrl('/api/indicators'))
      .then(response => response.json())
      .then(data => setIndicators(data))
      .catch(error => {
        console.error('Error fetching indicators, using fallback:', error);
        setIndicators(INDICATORS_FALLBACK);
      });
  }, [companyId]);

  const ensureExplanation = (criterion_name) => {
    if (explanation[criterion_name]) return Promise.resolve();
    return fetch(apiUrl('/api/llm-explain'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ criterion_name }) })
      .then(response => response.json())
      .then(data => setExplanation(prev => ({ ...prev, [criterion_name]: data.explanation })))
      .catch(error => console.error('Error fetching explanation:', error));
  };

  const toggleExplain = (criterion_name) => {
    const next = !open[criterion_name];
    if (next) {
      ensureExplanation(criterion_name).then(() => setOpen(prev => ({ ...prev, [criterion_name]: true })));
    } else {
      setOpen(prev => ({ ...prev, [criterion_name]: false }));
    }
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${company.name}"? This action cannot be undone.`)) {
      fetch(apiUrl(`/api/companies/${company.id}`), { method: 'DELETE' })
        .then(() => navigate('/'))
        .catch(err => console.error('Delete failed', err));
    }
  };

  return (
    <div className="company-profile">
      <div className="controls" style={{ marginBottom: 16 }}>
        <button onClick={() => navigate('/')}>← Back</button>
      </div>
      <div className="company-header">
        <h2 style={{ margin: 0 }}>{company.name}</h2>
        <span className="badge">Overall {company.overallScore?.toFixed ? company.overallScore.toFixed(2) : company.overallScore}/10</span>
      </div>

      <div className="section" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Per-DRG Breakdown</h3>
        <ul className="list">
          {Object.entries(company.perDRG || {}).map(([drg, value]) => (
            <li className="list-item" key={drg}>
              <div style={{ display: 'flex', alignItems: 'center', width: 140, fontWeight: 600 }}>
                <img 
                  src={`/DRG${drg}.png`} 
                  alt={`DRG ${drg}`}
                  style={{ width: 24, height: 24, marginRight: 8 }}
                />
                DRG #{drg}
              </div>
              <div style={{ flex: 1 }}>
                <div className="progress-wrap">
                  <div className="progress" style={{ width: `${Math.min(100, (value || 0) * 10)}%` }} />
                </div>
              </div>
              <span className="badge">{(value || 0).toFixed(2)}/10</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="section" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Evaluation Breakdown</h3>
        <ul className="list">
          {indicators.map(indicator => {
            const key = indicator['Criterion/Metric Name'];
            const value = company.scores?.[key] || 0;
            const isOpen = !!open[key];
            return (
              <li className="list-item" key={key} style={{ position: 'relative', flexDirection: 'column', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{key}</div>
                    <div className="helper">{indicator['Question']}</div>
                  </div>
                  <div style={{ width: 280 }}>
                    <div className="progress-wrap">
                      {(() => {
                        const maxScore = getMaxScoreFromScoringLogic(indicator['Scoring Logic']);
                        const safeMax = maxScore && maxScore > 0 ? maxScore : 5;
                        const percent = Math.max(0, Math.min(100, (value / safeMax) * 100));
                        return <div className="progress" style={{ width: `${percent}%` }} />;
                      })()}
                    </div>
                  </div>
                  <div className="controls" style={{ marginLeft: 12 }}>
                    <button onClick={() => toggleExplain(key)}>{isOpen ? 'Hide' : '?'}</button>
                  </div>
                </div>
                {isOpen && (
                  <div className="llm-explanation" style={{ marginTop: 10 }}>
                    {(() => {
                      const maxScore = getMaxScoreFromScoringLogic(indicator['Scoring Logic']);
                      const safeMax = maxScore && maxScore > 0 ? maxScore : 5;
                      return (
                        <div>
                          <div style={{ fontWeight: 700, marginBottom: 6 }}>Score: {value} / {safeMax}</div>
                          {indicator['Rationale'] && (
                            <div style={{ marginBottom: 8 }}><strong>Why are we asking this?</strong> {indicator['Rationale']}</div>
                          )}
                          {indicator['Legend'] && (
                            <div>
                              {parseLegend(indicator['Legend']).map((it, idx) => (
                                <div key={idx} style={{ marginBottom: 4 }}>
                                  <strong>{it.title}</strong>{it.desc ? ` – ${it.desc}` : ''}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="section" style={{ marginTop: 16 }}>
        <BadgeGenerator companyId={companyId} />
      </div>

      <div className="controls" style={{ marginTop: 24, textAlign: 'center' }}>
        <button onClick={handleDelete}>Delete Organisation</button>
      </div>
    </div>
  );
}

export default CompanyProfile;
