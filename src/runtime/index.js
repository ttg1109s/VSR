import React from 'react';
import { createRoot } from 'react-dom/client';
import { JsonClient } from '../../client/adapters/JsonClient.js';
import { WorkerJsonTransport } from '../../client/adapters/WorkerJsonTransport.js';

/**
 * Mount a consumer-provided React host without bundling a product UI.
 * The host receives only JSON protocol messages and a small command facade.
 */
export function mountVSRHost({ container, scenario, Host = null, onError = console.error }) {
  if (!container || typeof container !== 'object') {
    throw new TypeError('A DOM container is required to mount the React host.');
  }
  if (!scenario || typeof scenario !== 'object') {
    throw new TypeError('A VSR scenario object is required.');
  }

  const transport = new WorkerJsonTransport();
  const client = new JsonClient(transport);
  const root = createRoot(container);
  let disposed = false;
  let unsubscribe = () => {};

  const runtime = Object.freeze({
    client,
    getSnapshot: () => client.getSnapshot(),
    dispatch: (name, payload = {}) => client.dispatch(name, payload),
    triggerAction: (actionId, uniqueId) => client.triggerAction(actionId, uniqueId),
    nextChat: () => client.nextChat(),
    selectChatChoice: index => client.selectChatChoice(index),
    submitPassword: (challengeId, input, cancel = false) => client.submitPassword(challengeId, input, cancel),
    pause: () => client.pause(),
    resume: () => client.resume(),
    exportSave: () => client.exportSave(),
    restoreSave: save => client.restoreSave(save)
  });

  const RuntimeHost = Host || (() => null);

  const ready = client.initialize(scenario).then(() => {
    if (disposed) return null;
    unsubscribe = client.subscribe(message => {
      if (message.type === 'transport.error') onError(message.error || new Error('VSR transport failed.'));
      if (message.type === 'event') {
        // Protocol events remain available to the host through the JsonClient subscription.
      }
    });
    root.render(React.createElement(RuntimeHost, { runtime, snapshot: client.getSnapshot() }));
    return client.getSnapshot();
  }).catch(error => {
    onError(error);
    throw error;
  });

  return Object.freeze({
    ready,
    client,
    dispose() {
      if (disposed) return;
      disposed = true;
      unsubscribe();
      root.unmount();
      client.dispose();
      transport.close();
    }
  });
}

export { JsonClient, WorkerJsonTransport };
