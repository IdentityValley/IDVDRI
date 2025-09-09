import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listCompanies } from '../services/firebaseClient';

function Leaderboard() {
  const [companies, setCompanies] = useState([]);

  const refresh = () => {
    listCompanies()
      .then(data => setCompanies(data))
      .catch(error => console.error('Error fetching companies:', error));
  };

  useEffect(() => { refresh(); }, []);

  const handleDelete = (id, companyName) => {
    if (window.confirm(`Are you sure you want to delete "${companyName}"? This action cannot be undone.`)) {
      fetch(`/api/companies/${id}`, { method: 'DELETE' })
        .then(() => refresh())
        .catch(err => console.error('Delete failed', err));
    }
  };

  return (
    <div className="leaderboard">
      <h2>Organisation Leaderboard</h2>
      <div className="helper" style={{ margin: '8px 0 16px' }}>
        Want to add an organisation? Use the submission form below. Entries update the shared leaderboard automatically.
      </div>
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
            {/* Controls removed for public static hosting */}
          </div>
          );
        })}
      </div>
    </div>
  );
}

export default Leaderboard;
