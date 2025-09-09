import React, { useState, useEffect } from 'react';

function BadgeGenerator({ companyId, companyName, companyScore }) {
  const [badgeCode, setBadgeCode] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const generateBadgeCode = () => {
    const svgUrl = `http://localhost:5000/api/badge/${companyId}`;
    const code = `<img src="${svgUrl}" alt="Company Digital Responsibility Score" />`;
    setBadgeCode(code);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(badgeCode);
    alert('Badge code copied to clipboard!');
  };

  const showBadgePreview = () => {
    setShowPreview(true);
  };

  const hideBadgePreview = () => {
    setShowPreview(false);
  };

  // BadgePreview component
  const BadgePreview = () => {
    const score = companyScore || 0;
    const scorePercentage = Math.min((score / 10) * 100, 100);
    
    return (
      <div className="badge-preview-inline">
        <div className="badge-preview">
          <div className="badge-header">
            <div className="badge-logo">
              <div className="badge-icon">DRI</div>
            </div>
            <div className="badge-title">Digital Responsibility</div>
          </div>
          <div className="badge-score-section">
            <div className="badge-company">{companyName || 'Company Name'}</div>
            <div className="badge-score-display">
              <span className="badge-score-value">{score.toFixed(1)}</span>
              <span className="badge-score-max">/10</span>
            </div>
          </div>
          <div className="badge-progress">
            <div 
              className="badge-progress-fill" 
              style={{ width: `${scorePercentage}%` }}
            ></div>
          </div>
          <div className="badge-footer">
            <span className="badge-certified">Certified</span>
          </div>
        </div>
        <div className="badge-preview-actions">
          <button onClick={generateBadgeCode} className="generate-btn">
            Generate Embed Code
          </button>
          <button onClick={hideBadgePreview} className="cancel-btn">
            Hide Preview
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="badge-generator">
      <h3>Embeddable Badge</h3>
      <button onClick={showBadgePreview} className="preview-btn">
        Preview Badge
      </button>
      
      {showPreview && <BadgePreview />}
      
      {badgeCode && (
        <div className="badge-code-section">
          <h4>Embed Code:</h4>
          <pre><code>{badgeCode}</code></pre>
          <button onClick={copyToClipboard}>Copy to Clipboard</button>
          <h4>Live Preview:</h4>
          <div className="badge-live-preview" dangerouslySetInnerHTML={{ __html: badgeCode }} />
        </div>
      )}
    </div>
  );
}

export default BadgeGenerator;
