import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link, useLocation } from 'react-router-dom';
import './App.css';
import Leaderboard from './components/Leaderboard';
import CompanyProfile from './components/CompanyProfile';
import NewEvaluation from './components/NewEvaluation';
import About from './components/About';
import Contact from './components/Contact';

function AppContent() {
  const location = useLocation();
  const isContact = location.pathname === '/contact';
  return (
    <div className="App">
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
          {isContact ? (
            <Routes>
              <Route path="/contact" element={<Contact />} />
              <Route path="*" element={<Leaderboard />} />
            </Routes>
          ) : (
            <section className="section">
              <Routes>
                <Route path="/" element={<Leaderboard />} />
                <Route path="/company/:companyId" element={<CompanyProfile />} />
                <Route path="/new-evaluation" element={<NewEvaluation />} />
                <Route path="/about" element={<About />} />
              </Routes>
            </section>
          )}
        </div>
      </main>
      <footer className="footer">© {new Date().getFullYear()} DRI · A project by <a href="https://identityvalley.eu" target="_blank" rel="noreferrer">Identity Valley</a></footer>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
