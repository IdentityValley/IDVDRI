import React, { useEffect, useState } from 'react';
import { INDICATORS_FALLBACK } from '../indicators';
import { INDICATOR_RESOURCES } from '../indicatorResources';

function Resources() {
  const [indicators, setIndicators] = useState([]);

  useEffect(() => {
    setIndicators(INDICATORS_FALLBACK);
  }, []);

  return (
    <div className="resources-page">
      <h2 style={{ marginTop: 0 }}>Resources</h2>
      <div className="section" style={{ marginTop: 12 }}>
        {(() => {
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
  );
}

export default Resources;


