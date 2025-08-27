import React from 'react';
import ReactDOM from 'react-dom/client'; // <- use createRoot
import './index.css';
import App from './App'; // <- remove .ts/.tsx extension

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
