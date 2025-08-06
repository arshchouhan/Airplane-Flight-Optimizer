import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Ensure the root element takes full viewport
const rootElement = document.getElementById('root');
rootElement.style.height = '100%';
rootElement.style.width = '100%';

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
