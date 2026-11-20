/* VSR Emergency Debug: native DOM implementation independent of React. */
(function () {
  if (window.__VSR_EMERGENCY_DEBUG__) return;
  window.__VSR_EMERGENCY_DEBUG__ = true;
  var max = 300, logs = [], panel, list, count, opened = false;
  function safe(value) {
    try {
      if (value instanceof Error) return value.name + ': ' + value.message + (value.stack ? '\n' + value.stack : '');
      if (typeof value === 'string') return value;
      return JSON.stringify(value, function (k, v) { return typeof v === 'function' ? '[Function]' : v; }, 2) || String(value);
    } catch (_) { try { return String(value); } catch (_) { return '[unprintable]'; } }
  }
  function add(level, message, details) {
    logs.push({ level: level, time: new Date().toLocaleTimeString(), message: String(message || 'Unknown error'), details: details || '' });
    if (logs.length > max) logs.shift();
    render();
  }
  function render() {
    if (!list || !count) return;
    count.textContent = logs.length + ' captured';
    list.textContent = '';
    logs.slice().reverse().forEach(function (entry) {
      var item = document.createElement('div');
      item.style.cssText = 'border-bottom:1px solid #374151;padding:10px;font:12px/1.45 monospace;color:#f3f4f6;white-space:pre-wrap;overflow-wrap:anywhere';
      var meta = document.createElement('div');
      meta.style.cssText = 'color:' + (entry.level === 'error' ? '#f87171' : '#fbbf24') + ';margin-bottom:4px';
      meta.textContent = entry.time + ' · ' + entry.level.toUpperCase();
      var body = document.createElement('div'); body.textContent = entry.message;
      item.appendChild(meta); item.appendChild(body);
      if (entry.details) { var d = document.createElement('pre'); d.style.cssText = 'white-space:pre-wrap;color:#9ca3af;margin:6px 0 0'; d.textContent = entry.details; item.appendChild(d); }
      list.appendChild(item);
    });
  }
  function toggle() { opened = !opened; panel.style.display = opened ? 'flex' : 'none'; }
  function init() {
    if (!document.body) return;
    var debugEnabled = new URLSearchParams(window.location.search).get('debug') === '1';
    var launcher = document.createElement('button');
    launcher.textContent = 'SAFE DEBUG';
    launcher.setAttribute('aria-label', 'Open emergency debug log');
    launcher.style.cssText = 'position:fixed;right:14px;bottom:76px;z-index:2147483647;background:#7c2d12;color:#fff;border:1px solid #fb923c;border-radius:10px;padding:11px 14px;font:bold 12px system-ui;box-shadow:0 4px 18px #0008;cursor:pointer;display:' + (debugEnabled ? 'block' : 'none') + ';'
    launcher.onclick = toggle;
    panel = document.createElement('div');
    panel.style.cssText = 'display:none;position:fixed;z-index:2147483646;right:12px;bottom:124px;width:min(92vw,600px);height:min(65vh,520px);background:#111827;color:#f9fafb;border:1px solid #4b5563;border-radius:12px;box-shadow:0 12px 40px #000a;flex-direction:column;overflow:hidden;font-family:system-ui';
    var header = document.createElement('div'); header.style.cssText='padding:10px;display:flex;align-items:center;gap:8px;background:#1f2937;border-bottom:1px solid #374151';
    var title = document.createElement('strong'); title.textContent='VSR Emergency Debug';
    count = document.createElement('span'); count.style.cssText='font-size:11px;color:#9ca3af;margin-left:auto';
    function action(label, fn) { var b=document.createElement('button'); b.textContent=label; b.style.cssText='background:#374151;color:#fff;border:0;border-radius:6px;padding:6px 9px;cursor:pointer'; b.onclick=fn; return b; }
    header.appendChild(title); header.appendChild(count);
    header.appendChild(action('Copy',function(){var text=logs.map(function(e){return '['+e.time+'] '+e.level+' '+e.message+'\n'+e.details}).join('\n\n'); if(navigator.clipboard) navigator.clipboard.writeText(text).catch(function(){add('warning','Clipboard unavailable');});}));
    header.appendChild(action('Clear',function(){logs=[];render();}));
    header.appendChild(action('Close',toggle));
    list=document.createElement('div'); list.style.cssText='overflow:auto;flex:1';
    var footer=document.createElement('div'); footer.textContent='Native DOM logger — independent of React render lifecycle'; footer.style.cssText='padding:8px;font-size:10px;color:#9ca3af;border-top:1px solid #374151';
    panel.appendChild(header);panel.appendChild(list);panel.appendChild(footer);
    document.body.appendChild(panel);document.body.appendChild(launcher);render();
  }
  var oe=console.error, ow=console.warn;
  console.error=function(){add('error',Array.prototype.map.call(arguments,safe).join(' '));oe.apply(console,arguments);};
  console.warn=function(){add('warning',Array.prototype.map.call(arguments,safe).join(' '));ow.apply(console,arguments);};
  window.addEventListener('error',function(e){add('error',e.message||'Window error',e.error?safe(e.error):e.filename+':'+e.lineno+':'+e.colno);},true);
  window.addEventListener('unhandledrejection',function(e){add('error','Unhandled promise rejection',safe(e.reason));});
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();
