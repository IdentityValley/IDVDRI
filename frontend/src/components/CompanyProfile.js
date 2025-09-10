import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import BadgeGenerator from './BadgeGenerator';
import { INDICATORS_FALLBACK } from '../indicators';
import { getCompany, deleteCompany } from '../storage';
import { INDICATOR_RESOURCES } from '../indicatorResources';

function CompanyProfile() {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState({ id: companyId, name: "Loading...", overallScore: 0, scores: {}, perDRG: {} });
  const [indicators, setIndicators] = useState([]);
  const [explanation, setExplanation] = useState({});
  const [open, setOpen] = useState({});
  const [openResources, setOpenResources] = useState({});
  const [activeTab, setActiveTab] = useState('overview');
  const PROOF_INDICATORS = [
    'Digital Literacy Policy & Governance',
    'Incident response plan',
    'Security Certification/Compliance',
    'Participation in Data Altruism',
    'Algorithmic Impact Assessments Conducted',
    'Clear Privacy Policy & Data Use Disclosure',
    'Public Digital Ethics Principles Published'
  ];
  const [proofs, setProofs] = useState({});

  const loadProofs = (cid) => {
    try {
      const raw = localStorage.getItem(`proofs:${cid}`);
      const parsed = raw ? JSON.parse(raw) : {};
      // ensure entries for all proof indicators
      const next = { ...parsed };
      PROOF_INDICATORS.forEach(name => {
        if (!next[name]) {
          next[name] = { uploaded: false, verified: false, filename: '' };
        }
      });
      return next;
    } catch (e) {
      const fallback = {};
      PROOF_INDICATORS.forEach(name => { fallback[name] = { uploaded: false, verified: false, filename: '' }; });
      return fallback;
    }
  };

  const saveProofs = (cid, data) => {
    try {
      localStorage.setItem(`proofs:${cid}`, JSON.stringify(data));
    } catch (e) {
      // ignore
    }
  };

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

  const refresh = async () => {
    try {
      const companyData = await getCompany(parseInt(companyId));
      if (companyData) {
        setCompany(companyData);
      } else {
        console.error(`Company ${companyId} not found`);
        navigate('/');
      }
    } catch (error) {
      console.error('Error loading company:', error);
      navigate('/');
    }
  };

  useEffect(() => {
    refresh();
    setIndicators(INDICATORS_FALLBACK);
    setProofs(loadProofs(companyId));
  }, [companyId]);

  const handleMockUpload = (indicatorName) => {
    setProofs(prev => {
      const next = { ...prev, [indicatorName]: { uploaded: true, verified: false, filename: 'uploaded_document.pdf' } };
      saveProofs(companyId, next);
      return next;
    });
  };

  const handleToggleVerify = (indicatorName) => {
    setProofs(prev => {
      const current = prev[indicatorName] || { uploaded: false, verified: false, filename: '' };
      const next = { ...prev, [indicatorName]: { ...current, verified: !current.verified } };
      saveProofs(companyId, next);
      return next;
    });
  };

  const ensureExplanation = (criterion_name) => {
    if (explanation[criterion_name]) return Promise.resolve();
    // Generate explanation locally from indicator data
    const indicator = indicators.find(ind => ind['Criterion/Metric Name'] === criterion_name);
    if (indicator) {
      const explanation_text = `${criterion_name}: This criterion evaluates an organisation's practice in this area. Why it matters: ${indicator.Rationale} How it's scored: ${indicator['Scoring Logic']}`;
      setExplanation(prev => ({ ...prev, [criterion_name]: explanation_text }));
    }
    return Promise.resolve();
  };

  const toggleExplain = (criterion_name) => {
    const next = !open[criterion_name];
    if (next) {
      ensureExplanation(criterion_name).then(() => setOpen(prev => ({ ...prev, [criterion_name]: true })));
    } else {
      setOpen(prev => ({ ...prev, [criterion_name]: false }));
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete "${company.name}"? This action cannot be undone.`)) {
      try {
        await deleteCompany(company.id);
        navigate('/');
      } catch (error) {
        console.error('Error deleting company:', error);
      }
    }
  };

  return (
    <div className="company-profile">
      <div className="controls" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => navigate('/')}>← Back</button>
        <button 
          className="delete-btn" 
          onClick={handleDelete}
          title="Delete Organisation"
        >
          Delete
        </button>
      </div>
      
      <div className="company-header">
        <h2 style={{ margin: 0 }}>{company.name}</h2>
        <span className="badge">Overall {company.overallScore?.toFixed ? company.overallScore.toFixed(2) : company.overallScore}/10</span>
      </div>

      <div className="tabs">
        <div 
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </div>
        <div 
          className={`tab ${activeTab === 'proofs' ? 'active' : ''}`}
          onClick={() => setActiveTab('proofs')}
        >
          Proofs
        </div>
        <div 
          className={`tab ${activeTab === 'resources' ? 'active' : ''}`}
          onClick={() => setActiveTab('resources')}
        >
          Resources
        </div>
        <div 
          className={`tab ${activeTab === 'badge' ? 'active' : ''}`}
          onClick={() => setActiveTab('badge')}
        >
          Create Badge
        </div>
      </div>

      <div className={`tab-content ${activeTab === 'overview' ? 'active' : ''}`}>
        <div className="section" style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>Per-DRG Breakdown</h3>
          <ul className="list">
            {Object.entries(company.perDRG || {}).map(([drg, value]) => (
              <li className="list-item" key={drg}>
                <div style={{ display: 'flex', alignItems: 'center', width: 140, fontWeight: 600 }}>
                  <img 
                    src={`${process.env.PUBLIC_URL}/DRG${drg}.png`} 
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
              const proofStatus = (proofs || {})[key] || { uploaded: false, verified: false };
              return (
                <li className="list-item" key={key} style={{ position: 'relative', flexDirection: 'column', alignItems: 'stretch' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{key}</span>
                        {PROOF_INDICATORS.includes(key) && (
                          <span className="mini-proof" title={`Proof uploaded: ${proofStatus.uploaded ? 'Yes' : 'No'} | Verified: ${proofStatus.verified ? 'Yes' : 'No'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <span className={`mini-badge ${proofStatus.uploaded ? 'success' : 'secondary'}`} title={proofStatus.uploaded ? 'Proof uploaded' : 'No proof uploaded'}>U</span>
                            <span className={`mini-badge ${proofStatus.verified ? 'success' : 'secondary'}`} title={proofStatus.verified ? 'Proof verified' : 'Not verified'}>V</span>
                          </span>
                        )}
                      </div>
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
                    <div className="controls" style={{ marginLeft: 12, alignItems: 'center' }}>
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
                            <div style={{ fontWeight: 700, marginBottom: 6, color: '#000' }}>Score: {value} / {safeMax}</div>
                            {indicator['Rationale'] && (
                              <div style={{ marginBottom: 8, color: '#000' }}><strong>Why are we asking this?</strong> {indicator['Rationale']}</div>
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
                            {Array.isArray(INDICATOR_RESOURCES[key]) && INDICATOR_RESOURCES[key].length > 0 && (
                              <div style={{ marginTop: 8 }}>
                                <button
                                  type="button"
                                  onClick={() => setOpenResources(prev => ({ ...prev, [key]: !prev[key] }))}
                                  aria-expanded={!!openResources[key]}
                                  aria-controls={`res-${key}`}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    padding: 0,
                                    color: '#2563eb',
                                    textDecoration: 'underline',
                                    cursor: 'pointer',
                                    boxShadow: 'none'
                                  }}
                                >
                                  {openResources[key] ? 'Hide' : 'Show me how to improve'}
                                </button>
                                {openResources[key] && (
                                  <div id={`res-${key}`} style={{ marginTop: 6 }}>
                                    {INDICATOR_RESOURCES[key].map((res, idx) => (
                                      <div key={idx} style={{ marginBottom: 4 }}>
                                        <a href={res.url} target="_blank" rel="noreferrer">{res.title}</a>
                                      </div>
                                    ))}
                                  </div>
                                )}
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
      </div>

      <div className={`tab-content ${activeTab === 'proofs' ? 'active' : ''}`}>
        <div className="section" style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>Proof uploads and verification</h3>
          <ul className="list">
            {PROOF_INDICATORS.map(name => {
              const status = proofs[name] || { uploaded: false, verified: false, filename: '' };
              const indicator = indicators.find(ind => ind['Criterion/Metric Name'] === name);
              return (
                <li key={name} className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 280 }}>
                      <div style={{ fontWeight: 600 }}>{name}</div>
                      {indicator && <div className="helper">{indicator['Question']}</div>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className={`badge ${status.uploaded ? 'success' : 'secondary'}`}>{status.uploaded ? 'Uploaded' : 'Not uploaded'}</span>
                      <span className={`badge ${status.verified ? 'success' : 'secondary'}`}>{status.verified ? 'Verified' : 'Not verified'}</span>
                    </div>
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {!status.uploaded && (
                      <button type="button" onClick={() => handleMockUpload(name)}>Upload mock file</button>
                    )}
                    {status.uploaded && (
                      <>
                        <span className="helper">File: {status.filename}</span>
                        <button type="button" onClick={() => handleMockUpload(name)}>Replace file</button>
                        <button type="button" onClick={() => handleToggleVerify(name)}>{status.verified ? 'Unverify' : 'Mark as verified'}</button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className={`tab-content ${activeTab === 'resources' ? 'active' : ''}`}>
        <div className="section" style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>Improvement Resources by DRG</h3>
          {(() => {
            // Group indicators by DRG and filter those with resources
            const groups = {};
            indicators.forEach(ind => {
              const name = ind['Criterion/Metric Name'];
              if (Array.isArray(INDICATOR_RESOURCES[name]) && INDICATOR_RESOURCES[name].length > 0) {
                const drg = String(ind['DRG Short Code'] || '').trim();
                if (!groups[drg]) groups[drg] = [];
                groups[drg].push(ind);
              }
            });
            const sortedDrgs = Object.keys(groups).sort();
            if (sortedDrgs.length === 0) {
              return <div className="helper">No resources available.</div>;
            }
            return (
              <div className="grid" style={{ marginTop: 8 }}>
                {sortedDrgs.map(drg => (
                  <div key={drg} className="card" style={{ gridColumn: 'span 12' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <img 
                        src={`${process.env.PUBLIC_URL}/DRG${drg}.png`} 
                        alt={`DRG ${drg}`} 
                        style={{ width: 20, height: 20 }} 
                      />
                      <div style={{ fontWeight: 600 }}>DRG #{drg}</div>
                    </div>
                    <ul className="list">
                      {groups[drg]
                        .sort((a, b) => a['Criterion/Metric Name'].localeCompare(b['Criterion/Metric Name']))
                        .map(ind => {
                          const key = ind['Criterion/Metric Name'];
                          const links = INDICATOR_RESOURCES[key] || [];
                          return (
                            <li key={key} className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                              <div style={{ fontWeight: 600 }}>{key}</div>
                              <div className="helper" style={{ marginBottom: 6 }}>{ind['Question']}</div>
                              <div>
                                {links.map((res, idx) => (
                                  <div key={idx} style={{ marginBottom: 4 }}>
                                    <a href={res.url} target="_blank" rel="noreferrer">{res.title}</a>
                                  </div>
                                ))}
                              </div>
                            </li>
                          );
                        })}
                    </ul>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>
       
      <div className={`tab-content ${activeTab === 'badge' ? 'active' : ''}`}>
        <div className="section" style={{ marginTop: 16 }}>
          <BadgeGenerator 
            companyId={companyId} 
            companyName={company.name}
            companyScore={company.overallScore}
          />
        </div>
      </div>
    </div>
  );
}

export default CompanyProfile;
