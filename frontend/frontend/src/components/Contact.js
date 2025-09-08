import React, { useMemo, useState, useEffect } from 'react';

function Contact() {
  const [showEgg, setShowEgg] = useState(false);
  const lines = useMemo(() => ([
    { type: 'prompt', text: 'contact' },
    { type: 'out', text: 'Contact Information:' },
    { type: 'out', text: 'Email: info@identityvalley.org' },
    { type: 'prompt', text: 'help' },
    { type: 'out', text: 'For inquiries about the Digital Responsibility Ranking system,' },
    { type: 'out', text: 'please contact us at the email address above.' }
  ]), []);

  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [completedLines, setCompletedLines] = useState([]);

  useEffect(() => {
    if (currentLineIndex >= lines.length) return;
    const fullText = lines[currentLineIndex].text;
    const isDone = currentCharIndex >= fullText.length;
    if (isDone) {
      const timeout = setTimeout(() => {
        setCompletedLines(prev => [...prev, fullText]);
        setCurrentLineIndex(i => i + 1);
        setCurrentCharIndex(0);
      }, 250);
      return () => clearTimeout(timeout);
    }
    const interval = setInterval(() => {
      setCurrentCharIndex(i => i + 1);
    }, 40);
    return () => clearInterval(interval);
  }, [currentCharIndex, currentLineIndex, lines]);

  const renderLine = (lineText, type, withCursor) => (
    <div className={type === 'prompt' ? 'term-line' : 'output-line'}>
      {type === 'prompt' && <span className="prompt">C:\\&gt; </span>}
      <span>{lineText}</span>
      {withCursor && <span className="cursor" />}
    </div>
  );

  const typedSoFar = lines[currentLineIndex] ? lines[currentLineIndex].text.slice(0, currentCharIndex) : '';

  return (
    <div className="contact-page">
      <div className="terminal-window">
        <div className="terminal-titlebar">
          <span className="brand-mark" />
          <span className="term-title">C:\\> Contact Terminal</span>
          <div className="term-controls">
            <button className="btn" title="Minimize" aria-label="Minimize">_</button>
            <button className="btn" title="Maximize" aria-label="Maximize">□</button>
            <button className="btn" title="Close" aria-label="Close" onClick={() => setShowEgg(true)}>×</button>
          </div>
        </div>
        <div className="terminal-body">
          {completedLines.map((text, i) => renderLine(text, lines[i].type, false))}
          {currentLineIndex < lines.length && renderLine(typedSoFar, lines[currentLineIndex].type, true)}

          {/* Static clickable email (appears after typing but always functional) */}
          <a className="invisible-mail" href="mailto:info@identityvalley.org">info@identityvalley.org</a>
        </div>
      </div>
      {showEgg && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-dialog">
            <h2>404: Easter Egg Found</h2>
            <p>Congratulations! You've discovered a hidden feature that's actually visible in the source code.</p>
            <p>Did you know? The close button in a terminal window is like a Schrödinger's cat - you never know if it will close the window or reveal an easter egg until you click it.</p>
            <div className="controls">
              <button onClick={() => setShowEgg(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Contact;


