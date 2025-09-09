import React from 'react';
import { HashRouter as Router, Route, Routes, Link } from 'react-router-dom';
import './App.css';
import Leaderboard from './components/Leaderboard';
import CompanyProfile from './components/CompanyProfile';
import NewEvaluation from './components/NewEvaluation';
import About from './components/About';

function App() {
  return (
    <Router>
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
              </Routes>
            </section>
          </div>
        </main>
        <footer className="footer">© {new Date().getFullYear()} DRI</footer>
      </div>
    </Router>
  );
}

export default App;
