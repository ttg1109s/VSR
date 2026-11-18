import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { ToastProvider, useToast } from '../../src/design-system/index.js';
import '../../src/design-system/index.css';

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
