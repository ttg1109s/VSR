import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import './runtime-debug-console.css';

const MAX_ENTRIES = 250;

function describeValue(value) {
  if (value instanceof Error) return [value.name + ': ' + value.message, value.stack].filter(Boolean).join('\n');
  if (typeof value === 'string') return value;
  if (typeof value === 'undefined') return 'undefined';
  try {
    const seen = new WeakSet();
    return JSON.stringify(value, (_key, item) => {
      if (typeof item === 'object' && item !== null) {
        if (seen.has(item)) return '[Circular]';
        seen.add(item);
      }
      if (typeof item === 'function') return '[Function ' + (item.name || 'anonymous') + ']';
      return item;
    }, 2) ?? String(value);
  } catch {
    try { return String(value); } catch { return '[Unserializable value]'; }
  }
}
function formatArguments(args) { return Array.from(args, describeValue).join(' '); }

export default function RuntimeDebugConsole() {
  const [portalRoot, setPortalRoot] = useState(null);
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState([]);
  const [filter, setFilter] = useState('all');
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const root = document.createElement('div');
    root.setAttribute('data-vsr-runtime-debug-root', '');
    document.body.appendChild(root);
    setPortalRoot(root);
    return () => root.remove();
  }, []);

  const addEntry = useCallback((level, message, details = '') => {
    const entry = { id: Date.now().toString(36) + Math.random().toString(36).slice(2), level, message: String(message || 'Unknown error'), details: String(details || ''), time: new Date().toLocaleTimeString() };
    setEntries(current => [...current, entry].slice(-MAX_ENTRIES));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const originalError = console.error;
    const originalWarn = console.warn;
    const patchedError = (...args) => { addEntry('error', formatArguments(args)); originalError.apply(console, args); };
    const patchedWarn = (...args) => { addEntry('warning', formatArguments(args)); originalWarn.apply(console, args); };
    const handleError = event => {
      const target = event.target && event.target !== window ? event.target : null;
      const tagName = target?.tagName?.toLowerCase() || '';
      const resourceUrl = target?.currentSrc || target?.src || target?.href || '';
      const isResourceError = Boolean(target && (resourceUrl || tagName));
      const runtimeError = event.error;
      const message = event.message || runtimeError?.message || (
        isResourceError
          ? 'Resource failed to load' + (tagName ? ': <' + tagName + '>' : '')
          : 'Uncaught runtime error (browser did not expose the error message)'
      );
      const location = event.filename
        ? event.filename + (event.lineno ? ':' + event.lineno : '') + (event.colno ? ':' + event.colno : '')
        : '';
      const targetDetails = target ? [
        'Target: ' + (tagName || 'unknown element'),
        resourceUrl ? 'Resource URL: ' + resourceUrl : '',
        target.id ? 'Element ID: ' + target.id : '',
        typeof target.className === 'string' && target.className ? 'Class: ' + target.className : '',
        target.outerHTML ? 'Element: ' + target.outerHTML.slice(0, 1000) : ''
      ].filter(Boolean).join('\n') : '';
      const errorDetails = runtimeError
        ? describeValue(runtimeError)
        : '';
      const metadata = [
        location ? 'Source: ' + location : '',
        'Event type: ' + (event.type || 'error'),
        event.message && runtimeError?.message && event.message !== runtimeError.message
          ? 'Browser message: ' + event.message
          : '',
        targetDetails,
        errorDetails
      ].filter(Boolean).join('\n');
      addEntry('error', message, metadata);
    };
    const handleAppDebugMessage = event => {
      const detail = event.detail || {};
      addEntry(detail.level === 'warning' ? 'warning' : 'error', detail.message || 'Application runtime error', detail.details || '');
    };
    const handleRejection = event => {
      const reason = event.reason;
      addEntry('error', 'Unhandled Promise rejection: ' + describeValue(reason), reason?.stack || '');
    };
    console.error = patchedError;
    console.warn = patchedWarn;
    window.addEventListener('error', handleError, true);
    window.addEventListener('unhandledrejection', handleRejection);
    window.addEventListener('vsr:debug-message', handleAppDebugMessage);
    return () => {
      if (console.error === patchedError) console.error = originalError;
      if (console.warn === patchedWarn) console.warn = originalWarn;
      window.removeEventListener('error', handleError, true);
      window.removeEventListener('unhandledrejection', handleRejection);
      window.removeEventListener('vsr:debug-message', handleAppDebugMessage);
    };
  }, [addEntry]);

  const visibleEntries = useMemo(() => filter === 'all' ? entries : entries.filter(entry => entry.level === filter), [entries, filter]);
  const errorCount = entries.filter(entry => entry.level === 'error').length;
  const warningCount = entries.filter(entry => entry.level === 'warning').length;

  const copyLogs = async () => {
    const content = entries.map(entry => '[' + entry.time + '] ' + entry.level.toUpperCase() + ': ' + entry.message + (entry.details ? '\n' + entry.details : '')).join('\n\n');
    try {
      await navigator.clipboard.writeText(content || 'No debug messages captured.');
      addEntry('info', 'Debug log copied to clipboard.');
    } catch {
      addEntry('warning', 'Could not access clipboard. Select and copy the log text manually.');
    }
  };

  if (!portalRoot) return null;

  return createPortal(
    <div className="vsr-runtime-debug" aria-live="polite">
      {open && (
        <section className="vsr-runtime-debug__panel" role="dialog" aria-label="Runtime debug console" aria-modal="false">
          <header className="vsr-runtime-debug__header">
            <div className="vsr-runtime-debug__heading"><strong>Runtime Debug Console</strong><span>{entries.length} captured · {errorCount} errors · {warningCount} warnings</span></div>
            <div className="vsr-runtime-debug__header-actions">
              <button type="button" onClick={copyLogs} title="Copy all logs">Copy</button>
              <button type="button" onClick={() => setEntries([])} title="Clear captured logs">Clear</button>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close debug console">×</button>
            </div>
          </header>
          <nav className="vsr-runtime-debug__filters" aria-label="Filter debug messages">
            {[
              ['all', 'All', entries.length],
              ['error', 'Errors', errorCount],
              ['warning', 'Warnings', warningCount]
            ].map(([value, label, count]) => (
              <button type="button" key={value} className={filter === value ? 'is-active' : ''} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label} <span>{count}</span></button>
            ))}
          </nav>
          <div className="vsr-runtime-debug__entries">
            {!visibleEntries.length ? (
              <div className="vsr-runtime-debug__empty">{entries.length ? 'No messages in this filter.' : 'No runtime errors captured yet. Keep this panel open and reproduce the issue.'}</div>
            ) : visibleEntries.map(entry => (
              <article className={'vsr-runtime-debug__entry is-' + entry.level} key={entry.id}>
                <div className="vsr-runtime-debug__entry-meta"><span className="vsr-runtime-debug__level">{entry.level}</span><time>{entry.time}</time></div>
                <pre>{entry.message}</pre>
                {entry.details && <details><summary>Stack / source details</summary><pre>{entry.details}</pre></details>}
              </article>
            ))}
          </div>
          <footer className="vsr-runtime-debug__footer"><span>Captures window errors, unhandled rejections, console.error and console.warn.</span><span>Maximum {MAX_ENTRIES} entries</span></footer>
        </section>
      )}
      <button type="button" className="vsr-runtime-debug__launcher" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-label={open ? 'Close runtime debug console' : 'Open runtime debug console'}>
        <span aria-hidden="true">⌘</span>DEBUG{errorCount > 0 && <b>{errorCount > 99 ? '99+' : errorCount}</b>}
      </button>
    </div>,
    portalRoot
  );
}
