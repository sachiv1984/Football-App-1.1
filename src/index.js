import React from 'react';
import ReactDOM from 'react-dom/client'; // Use modern React 18 API
import './index.css'; // Tailwind CSS
import App from './App'; // No .js or .tsx extension needed

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
