import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { ToastProvider, useToast } from '../../src/design-system/index.js';
import '../../src/design-system/index.css';

const activeToastTimers = new Set();
const nativeSetTimeout = window.setTimeout.bind(window);
const nativeClearTimeout = window.clearTimeout.bind(window);
window.setTimeout = (callback, delay, ...args) => {
  let timer;
  timer = nativeSetTimeout(() => {
    activeToastTimers.delete(timer);
    callback(...args);
  }, delay);
  if (delay === 1000) activeToastTimers.add(timer);
  return timer;
};
window.clearTimeout = timer => {
  activeToastTimers.delete(timer);
  return nativeClearTimeout(timer);
};
window.__activeToastTimers = activeToastTimers;

function Controls() {
  const toast = useToast();
  useEffect(() => {
    window.__showToast = (message, options) => toast(message, options);
    window.__dismissToast = id => toast.dismiss(id);
    return () => {
      delete window.__showToast;
      delete window.__dismissToast;
    };
  }, [toast]);
  return null;
}

const root = createRoot(document.getElementById('root'));
root.render(<ToastProvider duration={120}><Controls /></ToastProvider>);
window.__unmountToastRoot = () => root.unmount();
