import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadCompanies, deleteCompany } from '../storage';
import { testSupabaseConnection, inspectTableSchema } from '../supabase';

function Leaderboard() {
  const [companies, setCompanies] = useState([]);

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

  useEffect(() => { 
    // Test connection first
    testSupabaseConnection().then(result => {
      console.log('Connection test result:', result);
      if (result.success) {
        // Inspect table schema
        inspectTableSchema().then(schemaResult => {
          console.log('Schema inspection result:', schemaResult);
          refresh();
        });
      } else {
        console.error('Supabase connection failed, cannot load companies');
      }
    });
  }, []);

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
