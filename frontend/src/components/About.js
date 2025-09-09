import React from 'react';

function About() {
  return (
    <div className="about-page">
      <div className="controls" style={{ marginBottom: 16 }}>
        <button onClick={() => window.history.back()}>← Back</button>
      </div>
      
      <div className="company-header">
        <h1 style={{ margin: 0, fontSize: '32px' }}>About the Digital Responsibility Index</h1>
      </div>

      <div className="section">
        <h2>What is the Digital Responsibility Index?</h2>
        <p>
          The Digital Responsibility Index (DRI) is a comprehensive evaluation framework designed to assess 
          and rank organizations based on their digital responsibility practices. It measures how well 
          organizations implement responsible digital practices across seven key Digital Responsibility Groups (DRGs).
        </p>
        <p>
          In an increasingly digital world, organizations have a responsibility to use technology ethically, 
          transparently, and in ways that benefit society. The DRI provides a standardized way to evaluate 
          and compare organizations' commitment to digital responsibility.
        </p>
      </div>

      <div className="section">
        <h2>The Seven Digital Responsibility Goals</h2>
        <div style={{ textAlign: 'center', margin: '24px 0' }}>
          <img 
            src={process.env.PUBLIC_URL + '/DRGall.png'} 
            alt="Seven Digital Responsibility Goals" 
            style={{ maxWidth: '100%', height: 'auto', border: '3px solid #000', boxShadow: '6px 6px 0 #000' }}
          />
        </div>
      </div>

      <div className="section">
        <h2>How Scoring Works</h2>
        <p>
          Each organization is evaluated across 20 specific indicators, with each indicator scored on a scale 
          from 0 to 5 (or 0 to 3 for binary indicators). The scoring system is designed to be:
        </p>
        <ul>
          <li><strong>Objective:</strong> Based on clear, measurable criteria</li>
          <li><strong>Transparent:</strong> All scoring logic is publicly available</li>
          <li><strong>Comprehensive:</strong> Covers all aspects of digital responsibility</li>
          <li><strong>Actionable:</strong> Provides clear guidance for improvement</li>
        </ul>
        
        <h3>Score Calculation</h3>
        <p>
          <strong>Overall Score (0-10):</strong> The total of all indicator scores, normalized to a 0-10 scale 
          where 10 represents the highest possible digital responsibility score.
        </p>
        <p>
          <strong>Per-DRG Scores (0-10):</strong> Each DRG receives its own score based on the indicators 
          within that group, also normalized to 0-10. This allows organizations to see their strengths 
          and weaknesses across different areas of digital responsibility.
        </p>
      </div>

      <div className="section">
        <h2>How Ranking Works</h2>
        <p>
          Organizations are ranked on the leaderboard based on their overall digital responsibility score. 
          The ranking system:
        </p>
        <ul>
          <li><strong>Updates in real-time:</strong> Rankings change as new evaluations are added</li>
          <li><strong>Shows progress:</strong> Visual progress bars indicate each organization's score</li>
          <li><strong>Highlights top performers:</strong> Special recognition for the top 3 organizations</li>
          <li><strong>Enables comparison:</strong> Easy side-by-side comparison of digital responsibility practices</li>
        </ul>
      </div>

      <div className="section">
        <h2>Getting Started</h2>
        <p>
          To evaluate an organization's digital responsibility:
        </p>
        <ol>
          <li>Navigate to the "New Organisation Evaluation" page</li>
          <li>Enter the organization's name</li>
          <li>For each indicator, select the score that best represents the organization's current practices</li>
          <li>Review the calculated scores and submit the evaluation</li>
          <li>View the organization's detailed profile and ranking on the leaderboard</li>
        </ol>
        <p>
          Each evaluation includes detailed explanations for complex criteria, helping evaluators make 
          informed decisions about an organization's digital responsibility practices.
        </p>
      </div>

      <div className="section">
        <h2>About the Framework</h2>
        <p>
          The Digital Responsibility Index is built on established principles of digital ethics, 
          responsible AI, data protection, and corporate digital responsibility. It draws from 
          international standards and best practices to provide a comprehensive assessment framework 
          that organizations can use to improve their digital responsibility practices.
        </p>
        <p>
          The framework is designed to be practical, actionable, and aligned with emerging regulations 
          and societal expectations around responsible digital practices.
        </p>
      </div>
    </div>
  );
}

export default About;
