import React, { useState, useEffect } from 'react';

function Contact() {
  const [displayedText, setDisplayedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);

  const fullText = `C:\\> contact
Contact Information:
Email: info@identityvalley.org
C:\\> help
For inquiries about the Digital Responsibility Ranking
system, please contact us at the email address above.`;

  useEffect(() => {
    if (!isTyping || currentIndex >= fullText.length) {
      setIsTyping(false);
      return;
    }

    const timer = setTimeout(() => {
      setDisplayedText(prev => prev + fullText[currentIndex]);
      setCurrentIndex(prev => prev + 1);
    }, 50);

    return () => clearTimeout(timer);
  }, [currentIndex, isTyping, fullText]);

  useEffect(() => {
    // Cursor blinking effect
    const cursorTimer = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);

    return () => clearInterval(cursorTimer);
  }, []);

  return (
    <div className="contact-page">
      <div className="terminal-window">
        <div className="terminal-header">
          <div className="terminal-controls">
            <div className="control-btn minimize"></div>
            <div className="control-btn maximize"></div>
            <div className="control-btn close"></div>
          </div>
          <div className="terminal-title">C:\> Contact Terminal</div>
        </div>
        <div className="terminal-body">
          <pre className="terminal-content">
            {displayedText}
            {showCursor && <span className="cursor">█</span>}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default Contact;
