import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadCompanies, deleteCompany, migrateToSupabase } from '../storage';

function Leaderboard() {
  const [companies, setCompanies] = useState([]);
  const [migrationStatus, setMigrationStatus] = useState('');

  const refresh = async () => {
    try {
      console.log('Loading companies...');
      const companies = await loadCompanies();
      console.log('Loaded companies:', companies);
      setCompanies(companies);
    } catch (error) {
      console.error('Error loading companies:', error);
      setCompanies([]);
    }
  };

  useEffect(() => { refresh(); }, []);

  const handleDelete = async (id, companyName) => {
    if (window.confirm(`Are you sure you want to delete "${companyName}"? This action cannot be undone.`)) {
      try {
        await deleteCompany(id);
        await refresh();
      } catch (error) {
        console.error('Error deleting company:', error);
      }
    }
  };

  const handleMigration = async () => {
    setMigrationStatus('Migrating...');
    try {
      const result = await migrateToSupabase();
      setMigrationStatus(result.message);
      if (result.success) {
        await refresh();
      }
    } catch (error) {
      setMigrationStatus('Migration failed: ' + error.message);
    }
  };

  return (
    <div className="leaderboard">
      <h2>Organisation Leaderboard</h2>
      
      {/* Migration button and status */}
      <div style={{ marginBottom: '16px', padding: '8px', background: '#f0f0f0', border: '1px solid #ccc' }}>
        <button onClick={handleMigration} style={{ marginRight: '8px' }}>
          Migrate to Supabase
        </button>
        {migrationStatus && <span style={{ color: migrationStatus.includes('Successfully') ? 'green' : 'red' }}>{migrationStatus}</span>}
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
