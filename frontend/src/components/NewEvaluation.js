import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { INDICATORS_FALLBACK } from '../indicators';
import { addCompany } from '../storage';
import { computeScores } from '../scoring';
 

function parseScoring(scoringLogic) {
  if (!scoringLogic) return [];
  return scoringLogic.split(';')
    .map(s => s.trim())
    .filter(Boolean)
    .map(item => {
      const [valuePart, ...labelParts] = item.split('=');
      const value = valuePart.trim();
      const label = labelParts.join('=').trim();
      const numeric = Number(value.replace(/[^0-9.-]/g, ''));
      return { value: Number.isNaN(numeric) ? value : numeric, label: label || value };
    });
}

function parseLegend(legend) {
  if (!legend) return [];
  return String(legend)
    .split(';')
    .map(s => s.trim())
    .filter(Boolean)
    .map(item => {
      const enDash = item.split('–');
      if (enDash.length > 1) {
        return { title: enDash[0].trim(), desc: enDash.slice(1).join('–').trim() };
      }
      const hy = item.split(' - ');
      if (hy.length > 1) {
        return { title: hy[0].trim(), desc: hy.slice(1).join(' - ').trim() };
      }
      return { title: item.trim(), desc: '' };
    });
}

const DRG_LABELS = {
  '1': 'DRG #1: Digital Literacy',
  '2': 'DRG #2: Cybersecurity',
  '3': 'DRG #3: Privacy',
  '4': 'DRG #4: Data Fairness',
  '5': 'DRG #5: Trustworthy Algorithms',
  '6': 'DRG #6: Transparency',
  '7': 'DRG #7: Human Agency & Identity',
};

