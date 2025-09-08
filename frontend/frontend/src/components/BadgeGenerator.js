import React, { useState } from 'react';

function BadgeGenerator({ companyId }) {
  const [badgeCode, setBadgeCode] = useState('');

  const generateBadgeCode = () => {
    const base = process.env.REACT_APP_API_BASE_URL || '';
    const svgUrl = `${base}/api/badge/${companyId}`.replace(/\/$/, '');
    setBadgeCode(svgUrl);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(badgeCode);
    alert('Badge code copied to clipboard!');
  };

  return (
    <div className="badge-generator">
      <h3>Embeddable Badge</h3>
      <button onClick={generateBadgeCode}>Show Badge Preview</button>
      {badgeCode && (
        <div style={{ marginTop: 12 }}>
          <h4>Preview:</h4>
          <img src={badgeCode} alt="Company Digital Responsibility Score" />
        </div>
      )}
    </div>
  );
}

export default BadgeGenerator;
