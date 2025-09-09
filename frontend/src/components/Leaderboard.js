import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadCompanies, deleteCompany } from '../storage';

function Leaderboard() {
  const [companies, setCompanies] = useState([]);

  const refresh = () => {
    const companies = loadCompanies();
    const sorted = [...companies].sort((a, b) => (b.overallScore || 0) - (a.overallScore || 0));
    setCompanies(sorted);
  };

  useEffect(() => { refresh(); }, []);

  const handleDelete = (id, companyName) => {
    if (window.confirm(`Are you sure you want to delete "${companyName}"? This action cannot be undone.`)) {
      deleteCompany(id);
      refresh();
    }
  };

  return (
    <div className="leaderboard">
      <h2>Organisation Leaderboard</h2>
      <div className="vertical-leaderboard">
        {companies.map((company, index) => {
          const getRankDisplay = (rank) => `#${rank}`;
          return (
          <div className={`leaderboard-item ${index < 3 ? 'top' : ''}`} key={company.id}>
            <div className="rank-badge">{getRankDisplay(index + 1)}</div>
            <div className="company-info">
              <h3 style={{ margin: 0 }}>
                <Link to={`/company/${company.id}`}>{company.name}</Link>
              </h3>
              <div className="score-display">
                <span className="score-value">{company.overallScore?.toFixed ? company.overallScore.toFixed(2) : company.overallScore}</span>
                <span className="score-max">/10</span>
              </div>
            </div>
            <div className="progress-container">
              <div className="progress-wrap">
                <div className="progress" style={{ width: `${Math.min(100, (company.overallScore || 0) * 10)}%` }} />
              </div>
            </div>
            <div className="controls">
              <button onClick={() => handleDelete(company.id, company.name)}>Delete</button>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}

export default Leaderboard;
