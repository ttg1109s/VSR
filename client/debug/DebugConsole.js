export class DebugConsole {
  constructor(root) {
    this.root = root; this.entries = []; this.open = false; this.filter = 'all';
    window.addEventListener('error', e => {
      if (e.target && e.target !== window) this.record('resource', 'Resource load failed: ' + (e.target.src || e.target.href || e.target.tagName));
      else this.record('error', e.message || 'JavaScript runtime error', e.error?.stack || '');
    }, true);
    window.addEventListener('unhandledrejection', e => this.record('error', e.reason?.message || String(e.reason), e.reason?.stack || ''));
    ['error','warn'].forEach(level => {
      const original = console[level].bind(console);
      console[level] = (...args) => { original(...args); this.record(level, args.map(x => { if (x?.message) return x.message; if (typeof x === 'string') return x; try { return JSON.stringify(x); } catch { return String(x); } }).join(' '), args.find(x => x instanceof Error)?.stack || ''); };
    });
    this.render();
  }
  record(level, message, stack = '') {
    this.entries.push({ level, message: String(message), stack, time: new Date().toISOString(), screen: window.__VSR_APP_STATE__?.screen || 'unknown' });
    if (this.entries.length > 300) this.entries.shift();
    this.render();
  }
  toggle() { this.open = !this.open; this.render(); }
  render() {
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const errors = this.entries.filter(x => x.level === 'error' || x.level === 'resource').length;
    const rows = this.entries.filter(x => this.filter === 'all' || x.level === this.filter).slice().reverse().map(x =>
      '<article class="debug-entry '+esc(x.level)+'"><b>'+esc(x.level.toUpperCase())+'</b><time>'+esc(x.time)+'</time><p>'+esc(x.message)+'</p><small>SCREEN: '+esc(x.screen)+'</small>'+(x.stack ? '<pre>'+esc(x.stack)+'</pre>' : '')+'</article>').join('');
    this.root.innerHTML = '<button class="debug-fab" type="button">◉ DEBUG <b>'+errors+'</b></button>' +
      (this.open ? '<section class="debug-drawer" role="dialog" aria-label="VSR Debug Console"><header><div><small>VSR / DIAGNOSTICS</small><h2>Debug Console ('+this.entries.length+')</h2></div><button data-close>×</button></header><div class="debug-toolbar"><select data-filter><option value="all">Tất cả</option><option value="error">Error</option><option value="warn">Warning</option><option value="resource">Resource</option></select><button data-copy>Copy logs</button><button data-clear>Clear</button></div><div class="debug-log-list">'+(rows || '<p>Chưa có log runtime.</p>')+'</div></section>' : '');
    this.root.querySelector('.debug-fab')?.addEventListener('click', () => this.toggle());
    this.root.querySelector('[data-close]')?.addEventListener('click', () => this.toggle());
    this.root.querySelector('[data-filter]')?.addEventListener('change', e => { this.filter = e.target.value; this.render(); });
    this.root.querySelector('[data-clear]')?.addEventListener('click', () => { this.entries = []; this.render(); });
    this.root.querySelector('[data-copy]')?.addEventListener('click', async () => { try { await navigator.clipboard.writeText(this.entries.map(x => '['+x.time+'] ['+x.level+'] '+x.message+'\\n'+x.stack).join('\\n\\n')); } catch (error) { this.record('warn', 'Clipboard unavailable: '+error.message); } });
  }
}