import React from 'react';
import { HashRouter as Router, Route, Routes, Link } from 'react-router-dom';
import './App.css';
import Leaderboard from './components/Leaderboard';
import CompanyProfile from './components/CompanyProfile';
import NewEvaluation from './components/NewEvaluation';
import About from './components/About';
import Contact from './components/Contact';

function App() {
  return (
    <Router>
      <div className="App">
        {/* Version: 1.1.0 - Force cache refresh */}
        <header className="App-header">
          <div className="container navbar">
            <div className="brand">
              <div className="brand-mark" />
              <h1>Digital Responsibility Index</h1>
            </div>
            <nav>
              <ul>
                <li><Link to="/">Leaderboard</Link></li>
                <li><Link to="/new-evaluation">New Evaluation</Link></li>
                <li><Link to="/about">About</Link></li>
                <li><Link to="/contact">Contact</Link></li>
              </ul>
            </nav>
          </div>
        </header>
        <main>
          <div className="container">
            <section className="section">
              <Routes>
                <Route path="/" element={<Leaderboard />} />
                <Route path="/company/:companyId" element={<CompanyProfile />} />
                <Route path="/new-evaluation" element={<NewEvaluation />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
              </Routes>
            </section>
          </div>
        </main>
        <footer className="footer">
          © {new Date().getFullYear()} DRI | 
          <a href="https://identityvalley.eu" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>
            A project by Identity Valley
          </a>
        </footer>
      </div>
    </Router>
  );
}

export default App;
