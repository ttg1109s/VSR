import './design-system/index.css';
import './App.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

createRoot(document.body).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
