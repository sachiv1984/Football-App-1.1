import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './styles/globals.css'; // Add this line
import HomePage from './pages/HomePage';
import StatsPage from './pages/StatsPage

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Your existing home page route */}
          <Route path="/" element={<HomePage />} />
          
          {/* New dynamic stats page route */}
          <Route path="/stats/:matchId" element={<StatsPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;


 
