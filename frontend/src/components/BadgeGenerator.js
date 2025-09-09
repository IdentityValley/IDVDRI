import React, { useState } from 'react';

function BadgeGenerator({ companyId }) {
  const [badgeCode, setBadgeCode] = useState('');

  const generateBadgeCode = () => {
    const svgUrl = `http://localhost:5000/api/badge/${companyId}`;
    const code = `<img src="${svgUrl}" alt="Company Digital Responsibility Score" />`;
    setBadgeCode(code);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(badgeCode);
    alert('Badge code copied to clipboard!');
  };

  return (
    <div className="badge-generator">
      <h3>Embeddable Badge</h3>
      <button onClick={generateBadgeCode}>Generate Badge Code</button>
      {badgeCode && (
        <div>
          <pre><code>{badgeCode}</code></pre>
          <button onClick={copyToClipboard}>Copy to Clipboard</button>
          <h4>Preview:</h4>
          <div dangerouslySetInnerHTML={{ __html: badgeCode }} />
        </div>
      )}
    </div>
  );
}

export default BadgeGenerator;
