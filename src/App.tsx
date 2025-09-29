import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './styles/globals.css';
import HomePage from './pages/HomePage';
import StatsPage from './pages/StatsPage';
import APIdebug from './components/APIdebug';

function App() {
  // Check if we're in development mode
  const isDevelopment = import.meta.env.DEV;

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Your existing home page route */}
          <Route path="/" element={<HomePage />} />
          
          {/* Dynamic stats page route */}
          <Route path="/stats/:matchId" element={<StatsPage />} />
          
          {/* Debug route - only available in development */}
            <Route path="/debug/api" element={<APIdebug />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
