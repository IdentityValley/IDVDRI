import React, { useState, useEffect } from 'react';

function Contact() {
  const [displayedText, setDisplayedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const [currentLine, setCurrentLine] = useState(0);
  const [isTyping, setIsTyping] = useState(true);

  const terminalContent = [
    { command: 'contact', output: 'Contact Information:' },
    { command: '', output: 'Email: info@identityvalley.org' },
    { command: 'help', output: 'For inquiries about the Digital Responsibility Ranking' },
    { command: '', output: 'system, please contact us at the email address above.' }
  ];

  useEffect(() => {
    if (!isTyping) return;

    const typeText = () => {
      if (currentLine < terminalContent.length) {
        const currentItem = terminalContent[currentLine];
        const fullText = currentItem.command ? `C:\\> ${currentItem.command}` : currentItem.output;
        
        if (displayedText.length < fullText.length) {
          setDisplayedText(prev => prev + fullText[displayedText.length]);
        } else {
          // Move to next line after a delay
          setTimeout(() => {
            setCurrentLine(prev => prev + 1);
            setDisplayedText(prev => prev + '\n');
          }, 500);
        }
      } else {
        // All content typed, stop typing
        setIsTyping(false);
      }
    };

    const timer = setTimeout(typeText, 50);
    return () => clearTimeout(timer);
  }, [displayedText, currentLine, isTyping, terminalContent]);

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
