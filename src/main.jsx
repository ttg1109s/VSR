import React from 'react';
import { createRoot } from 'react-dom/client';
import { JsonClient } from '../client/adapters/JsonClient.js';
import { WorkerJsonTransport } from '../client/adapters/WorkerJsonTransport.js';

export { JsonClient, WorkerJsonTransport };

function RuntimeBootstrap() {
  return null;
}

createRoot(document.getElementById('app')).render(
  <React.StrictMode>
    <RuntimeBootstrap />
  </React.StrictMode>
);
