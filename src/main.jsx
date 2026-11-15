import React from 'react';
import { createRoot } from 'react-dom/client';

function RuntimeBootstrap() {
  return null;
}

createRoot(document.getElementById('app')).render(
  <React.StrictMode>
    <RuntimeBootstrap />
  </React.StrictMode>
);