function NewEvaluation() {
  const [companyName, setCompanyName] = useState('');
  const [scores, setScores] = useState({});
  const [indicators, setIndicators] = useState([]);
  const [openWhy, setOpenWhy] = useState({});
  const PROOF_INDICATORS = [
    'Digital Literacy Policy & Governance',
    'Incident response plan',
    'Security Certification/Compliance',
    'Participation in Data Altruism',
    'Algorithmic Impact Assessments Conducted',
    'Clear Privacy Policy & Data Use Disclosure',
    'Public Digital Ethics Principles Published'
  ];
  const [proofsDraft, setProofsDraft] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    setIndicators(INDICATORS_FALLBACK);
  }, []);

  const optionsByIndicator = useMemo(() => {
    const map = {};
    for (const ind of indicators) {
      map[ind['Criterion/Metric Name']] = parseScoring(ind['Scoring Logic']);
    }
    return map;
  }, [indicators]);

  const indicatorsByDrg = useMemo(() => {
    const groups = {};
    for (const ind of indicators) {
      const drg = String(ind['DRG Short Code'] || '').trim();
      if (!groups[drg]) groups[drg] = [];
      groups[drg].push(ind);
    }
    // sort indicators by name for stable UI
    Object.values(groups).forEach(list => list.sort((a,b)=>a['Criterion/Metric Name'].localeCompare(b['Criterion/Metric Name'])));
    return groups;
  }, [indicators]);

  const [openSections, setOpenSections] = useState({});
  useEffect(() => {
    // open all sections by default when indicators load
    const next = {};
    Object.keys(indicatorsByDrg).forEach(k => { next[k] = true; });
    setOpenSections(next);
  }, [indicatorsByDrg]);

  const handleScoreChange = (indicatorName, value) => {
    const numericValue = Number(value);
    setScores(prev => ({ ...prev, [indicatorName]: Number.isNaN(numericValue) ? 0 : numericValue }));
  };

  const calculateOverallScore = () => {
    const company = { scores: scores };
    const computed = computeScores(company, indicators);
    return computed.overallScore;
  };

  const sectionStatus = (list) => {
    const filled = list.reduce((acc, ind) => acc + (scores[ind['Criterion/Metric Name']] !== undefined ? 1 : 0), 0);
    const total = list.length;
    const avg = total ? (list.reduce((s, ind) => s + (Number(scores[ind['Criterion/Metric Name']]) || 0), 0) / total).toFixed(2) : '0.00';
    return { filled, total, avg };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const newCompany = {
      id: Date.now(),
      name: companyName,
      scores: scores,
    };
    try {
      // Persist mock proofs for this company id
      const persisted = {};
      PROOF_INDICATORS.forEach(name => {
        const entry = proofsDraft[name];
        persisted[name] = entry ? { uploaded: true, verified: false, filename: entry.filename || 'uploaded_document.pdf' } : { uploaded: false, verified: false, filename: '' };
      });
      try { localStorage.setItem(`proofs:${newCompany.id}`, JSON.stringify(persisted)); } catch (e) {}
      await addCompany(newCompany);
      navigate('/');
    } catch (error) {
      console.error('Error adding company:', error);
      // Still navigate even if there's an error
      navigate('/');
    }
  };

  return (
    <div className="new-evaluation">
      <h2 style={{ marginTop: 0 }}>New Organisation Evaluation</h2>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label className="label" htmlFor="companyName">Organisation Name</label>
          <input
            className="input"
            type="text"
            id="companyName"
            placeholder="e.g., Acme Corp"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            required
          />
        </div>

        {/* DRG Sections */}
        {Object.keys(indicatorsByDrg).sort().map(drg => {
          const items = indicatorsByDrg[drg];
          const status = sectionStatus(items);
          const open = !!openSections[drg];
          return (
            <div className="section" key={drg} style={{ marginTop: 16 }}>
              <div
                className="section-header"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                onClick={() => setOpenSections(prev => ({ ...prev, [drg]: !open }))}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="badge">{DRG_LABELS[drg] || `DRG #${drg}`}</div>
                  <div className="helper">{status.filled}/{status.total} completed · avg {status.avg}</div>
                </div>
                <div className="helper">{open ? 'Hide' : 'Show'}</div>
              </div>

              {open && (
                <div className="grid" style={{ marginTop: 12 }}>
                  {items.map(indicator => {
                    const name = indicator['Criterion/Metric Name'];
                    const options = optionsByIndicator[name] || [];
                    const legend = indicator['Legend'];
                    return (
                      <div className="card" key={name} style={{ gridColumn: 'span 12' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                          <div style={{ flex: 2, minWidth: 260 }}>
                            <div style={{ fontWeight: 600 }}>{name}</div>
                            <div className="helper evaluation-question">{indicator['Question']}</div>
                            {indicator['Rationale'] && (
                              <div
                                style={{ margin: '8px 0', position: 'relative', display: 'inline-block' }}
                                onMouseEnter={() => setOpenWhy(prev => ({ ...prev, [name]: true }))}
                                onMouseLeave={() => setOpenWhy(prev => ({ ...prev, [name]: false }))}
                              >
                                <button
                                  type="button"
                                  onClick={() => setOpenWhy(prev => ({ ...prev, [name]: !prev[name] }))}
                                  aria-expanded={!!openWhy[name]}
                                  style={{
                                    background: '#fff',
                                    border: '2px solid #000',
                                    padding: '10px 12px',
                                    boxShadow: '3px 3px 0 #000',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                >
                                  Why are we asking this?
                                </button>
                                {openWhy[name] && (
                                  <div
                                    role="tooltip"
                                    style={{
                                      position: 'absolute',
                                      top: 'calc(100% + 8px)',
                                      right: 0,
                                      zIndex: 20,
                                      background: '#fff',
                                      border: '2px solid #000',
                                      boxShadow: '6px 6px 0 #000',
                                      padding: 12,
                                      maxWidth: 420,
                                      minWidth: 260
                                    }}
                                  >
                                    <div style={{ color: '#000' }}>
                                      <strong>Why are we asking this?</strong> {indicator['Rationale']}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 220 }}>
                            <label className="label" htmlFor={`sel-${name}`}>Select level</label>
                            <select
                              id={`sel-${name}`}
                              className="input"
                              value={scores[name] ?? ''}
                              onChange={(e) => handleScoreChange(name, e.target.value)}
                              required
                            >
                              <option value="" disabled>Choose…</option>
                              {options.map(opt => (
                                <option key={String(opt.value)} value={opt.value}>{opt.value} – {opt.label}</option>
                              ))}
                            </select>
                            {PROOF_INDICATORS.includes(name) && (
                              <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                {proofsDraft[name]?.uploaded ? (
                                  <>
                                    <span className="badge success" style={{ padding: '4px 8px', fontSize: 12 }}>Uploaded</span>
                                    <button
                                      type="button"
                                      onClick={() => setProofsDraft(prev => ({ ...prev, [name]: { uploaded: true, filename: 'uploaded_document_v2.pdf' } }))}
                                      title="Replace file (mock)"
                                      style={{ padding: '6px 10px', fontSize: 12 }}
                                    >
                                      Replace file
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={!companyName}
                                    onClick={() => setProofsDraft(prev => ({ ...prev, [name]: { uploaded: true, filename: 'uploaded_document.pdf' } }))}
                                    title={companyName ? 'Upload a proof document (mock)' : 'Enter organisation name first'}
                                    style={{ padding: '6px 10px', fontSize: 12 }}
                                  >
                                    Upload proof
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Tooltip replaces inline explanation */}
                        {legend && (
                          <div style={{ marginTop: 8 }}>
                            {parseLegend(legend).map((it, idx) => (
                              <div key={idx} style={{ marginBottom: 4 }}>
                                <strong>{it.title}</strong>{it.desc ? ` – ${it.desc}` : ''}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Sticky summary bar */}
        <div className="section sticky" style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div className="helper">Overall score (live): {calculateOverallScore()}</div>
            <button type="submit">Submit Evaluation</button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default NewEvaluation;
