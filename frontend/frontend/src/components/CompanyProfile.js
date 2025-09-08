import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import BadgeGenerator from './BadgeGenerator';

function CompanyProfile() {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState({ id: companyId, name: "Loading...", overallScore: 0, scores: {}, perDRG: {} });
  const [indicators, setIndicators] = useState([]);
  const [open, setOpen] = useState({});
  const [activeTab, setActiveTab] = useState('overview');

  const refresh = () => {
    fetch(`/api/companies/${companyId}`)
      .then(response => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); })
      .then(data => setCompany(data))
      .catch(error => console.error(`Error fetching company ${companyId}:`, error));
  };

  useEffect(() => {
    refresh();
    fetch('/api/indicators')
      .then(response => response.json())
      .then(data => setIndicators(data))
      .catch(error => console.error('Error fetching indicators:', error));
  }, [companyId]);

  const toggleExplain = (criterion_name) => {
    setOpen(prev => ({ ...prev, [criterion_name]: !prev[criterion_name] }));
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${company.name}"? This action cannot be undone.`)) {
      fetch(`/api/companies/${company.id}`, { method: 'DELETE' })
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

      {/* Tabs */}
      <div className="tabs" style={{ marginTop: 16, display: 'flex', gap: 10 }}>
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            padding: '10px 14px',
            border: '2px solid #000',
            background: activeTab === 'overview' ? '#ffffff' : '#f7f7f7',
            color: '#000000',
            cursor: 'pointer',
            fontWeight: 700,
            boxShadow: activeTab === 'overview' ? '4px 4px 0 #000' : 'none'
          }}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('badge')}
          style={{
            padding: '10px 14px',
            border: '2px solid #000',
            background: activeTab === 'badge' ? '#ffffff' : '#f7f7f7',
            color: '#000000',
            cursor: 'pointer',
            fontWeight: 700,
            boxShadow: activeTab === 'badge' ? '4px 4px 0 #000' : 'none'
          }}
        >
          Badge
        </button>
      </div>

      {activeTab === 'overview' && (
        <>
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
                const key = indicator['Criterion\x2FMetric Name'];
                const value = company.scores?.[key] || 0;
                const isOpen = !!open[key];
                const parseScoring = (scoringLogic) => {
                  if (!scoringLogic) return [];
                  return scoringLogic.split(';')
                    .map(s => s.trim())
                    .filter(Boolean)
                    .map(item => {
                      const [valuePart, ...labelParts] = item.split('=');
                      const v = valuePart.trim();
                      const label = labelParts.join('=')?.trim();
                      const numeric = Number(v.replace(/[^0-9.-]/g, ''));
                      return { value: Number.isNaN(numeric) ? v : numeric, label: label || v };
                    });
                };
                const parseLegend = (legend) => {
                  const map = {};
                  if (!legend) return map;
                  legend.split(';').forEach(part => {
                    const seg = part.trim();
                    if (!seg) return;
                    const [label, ...rest] = seg.split(/\s*[–—-]\s*/); // before dash and after
                    const desc = rest.join(' – ').trim();
                    if (label) map[label.trim()] = desc;
                  });
                  return map;
                };
                const options = parseScoring(indicator['Scoring Logic']);
                const numericOptions = options
                  .map(o => (typeof o.value === 'number' ? o.value : Number(String(o.value).replace(/[^0-9.-]/g, ''))))
                  .filter(v => !Number.isNaN(v));
                const maxVal = numericOptions.length ? Math.max(...numericOptions) : 5;
                const selected = options.find(o => String(o.value) === String(value));
                const legendMap = parseLegend(indicator['Legend']);
                const selectedLegend = selected ? (legendMap[selected.label] || '') : '';
                return (
                  <li className="list-item" key={key} style={{ position: 'relative', flexDirection: 'column', alignItems: 'stretch' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>{key}</div>
                        <div className="helper">{indicator['Question']}</div>
                      </div>
                      <div style={{ width: 280 }}>
                        <div className="progress-wrap">
                          <div className="progress" style={{ width: `${Math.min(100, (maxVal ? (value / maxVal) * 100 : 0))}%` }} />
                        </div>
                      </div>
                      <div className="controls" style={{ marginLeft: 12 }}>
                        <button onClick={() => toggleExplain(key)}>{isOpen ? 'Hide' : '?'}</button>
                      </div>
                    </div>
                    {isOpen && (
                      <div className="llm-explanation" style={{ marginTop: 10 }}>
                        <div><strong>Rationale:</strong> {indicator['Rationale'] || 'No rationale provided.'}</div>
                        <div style={{ marginTop: 8 }}>
                          <strong>Level achieved:</strong> {selected ? `${selected.value} – ${selected.label}` : 'Not selected'}
                        </div>
                        {selectedLegend && (
                          <div style={{ marginTop: 6 }}>
                            <strong>Meaning:</strong> {selectedLegend}
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}

      {activeTab === 'badge' && (
        <div className="section" style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>Embeddable Badge</h3>
          <BadgeGenerator companyId={companyId} />
        </div>
      )}

      <div className="controls" style={{ marginTop: 24, textAlign: 'center' }}>
        <button onClick={handleDelete}>Delete Organisation</button>
      </div>
    </div>
  );
}

export default CompanyProfile;
