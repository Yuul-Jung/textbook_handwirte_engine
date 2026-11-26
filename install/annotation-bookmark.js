(() => {
'use strict';
if (window.top !== window.self) return;
if (window.__YJA_BOOKMARK_V1) { window.__YJA_BOOKMARK_V1.toggle(); return; }
if (!window.isSecureContext || !crypto.subtle) { alert('판서 엔진은 HTTPS 교재에서 실행할 수 있습니다.'); return; }
let busy = false, failed = false, style = null;
const diagnostic = false;
const messages = {on:'판서 켜짐',off:'판서 꺼짐',unsupported:'지원하지 않는 교재 구조 (main 및 고유한 section[id] 필요)',conflict:'기존 판서 엔진 또는 설정이 있습니다. 기존 엔진을 사용하거나 새로고침하세요.',busy:'출력 창을 닫고 다시 시도하세요.',failed:'판서 초기화 실패. 새로고침 후 다시 시도하세요.'};
let noticeTimer, notice;
function report(state, detail='') {
  const text = (messages[state] || state) + (detail ? ' · '+detail : '');
  console.info('YJA:', text);
  if (diagnostic) {
    const out = document.getElementById('diagnostic-result');
    if (out) out.textContent = text;
    return;
  }
  if (state === 'on' || state === 'off') return;
  if (!notice || !notice.isConnected) {
    notice = document.createElement('div'); notice.setAttribute('role','status'); notice.dataset.yjaShortcutNotice = '';
    notice.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);max-width:85vw;background:#202b3c;color:white;padding:12px 16px;border-radius:8px;font:14px/1.5 system-ui;z-index:2147483647;pointer-events:none';
    document.body.append(notice);
  }
  notice.textContent=text;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>notice.remove(),6000);
}
/* v37: private bridge. Never change original lesson markup. */
let bookmarkBridge;
(() => {
  if (bookmarkBridge) return;
  let config = null, active = false, ready = false, restoreInk = true;
  const button = (name) => [...document.querySelectorAll('.yja-ui button')].find(b => b.getAttribute('aria-label') === name);
  const ui = () => document.querySelector('.yja-ui');
  const digest = async text => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))), n => n.toString(16).padStart(2,'0')).join('');
  async function prepare() {
    if (ready) return 'ready';
    if (config || document.querySelector('[data-yja-config],[data-yja-content],.yja-ui,#yja-server-config') || document.documentElement.hasAttribute('data-yja-config-error')) return 'conflict';
    const hosts = document.querySelectorAll('main');
    if (hosts.length !== 1) return 'unsupported';
    const host = hosts[0], sections = [...host.querySelectorAll('section[id]')];
    const counts = new Map(); document.querySelectorAll('[id]').forEach(e => counts.set(e.id, (counts.get(e.id)||0)+1));
    if (!sections.length || sections.some(e => !/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(e.id) || e.id.startsWith('__yja_') || counts.get(e.id)!==1 || sections.some(a=>a!==e&&a.contains(e)))) return 'unsupported';
    // URL, not tab or fragment, identifies each lesson. Normalize directory/index alias.
    const path = location.pathname.replace(/\/index\.html$/, '/');
    const chapter = await digest(location.origin + path + location.search);
    // Text/markup edits get a new revision; URL fragments do not. Dynamic markup may also change this revision.
    const revision = await digest(host.innerHTML);
    config = document.createElement('script'); config.type = 'application/json'; config.dataset.yjaConfig = '';
    config.textContent = JSON.stringify({host:'main',anchors:'section[id]',course:'shortcut-v1',chapter,revision,pageInk:true,external:true});
    document.head.append(config); return 'prepared';
  }
  function complete() {
    if (!config?.yjaExternalActive || document.querySelectorAll('.yja-ui').length !== 1 || !button('펜') || !button('숨김')) return 'failed';
    ready = active = true; button('펜').click(); return 'on';
  }
  function toggle() {
    if (!ready || !ui()) return 'failed';
    if (document.querySelector('.yja-output-dialog,.yja-print-root')) return 'busy';
    const eye = button('숨김'); if (!eye) return 'failed';
    if (active) {
      const board = button('백지'); if (board?.getAttribute('aria-pressed')==='true') board.click();
      const diag = button('입력 진단'); if (diag?.getAttribute('aria-expanded')==='true') diag.click();
      const more = button('더보기'); if (more?.getAttribute('aria-expanded')==='true') more.click();
      restoreInk = eye.getAttribute('aria-pressed')!=='true';
      if (restoreInk) eye.click(); // select/read mode and hide layer, without deleting strokes
      ui().style.setProperty('display','none','important');
      if (ui().contains(document.activeElement)) document.activeElement.blur();
      active=false; return 'off';
    }
    ui().style.removeProperty('display');
    if (restoreInk && eye.getAttribute('aria-pressed')==='true') eye.click();
    button('펜').click(); active=true; return 'on';
  }
  function cleanup() {
    if (config && !config.yjaExternalActive && !ui()) {config.remove(); config=null; if(document.documentElement.dataset.yjaConfigError==='true') delete document.documentElement.dataset.yjaConfigError; return true;}
    return false;
  }
  bookmarkBridge = {prepare, complete, toggle, cleanup, state:()=>ready?'ready':config?'pending':'new'};
})();

const css = "/* Scoped component: never restyle the course itself. */\n.yja-host{position:relative;isolation:isolate}\n.yja-layer{position:absolute;inset:0;width:100%;height:100%;z-index:5;pointer-events:none;overflow:hidden;display:block}\n.yja-host.yja-drawing .yja-layer{pointer-events:auto;touch-action:none;cursor:crosshair}\n.yja-layer[hidden]{display:none!important}\n.yja-ui{font:15px/1.45 system-ui,sans-serif;color:#eaf0f8;box-sizing:border-box;position:fixed;z-index:2147483000;right:12px;top:50%;transform:translateY(-50%);max-height:calc(100dvh - 24px);overflow:auto;background:#182535;border:1px solid #526479;border-radius:14px;padding:8px;box-shadow:0 6px 24px #0004;width:76px;display:grid;gap:6px;scrollbar-width:thin;user-select:none}\n.yja-ui *{box-sizing:border-box}.yja-ui[data-dock=left]{right:auto;left:12px}.yja-ui[data-dock=bottom]{top:auto;bottom:12px;left:50%;right:auto;transform:translateX(-50%);width:max-content;max-width:calc(100vw - 24px);display:flex;align-items:center;flex-wrap:wrap;justify-content:center;max-height:36vh}.yja-ui button{font:inherit;color:inherit;background:#26374a;border:1px solid #526479;border-radius:8px;min-height:44px;min-width:44px;padding:4px;cursor:pointer;display:grid;place-items:center;gap:0}.yja-ui button:hover{background:#394d63}.yja-ui button:focus-visible,.yja-ui select:focus-visible,.yja-ui input:focus-visible{outline:3px solid #fbbf24;outline-offset:2px}.yja-ui button[aria-pressed=true]{background:#dbeafe;color:#17385d;border:2px solid #60a5fa}.yja-ui button:disabled{opacity:.4;cursor:default}.yja-ui button svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.yja-ui button small{font-size:11px;white-space:nowrap}.yja-ui .yja-group{display:grid;gap:5px}.yja-ui[data-dock=bottom] .yja-group{display:flex;flex-wrap:wrap}.yja-ui .yja-sep{border-top:1px solid #526479;padding-top:6px}.yja-ui[data-dock=bottom] .yja-sep{border:0;border-left:1px solid #526479;padding:0 0 0 6px}.yja-ui .yja-swatches{display:grid;grid-template-columns:repeat(2,1fr);gap:4px}.yja-ui .yja-swatches button{min-width:0;width:27px;min-height:32px}.yja-ui .yja-swatches i{width:17px;height:17px;border:1px solid #fff9;border-radius:50%}.yja-ui .yja-more{display:grid;gap:6px}.yja-ui .yja-more[hidden],.yja-ui [hidden]{display:none!important}.yja-ui[data-collapsed=true] .yja-group,.yja-ui[data-collapsed=true] .yja-more{display:none}.yja-ui .yja-status{font-size:11px;line-height:1.4;color:#cbd5e1;overflow-wrap:anywhere}.yja-ui input[type=range]{width:100%;accent-color:#60a5fa}.yja-ui select{max-width:100%;background:#26374a;color:#fff;border:1px solid #789;border-radius:5px;padding:6px;font:inherit;font-size:12px}.yja-ui label{font-size:11px}.yja-ui .yja-status[data-warn=true]{color:#fde68a}.yja-host.yja-drawing{user-select:none}.yja-ui .yja-toggle{background:#284e75}.yja-ui[data-dock=bottom] .yja-more{display:flex;flex-wrap:wrap;align-items:center;max-width:240px}.yja-ui[data-dock=bottom] .yja-more input[type=range]{width:85px}\n@media(max-width:650px){.yja-ui:not([data-dock=bottom]){width:66px;padding:5px;right:4px}.yja-ui[data-dock=left]{left:4px;right:auto}}\n@media print{.yja-ui{display:none!important}.yja-layer{display:none!important}}\n\n/* v02: mouse navigation with pen-only overlay, and compact input diagnostics. */\n.yja-host.yja-drawing.yja-pen-only{user-select:auto}\n.yja-host.yja-drawing.yja-pen-only .yja-layer{pointer-events:none;touch-action:auto}\n.yja-ui button small{white-space:normal;text-align:center;line-height:1.2}\n.yja-ui .yja-swatches{grid-template-columns:repeat(2,minmax(0,1fr))}\n.yja-ui .yja-swatches button{width:100%;min-height:36px}\n.yja-diagnostic{position:fixed;z-index:2147483001;left:12px;bottom:12px;max-width:calc(100vw - 24px);width:280px;max-height:60dvh;overflow:auto;padding:14px;background:#182535;color:#eaf0f8;border:1px solid #526479;border-radius:12px;font:13px/1.5 system-ui,sans-serif;box-shadow:0 6px 24px #0004;box-sizing:border-box}\n.yja-diagnostic[hidden]{display:none!important}.yja-diag-title{display:flex;align-items:center;justify-content:space-between;font-weight:700;gap:8px}.yja-diagnostic button{min-height:40px;color:inherit;background:#26374a;border:1px solid #526479;border-radius:6px;padding:5px 10px;cursor:pointer;font:inherit}.yja-diagnostic pre.yja-diag-readout{white-space:pre-wrap;font:12px/1.5 monospace;background:#101b2a;color:#eaf0f8;padding:10px;margin:8px 0}.yja-diagnostic input[type=range]{display:block;width:100%;accent-color:#60a5fa}.yja-diagnostic label{display:flex;gap:6px;align-items:center}.yja-diagnostic>button{margin-top:8px}.yja-diagnostic :focus-visible{outline:3px solid #fbbf24;outline-offset:2px}\n@media(max-width:860px){.yja-diagnostic{bottom:100px;max-height:48dvh}}\n@media print{.yja-diagnostic{display:none!important}}\n\n/* Pen-only keeps mouse click/selection and wheel; touch gestures require reading mode. */\n.yja-host.yja-drawing.yja-pen-only{touch-action:none}\n\n/* v03 — drag handle, quick sizes and engine-owned board. */\n.yja-ui .yja-grip{cursor:grab;touch-action:none;font-size:12px;min-height:44px;background:#34475c}.yja-ui .yja-grip:active{cursor:grabbing}\n.yja-ui[data-dock=float]{right:auto;bottom:auto;transform:none;max-width:calc(100vw - 8px);width:82px}\n.yja-ui .yja-widths{display:flex;flex-wrap:wrap;gap:3px}.yja-ui .yja-widths button{min-width:44px;min-height:44px;flex:1}\n.yja-ui .yja-swatches button{min-height:44px;min-width:44px}.yja-ui .yja-swatches{grid-template-columns:1fr 1fr}.yja-ui:not([data-dock=bottom]){width:112px}\n.yja-ui[data-dock=bottom] .yja-widths{display:flex;flex-wrap:nowrap}.yja-ui[data-dock=bottom] .yja-swatches{display:flex;flex-wrap:wrap;max-width:150px}\n.yja-ui[data-collapsed=true] .yja-grip{display:none}.yja-ui[data-collapsed=true] .yja-status{display:none}\n.yja-board[hidden]{display:none!important}.yja-board{box-sizing:border-box;background:#fff;color:#15171c;border:1px solid #d8d9d6;border-radius:10px;padding:20px;margin:16px 0;scroll-margin-top:12px}.yja-board-title{color:#4635b1;font:700 22px/1.5 system-ui,sans-serif;margin:0 0 8px}.yja-board-help{font:14px/1.5 system-ui,sans-serif;margin:0 0 10px}.yja-board-grid{height:560px;background-image:linear-gradient(#dce2e7 1px,transparent 1px),linear-gradient(90deg,#dce2e7 1px,transparent 1px);background-size:24px 24px;border:1px solid #dce2e7}\n@media print{.yja-board{display:none!important}}\n/* (변경) 16-inch FHD: two-column main controls, compact but 44px targets. */\n.yja-ui:not([data-dock=bottom]) .yja-group{grid-template-columns:repeat(2,minmax(0,1fr));gap:4px}\n.yja-ui:not([data-dock=bottom]) .yja-group button{min-width:44px}\n.yja-ui:not([data-dock=bottom]) .yja-group .yja-swatches,.yja-ui:not([data-dock=bottom]) .yja-group .yja-widths{grid-column:1/-1}\n.yja-ui:not([data-dock=bottom]) .yja-more{grid-template-columns:repeat(2,minmax(0,1fr));gap:4px}\n.yja-ui:not([data-dock=bottom]) .yja-more>label,.yja-ui:not([data-dock=bottom]) .yja-more>input,.yja-ui:not([data-dock=bottom]) .yja-more>select{grid-column:1/-1}\n.yja-ui:not([data-dock=bottom])[data-collapsed=true] .yja-group,.yja-ui:not([data-dock=bottom])[data-collapsed=true] .yja-more{display:none}\n\n/* v04: pen-first settings, help and keyboard navigation. */\n.yja-ui .yja-setting{display:flex;align-items:center;gap:3px;min-height:44px;cursor:pointer}\n.yja-ui .yja-setting input{width:19px;height:19px;flex:none;accent-color:#60a5fa}\n.yja-ui .yja-help{font-size:11px;line-height:1.5;color:#dbe5f2;grid-column:1/-1}\n.yja-ui[data-dock=bottom] .yja-help{flex-basis:100%}\n\n/* v07 — quick preset cards */\n.yja-ui .yja-preset svg{width:36px;height:18px;background:#fff;border-radius:3px;stroke-width:2}.yja-ui .yja-preset small{font-size:10px}.yja-ui .yja-preset-status{grid-column:1/-1;font-size:10px;color:#cbd5e1;overflow-wrap:anywhere}.yja-ui .yja-preset-status[data-warn=true]{color:#fde68a}.yja-ui[data-dock=bottom] .yja-preset-status{flex-basis:100%}.yja-ui[data-dock=bottom] .yja-presets{max-width:220px}.yja-ui .yja-preset{min-height:44px}\n/* v08 — page management outside ink surface */\n.yja-board-nav{position:relative;z-index:6;display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:12px;background:#eef0f9;border:1px solid #c8c4df;border-radius:10px;margin:16px 0 0;scroll-margin-top:12px;font:14px/1.4 system-ui,sans-serif;color:#26233e;user-select:auto;touch-action:auto}\n.yja-board-nav[hidden]{display:none!important}.yja-board-count{color:#4635b1;white-space:nowrap}.yja-board-nav button,.yja-board-nav select,.yja-board-nav input{font:inherit;box-sizing:border-box;min-height:44px;border:1px solid #a9a5bf;border-radius:7px;padding:6px 10px;background:#fff;color:#26233e;max-width:100%}.yja-board-nav button{cursor:pointer;min-width:44px}.yja-board-nav button:hover:not(:disabled){background:#e2dff7}.yja-board-nav button:disabled{opacity:.45;cursor:default}.yja-board-nav :focus-visible{outline:3px solid #4635b1;outline-offset:2px}.yja-board-nav select,.yja-board-nav input{width:170px}.yja-board-nav button[aria-label='새 백지']{background:#4635b1;color:#fff}.yja-board-nav button[aria-label='백지 삭제']{color:#a52232}.yja-board-nav+.yja-board{margin-top:8px}\n@media print{.yja-board-nav{display:none!important}}\n\n/* v10 — isolated output preview and print-only snapshot pages. */\n.yja-output-dialog{box-sizing:border-box;width:min(920px,94vw);max-height:90dvh;border:1px solid #c8c4df;border-radius:14px;padding:20px;background:#f1f2ee;color:#15171c;font:15px/1.5 system-ui,sans-serif;overflow:auto;z-index:2147483002}\n.yja-output-dialog::backdrop{background:#18253599}.yja-output-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:16px;color:#4635b1;font-size:20px}.yja-output-settings{display:flex;flex-wrap:wrap;gap:10px;align-items:end}.yja-output-settings label{display:grid;gap:4px;font-size:13px;color:#334155}.yja-output-dialog button,.yja-output-dialog select,.yja-output-card a{font:inherit;min-height:44px;box-sizing:border-box;padding:8px 12px;border:1px solid #aaa8bf;border-radius:8px;background:white;color:#26233e;cursor:pointer;max-width:100%}.yja-output-settings button{background:#4635b1;color:white}.yja-output-dialog button:disabled{opacity:.45;cursor:default}.yja-output-message{padding:10px;background:white;border-left:3px solid #4635b1}.yja-output-message[data-warn=true]{border-color:#a16b00;color:#794c00}.yja-output-previews{display:grid;gap:12px}.yja-output-card{padding:12px;border:1px solid #ddd;border-radius:8px;background:white}.yja-output-card h3{margin:0 0 8px}.yja-output-card img{display:block;max-width:100%;height:auto;margin:0 auto 10px;border:1px solid #ddd}.yja-output-card a{display:inline-block;text-decoration:none;color:#4635b1}.yja-print-root{display:none}\n@media print{body:has(>.yja-print-root:not(:empty))>*:not(.yja-print-root){display:none!important}body:has(>.yja-print-root:not(:empty)){margin:0!important;padding:0!important;background:white!important}.yja-print-root:not(:empty){display:block!important;color:#15171c;font:12px/1.3 system-ui,sans-serif;print-color-adjust:exact;-webkit-print-color-adjust:exact}.yja-print-sheet{display:block;break-after:page;break-inside:avoid;margin:0;padding:0}.yja-print-sheet:last-child{break-after:auto}.yja-print-sheet h2{margin:0 0 3mm;font:700 12pt/1.25 system-ui,sans-serif;overflow-wrap:anywhere}.yja-print-sheet img{display:block;margin:0 auto;max-width:none!important;border:0}}\n\n/* v12: recovery UI independent of folded toolbar; larger touch targets and clear status. */\n.yja-ui .yja-recovery{display:grid;gap:4px;padding:4px;border:1px solid #d9a441;border-radius:8px;background:#352a18;color:#fff1c8}.yja-recovery-text{font-size:12px;line-height:1.4;overflow-wrap:anywhere}.yja-ui .yja-recovery button{min-height:44px;width:100%}.yja-ui[data-dock=bottom] .yja-recovery{display:flex;align-items:center;flex-wrap:wrap;max-width:100%}.yja-ui[data-dock=bottom] .yja-recovery button{width:auto}.yja-ui[data-dock=bottom] .yja-recovery-text{max-width:160px}.yja-ui[data-dock=bottom][data-collapsed=true]{max-height:50dvh}.yja-ui .yja-widths button:focus-visible{outline-offset:-3px}\n\n/* v13 — compact grouped toolbar; scoped to engine only. */\n.yja-ui{padding:8px;gap:6px;border-radius:12px;overscroll-behavior:contain;scrollbar-gutter:stable}\n.yja-ui:not([data-dock=bottom]){width:168px}\n.yja-ui .yja-topbar{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px;position:sticky;top:0;background:#182535;z-index:2;padding-bottom:5px;border-bottom:1px solid #526479}\n.yja-ui .yja-topbar button{min-width:44px;min-height:44px}\n.yja-ui .yja-topbar button[aria-label=\"간소화\"]{grid-column:1/-1;display:flex;justify-content:center;gap:6px;min-height:44px}\n.yja-ui .yja-mode-readout{grid-column:1/-1;font-size:12px;text-align:center;font-weight:650;padding:5px 2px;border:1px solid #526479;border-radius:6px;color:#eaf0f8;background:#26374a;overflow-wrap:anywhere}\n.yja-ui .yja-mode-readout[data-active=true]{background:#e8e3fb;color:#38258e;border-color:#b6a8ea}\n.yja-ui:not([data-dock=bottom]) .yja-style-group .yja-swatches{grid-template-columns:repeat(3,minmax(0,1fr));gap:3px}\n.yja-ui:not([data-dock=bottom]) .yja-style-group .yja-swatches button{min-width:0;width:100%;min-height:44px}\n.yja-ui:not([data-dock=bottom]) .yja-widths{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:3px}\n.yja-ui:not([data-dock=bottom]) .yja-widths button{min-width:0;min-height:44px}\n.yja-ui[data-compact=true] .yja-style-group{display:none}\n.yja-ui[data-collapsed=true] .yja-topbar button[aria-label=\"간소화\"],.yja-ui[data-collapsed=true] .yja-mode-readout{display:none}\n.yja-ui[data-collapsed=true] .yja-topbar{grid-template-columns:1fr;border:0;padding:0}\n.yja-ui[data-collapsed=true]:not([data-dock=bottom]){width:86px}\n.yja-ui[data-dock=bottom]{max-height:44dvh;overflow:auto;justify-content:start;align-content:start;gap:8px}\n.yja-ui[data-dock=bottom] .yja-topbar{flex-basis:100%;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;top:0}\n.yja-ui[data-dock=bottom] .yja-topbar button[aria-label=\"간소화\"]{flex:none}\n.yja-ui[data-dock=bottom] .yja-mode-readout{flex:1;min-width:90px}\n.yja-ui[data-dock=bottom][data-collapsed=true] .yja-topbar{flex-basis:auto}\n.yja-ui[data-dock=bottom][data-collapsed=true]{max-height:50dvh}\n.yja-ui[data-dock=bottom] .yja-group{max-width:100%}\n.yja-ui[data-dock=bottom] .yja-swatches button{width:44px}\n.yja-ui[data-dock=bottom] .yja-more{max-width:100%;flex-basis:100%}\n@media(max-width:650px){.yja-ui:not([data-dock=bottom]){width:168px}.yja-ui[data-collapsed=true]:not([data-dock=bottom]){width:86px}}\n\n.yja-ui:not([data-dock=bottom]) .yja-history-group,.yja-ui:not([data-dock=bottom]) .yja-action-group{grid-template-columns:repeat(3,minmax(0,1fr));gap:3px}\n.yja-ui:not([data-dock=bottom]) .yja-history-group button,.yja-ui:not([data-dock=bottom]) .yja-action-group button{min-width:0}\n\n/* v17: loading contract and scoped resistance to generic host theme rules. */\n.yja-ui{--yja-css-contract:1;letter-spacing:normal;text-transform:none;text-align:start}\n.yja-ui button,.yja-diagnostic button,.yja-board-nav button,.yja-output-dialog button{margin:0;letter-spacing:normal;text-transform:none;max-width:100%;float:none}\n.yja-ui button svg{max-width:none;max-height:none;margin:0;vertical-align:middle;flex:none}\n.yja-host > .yja-layer{max-width:none;max-height:none;margin:0;padding:0;border:0;aspect-ratio:auto;float:none}\n/* v19: server controls outside the annotated document, available in authenticated frame only. */\n.yja-sync-panel{display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding:10px 16px;background:#eDEAFA;color:#15171c;border-bottom:1px solid #c8c2e5;font:14px/1.4 system-ui,sans-serif}\n.yja-sync-panel button{font:inherit;color:#fff;background:#4635B1;border:1px solid #4635B1;border-radius:5px;min-height:44px;padding:6px 12px;cursor:pointer}\n.yja-sync-panel button:disabled{opacity:.55;cursor:default}.yja-sync-panel button:focus-visible{outline:3px solid #b17b00;outline-offset:2px}\n@media print{.yja-sync-panel{display:none}}\n\n/* v21: opt-in document layer; always transparent to controls, input captured separately. */\nbody > .yja-page-layer{position:absolute;inset:auto;left:0;top:0;z-index:2147482990;pointer-events:none!important;overflow:hidden;max-width:none;max-height:none;margin:0;padding:0;border:0;aspect-ratio:auto;float:none}\nbody.yja-page-drawing:not(.yja-page-pen-only){user-select:none}body.yja-page-drawing{touch-action:none}\n.yja-ui .yja-scope-group button{grid-column:1/-1;min-height:44px;display:flex;align-items:center;justify-content:center;gap:6px}\n\n/* v22: quick shape controls remain available in compact mode. */\n.yja-ui .yja-shape-group{border-top:1px solid #526479;padding-top:5px}\n.yja-ui .yja-shape-group button[aria-label=\"자동 도형\"][aria-pressed=true]{background:#e8e3fb;color:#38258e;border-color:#a99ae5}\n";
function loadCore() {
/* v16 — optional declarative adapter. Load before annotation.js. No network or eval. */
(() => {
    'use strict';
    function configure() {
        const configs = document.querySelectorAll('script[type="application/json"][data-yja-config]');
        if (!configs.length) return; // explicit data attributes remain supported
        try {
            if (configs.length !== 1 || document.querySelector('[data-yja-content]'))
                throw Error('choose exactly one configuration method');
            const c = JSON.parse(configs[0].textContent);
            const validId = v => typeof v === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(v);
            if (!c || ![c.course, c.chapter, c.revision].every(validId) ||
                typeof c.host !== 'string' || !c.host || typeof c.anchors !== 'string' || !c.anchors)
                throw Error('course/chapter/revision and selectors required');
            const hosts = document.querySelectorAll(c.host);
            if (hosts.length !== 1 || !hosts[0].matches('main,article,div')) throw Error('exactly one content container required');
            const host = hosts[0], sections = [...host.querySelectorAll(c.anchors)];
            if (document.querySelector('[data-yja-anchor]')) throw Error('pre-existing anchor attributes');
            const ids = new Set(), idCounts = new Map();
            document.querySelectorAll('[id]').forEach(e=>idCounts.set(e.id,(idCounts.get(e.id)||0)+1));
            if (!sections.length || sections.some(e => {
                if (!validId(e.id) || (e.id.startsWith('__yja_board__')||e.id==='__yja_page__') || ids.has(e.id) || idCounts.get(e.id)!==1 || sections.some(other=>other!==e&&e.contains(other))) return true;
                ids.add(e.id); return false;
            })) throw Error('anchors require unique stable IDs and cannot nest');
            // v31: external integration never annotates the original host DOM.
            // The engine consumes this validated reference on the integration script only.
            if(c.external===true){
                if(c.pageInk!==true)throw Error('external mode requires pageInk=true');
                configs[0].yjaExternalConfig=Object.freeze({host,sections:Object.freeze(sections),course:c.course,chapter:c.chapter,revision:c.revision});
                return;
            }
            // Validate everything before changing the host DOM.
            host.setAttribute('data-yja-content','');
            Object.assign(host.dataset,{yjaCourse:c.course,yjaChapter:c.chapter,yjaRevision:c.revision});
            if(c.pageInk===true)host.dataset.yjaPageInk='true';
            sections.forEach(e=>{e.dataset.yjaAnchor=e.id;});
        } catch (err) { document.documentElement.dataset.yjaConfigError='true'; console.warn('YJA config: '+err.message); }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',configure,{once:true});
    else configure();
})();
/* YJ Annotation Engine v31 — no dependencies, no network requests. */
(() => {
    'use strict';
    const NS = 'http://www.w3.org/2000/svg', SCHEMA = 1, LIMIT = 4000, POINT_LIMIT = 10000, TOTAL_POINTS = 150000;
    const icons = { select: 'M5 3l14 10-7 1-3 7z', pen: 'M4 20l4-1L20 7l-4-4L4 15z M13 6l4 4', highlight: 'M4 16l4 4 12-12-4-4z M3 21h10', eraser: 'M3 13l10-10 8 8-10 10H7z M8 8l8 8', line: 'M4 20L20 4', arrow: 'M4 20L20 4 M10 4h10v10', rect: 'M4 5h16v14H4z', circle: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18', undo: 'M8 4L3 9l5 5 M3 9h10a7 7 0 0 1 0 14', redo: 'M16 4l5 5-5 5 M21 9H11a7 7 0 0 0 0 14', eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6', save: 'M4 3h13l3 3v15H4z M8 3v7h8V3 M8 21v-7h8v7', more: 'M5 12h1m5 0h1m5 0h1', close: 'M5 5l14 14 M19 5L5 19', menu: 'M4 6h16 M4 12h16 M4 18h16', trash: 'M4 6h16 M9 6V3h6v3 M6 6l1 15h10l1-15 M10 10v7 M14 10v7', export: 'M12 3v12 M7 10l5 5 5-5 M4 16v5h16v-5', import: 'M12 15V3 M7 8l5-5 5 5 M4 16v5h16v-5' };
    const colors = ['#172033', '#d72638', '#1764d2', '#16805c', '#e7a000', '#853ac5', '#ffffff', '#f97316'];
    const validColor=c=>typeof c==='string'&&/^#[0-9a-f]{6}$/i.test(c);
    const validOpacity=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0.1&&v<=1;
    const defaultOpacity=t=>t==='highlight'?0.3:1;
    // (추가) 4개 슬롯의 설정은 판서 데이터와 분리한다.
    const slotTypes=['pen','pen','pen','highlight'];
    function defaultPresets(){return {schema:1,slots:[{color:colors[0],width:2},{color:colors[1],width:3},{color:colors[2],width:4},{color:colors[4],width:8}],pen:1,highlight:3,shape:{color:colors[1],width:3}};}
    function validatePresets(v){
        const style=x=>{if(!x||!validColor(x.color)||(x.opacity!==undefined&&!validOpacity(x.opacity))||!Number.isInteger(x.width)||x.width<1||x.width>12)throw Error('프리셋 색/굵기 오류');return {color:x.color.toLowerCase(),width:x.width,...(x.opacity===undefined?{}:{opacity:x.opacity})};};
        if(!v||v.schema!==1||!Array.isArray(v.slots)||v.slots.length!==4||!Number.isInteger(v.pen)||v.pen<0||v.pen>2||v.highlight!==3)throw Error('프리셋 구조 오류');
        return {schema:1,slots:v.slots.map(style),pen:v.pen,highlight:3,shape:style(v.shape)};
    }
    // v08: stable page IDs, independent of names and order.
    const BOARD_FIRST='__yja_board__', BOARD_LIMIT=20;
    const isBoardId=id=>typeof id==='string'&&(id===BOARD_FIRST||/^__yja_board__:[a-zA-Z0-9-]{1,80}$/.test(id));
    const defaultBoards=()=>[{id:BOARD_FIRST,name:'백지 1'}];
    function validateBoards(value,active){
        const list=value===undefined?defaultBoards():value;
        if(!Array.isArray(list)||!list.length||list.length>BOARD_LIMIT)throw Error('백지 목록 오류');
        const seen=new Set();const boards=list.map(b=>{if(!b||!isBoardId(b.id)||seen.has(b.id)||typeof b.name!=='string'||!b.name.trim()||b.name.length>60||/[\x00-\x1f\x7f]/.test(b.name))throw Error('백지 ID/이름 오류');seen.add(b.id);return {id:b.id,name:b.name};});
        if(active!==undefined&&!seen.has(active))throw Error('활성 백지 오류');
        return {boards,activeBoard:active??boards[0].id};
    }
    const drawTools = ['pen', 'highlight', 'line', 'arrow', 'rect', 'circle'];
    const svg = (tag, attrs = {}) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs))
        e.setAttribute(k, String(v)); return e; };
    const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls)
        e.className = cls; if (txt)
        e.textContent = txt; return e; };
    // Shared input policy and geometry: also exercised by the Node tests.
    const clamp = x => Math.max(0, Math.min(1, x));
    // v14: bound retained history by unique point objects, not merely snapshot count.
    // Immutable strokes shared by multiple snapshots are charged only once.
    function makeHistory(maxSteps=40,maxPoints=300000){
        const undo=[],redo=[],refs=new Map();let points=0,evicted=0;
        function add(entry){for(const s of entry.strokes){const n=refs.get(s)||0;if(!n)points+=s.points.length;refs.set(s,n+1);}}
        function drop(entry){for(const s of entry.strokes){const n=refs.get(s);if(n===1){refs.delete(s);points-=s.points.length;}else refs.set(s,n-1);}return entry;}
        function clearRedo(){while(redo.length)drop(redo.pop());}
        function trim(){while(undo.length+redo.length>maxSteps||points>maxPoints){const stack=undo.length?undo:redo;drop(stack.shift());evicted++;}}
        function record(...entries){clearRedo();for(const e of entries){undo.push(e);add(e);}trim();}
        function step(forward,current){const from=forward?redo:undo,to=forward?undo:redo;if(!from.length)return null;const next=drop(from.pop());to.push(current);add(current);trim();return next;}
        function clear(){while(undo.length)drop(undo.pop());clearRedo();}
        return {undo,redo,record,step,clear,stats:()=>({points,objects:refs.size,evicted,undo:undo.length,redo:redo.length})};
    }

    function canDraw(type, button, mode, barrelErase=false) {
        return (type === 'pen' && (button === 0 || button === 5 || (barrelErase && button === 2))) ||
            (type === 'mouse' && button === 0 && mode === 'both');
    }
    function samplePressure(type, value, enabled, mock = null, previous = null, ending = false) {
        if (!enabled) return 1;
        if (type === 'mouse') return mock === null ? 1 : clamp(mock);
        if (type !== 'pen') return 1;
        if (ending && value === 0 && previous !== null) return previous;
        return Number.isFinite(value) ? clamp(value) : 1;
    }
    const penWidth = (width, p) => width * (.25 + .75 * clamp(p));
    function segmentDistance(x, y, a, b) {
        const dx=b[0]-a[0], dy=b[1]-a[1], den=dx*dx+dy*dy;
        const t=den ? clamp(((x-a[0])*dx+(y-a[1])*dy)/den) : 0;
        return Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy);
    }
    function arrowHead(a,b,w) {
        const t=Math.atan2(b[1]-a[1],b[0]-a[0]), l=10+w*2;
        return [[b[0]-l*Math.cos(t-.5),b[1]-l*Math.sin(t-.5)],b,
            [b[0]-l*Math.cos(t+.5),b[1]-l*Math.sin(t+.5)]];
    }
    // v27: use the same tapered trapezoids and round caps as inkPath.
    // An eraser travels a continuous segment, not a finite set of sampled dots.
    function segmentGap(a,b,c,d) {
        if(segmentsCross(a,b,c,d))return 0;
        return Math.min(segmentDistance(a[0],a[1],c,d),segmentDistance(b[0],b[1],c,d),
            segmentDistance(c[0],c[1],a,b),segmentDistance(d[0],d[1],a,b));
    }
    function sweptHit(tool,pts,width,from,to,tolerance=7){
        if(!pts.length)return false;
        const path=outline(tool,pts,width),pen=tool==='pen';
        const radius=p=>pen?penWidth(width,Number.isFinite(p[2])?p[2]:1)/2:(tool==='highlight'?width+10:width)/2;
        const q={l:Math.min(from[0],to[0]),r:Math.max(from[0],to[0]),t:Math.min(from[1],to[1]),b:Math.max(from[1],to[1])};
        const overlaps=(a,b,pad)=>Math.min(a[0],b[0])-pad<=q.r&&Math.max(a[0],b[0])+pad>=q.l&&Math.min(a[1],b[1])-pad<=q.b&&Math.max(a[1],b[1])+pad>=q.t;
        for(let i=0;i<path.length;i++){
            const b=path[i],rb=radius(b),a=path[i-1]||b,ra=radius(a);
            if(!overlaps(a,b,Math.max(ra,rb)+tolerance))continue;
            if(segmentDistance(b[0],b[1],from,to)<=rb+tolerance)return true;
            if(!i)continue;
            if(segmentDistance(a[0],a[1],from,to)<=ra+tolerance)return true;
            if(!pen||ra===rb){if(segmentGap(from,to,a,b)<=ra+tolerance)return true;continue;}
            const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);if(!len)continue;
            const nx=-dy/len,ny=dx/len;
            const poly=[[a[0]-nx*ra,a[1]-ny*ra],[b[0]-nx*rb,b[1]-ny*rb],
                [b[0]+nx*rb,b[1]+ny*rb],[a[0]+nx*ra,a[1]+ny*ra]];
            if(inPolygon(from,poly)||inPolygon(to,poly))return true;
            for(let j=0;j<4;j++)if(segmentGap(from,to,poly[j],poly[(j+1)%4])<=tolerance)return true;
        }return false;
    }
    function strokeHit(tool,pts,width,x,y,tolerance=7){return sweptHit(tool,pts,width,[x,y],[x,y],tolerance);}
    // Preserve the final dispatched coordinate when a browser's coalesced list omits it.
    // Ignore malformed or unrelated samples; use the parent event as a safe fallback.
    function inputSamples(e){
        let samples=[];try{samples=Array.from(e.getCoalescedEvents?.()||[]);}catch{}
        samples=samples.filter(q=>q.pointerId===e.pointerId&&q.pointerType===e.pointerType&&Number.isFinite(q.clientX)&&Number.isFinite(q.clientY));
        const last=samples.at(-1);
        if(Number.isFinite(e.clientX)&&Number.isFinite(e.clientY)&&(!last||last.clientX!==e.clientX||last.clientY!==e.clientY||last.pressure!==e.pressure))samples.push(e);
        return samples;
    }
    // (추가) 국소 평활화: 첫점/끝점과 실제 필압 보존.
    function smoothPoints(pts) {
        return pts.map((p,i)=>i===0||i===pts.length-1?p:[
            (pts[i-1][0]+2*p[0]+pts[i+1][0])/4,
            (pts[i-1][1]+2*p[1]+pts[i+1][1])/4,p[2]]);
    }
    // Single SVG path for a variable-width stroke; no DOM node per sample.
    function inkPath(pts,w) {
        let d=''; const f=n=>Number(n.toFixed(2));
        const circle=(p,r)=>`M${f(p[0]+r)} ${f(p[1])}a${f(r)} ${f(r)} 0 1 1 ${f(-2*r)} 0a${f(r)} ${f(r)} 0 1 1 ${f(2*r)} 0Z`;
        pts.forEach((p,i)=>{
            const r=penWidth(w,p[2])/2; d+=circle(p,r);
            if(!i) return;
            const a=pts[i-1], ar=penWidth(w,a[2])/2, dx=p[0]-a[0],dy=p[1]-a[1],len=Math.hypot(dx,dy);
            if(!len) return;
            const nx=-dy/len,ny=dx/len;
            const q=[[a[0]-nx*ar,a[1]-ny*ar],[p[0]-nx*r,p[1]-ny*r],[p[0]+nx*r,p[1]+ny*r],[a[0]+nx*ar,a[1]+ny*ar]];
            d+='M'+q.map(v=>v.map(f).join(' ')).join('L')+'Z';
        }); return d;
    }
    // (추가) 불변 원본에서 매번 계산: 이동/크기 변경은 절 경계에서 제한.
    function pointBounds(points) {
        let l=1,t=1,r=0,b=0; for(const p of points){l=Math.min(l,p[0]);t=Math.min(t,p[1]);r=Math.max(r,p[0]);b=Math.max(b,p[1]);}
        return {l,t,r,b};
    }
    function translatePoints(points,dx,dy) {
        const b=pointBounds(points); dx=Math.max(-b.l,Math.min(1-b.r,dx));dy=Math.max(-b.t,Math.min(1-b.b,dy));
        return points.map(p=>[clamp(p[0]+dx),clamp(p[1]+dy),p[2]]);
    }
    function scalePoints(points,pivot,k) {
        let max=8; for(const p of points)for(let i=0;i<2;i++){
            const d=p[i]-pivot[i];if(d>0)max=Math.min(max,(1-pivot[i])/d);else if(d<0)max=Math.min(max,-pivot[i]/d);
        }
        k=Math.min(max,Math.max(.15,k));
        return points.map(p=>[clamp(pivot[0]+(p[0]-pivot[0])*k),clamp(pivot[1]+(p[1]-pivot[1])*k),p[2]]);
    }
    // Lasso uses rendered centerlines, not a bounding-box-only hit test.
    function outline(tool,pts,width) {
        const a=pts[0],b=pts.at(-1);
        if(tool==='rect')return [a,[b[0],a[1]],b,[a[0],b[1]],a];
        if(tool==='circle')return Array.from({length:65},(_,i)=>[(a[0]+b[0])/2+(b[0]-a[0])/2*Math.cos(i*Math.PI/32),(a[1]+b[1])/2+(b[1]-a[1])/2*Math.sin(i*Math.PI/32)]);
        if(tool==='arrow')return [a,b,...arrowHead(a,b,width)];
        return pts;
    }
    function inPolygon(p,poly){
        let inside=false;
        for(let i=0,j=poly.length-1;i<poly.length;j=i++){
            const a=poly[j],b=poly[i];if(segmentDistance(p[0],p[1],a,b)<1e-6)return true;
            if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
        }return inside;
    }
    function segmentsCross(a,b,c,d){
        const cross=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);
        if(Math.max(a[0],b[0])+1e-6<Math.min(c[0],d[0])||Math.max(c[0],d[0])+1e-6<Math.min(a[0],b[0])||Math.max(a[1],b[1])+1e-6<Math.min(c[1],d[1])||Math.max(c[1],d[1])+1e-6<Math.min(a[1],b[1]))return false;
        const x=cross(a,b,c),y=cross(a,b,d),z=cross(c,d,a),w=cross(c,d,b);
        return ((x>=-1e-6&&y<=1e-6)||(y>=-1e-6&&x<=1e-6))&&((z>=-1e-6&&w<=1e-6)||(w>=-1e-6&&z<=1e-6));
    }
    function pixelBounds(pts){let l=Infinity,t=Infinity,r=-Infinity,b=-Infinity;for(const p of pts){l=Math.min(l,p[0]);t=Math.min(t,p[1]);r=Math.max(r,p[0]);b=Math.max(b,p[1]);}return {l,t,r,b};}
    // v11: conservative broad phase; exact strokeHit is the final decision.
    function makeGrid(cell=64){
        const cells=new Map(),large=[],all=[];
        const span=b=>[Math.floor(b.l/cell),Math.floor(b.t/cell),Math.floor(b.r/cell),Math.floor(b.b/cell)];
        const overlaps=(a,b)=>a.l<=b.r&&b.l<=a.r&&a.t<=b.b&&b.t<=a.b;
        function add(value,b){const item={value,b};all.push(item);const [l,t,r,d]=span(b);
            if((r-l+1)*(d-t+1)>256){large.push(item);return;}
            for(let y=t;y<=d;y++)for(let x=l;x<=r;x++){const k=x+','+y;if(!cells.has(k))cells.set(k,[]);cells.get(k).push(item);}}
        function query(b){const [l,t,r,d]=span(b);if((r-l+1)*(d-t+1)>512)return all.filter(v=>overlaps(v.b,b)).map(v=>v.value);
            const found=new Set(large);for(let y=t;y<=d;y++)for(let x=l;x<=r;x++)for(const v of cells.get(x+','+y)||[])found.add(v);
            return [...found].filter(v=>overlaps(v.b,b)).map(v=>v.value);}
        return {add,query};
    }
    function hitBounds(s,pts){const b=pixelBounds(outline(s.tool,pts,s.width)),pad=7+(s.tool==='highlight'?s.width+10:s.width)/2;
        return {l:b.l-pad,t:b.t-pad,r:b.r+pad,b:b.b+pad};}
    function validLasso(poly){
        if(poly.length<3)return false;
        const a=poly[0],b=poly.reduce((best,p)=>Math.hypot(p[0]-a[0],p[1]-a[1])>Math.hypot(best[0]-a[0],best[1]-a[1])?p:best,a);
        const len=Math.hypot(b[0]-a[0],b[1]-a[1]);
        return len>=5&&poly.some(p=>Math.abs((b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]))/len>=3);
    }
    function lassoHit(tool,pts,width,poly){
        if(!validLasso(poly)||!pts.length)return false;
        const path=outline(tool,pts,width),a=pixelBounds(path),b=pixelBounds(poly);
        if(a.r<b.l||b.r<a.l||a.b<b.t||b.b<a.t)return false;
        for(let i=0;i<path.length;i++){
            if(inPolygon(path[i],poly))return true;
            if(i)for(let j=0;j<poly.length;j++)if(segmentsCross(path[i-1],path[i],poly[j],poly[(j+1)%poly.length]))return true;
        }return false;
    }
    // A single shared transform prevents relative spacing from changing at anchor edges.
    function transformGroup(items,dx,dy,pivot=null,k=1){
        const all=items.flatMap(s=>s.points), moved=pivot?scalePoints(all,pivot,k):translatePoints(all,dx,dy);
        let off=0;return items.map(s=>{const points=moved.slice(off,off+s.points.length);off+=s.points.length;return {...s,points};});
    }
    // v09: geometry in CSS pixels, never normalized aspect-ratio space.
    // Axis snap keeps the start point and pressure; only near-horizontal/vertical endpoints change.
    function snapAxis(points,w,h){
        if(points.length!==2||!(w>0&&h>0))return points;
        const [a,b]=points,dx=(b[0]-a[0])*w,dy=(b[1]-a[1])*h,t=Math.tan(Math.PI/12);
        if(Math.hypot(dx,dy)<12)return points;
        if(Math.abs(dy)<=Math.abs(dx)*t)return [a,[b[0],a[1],b[2]]];
        if(Math.abs(dx)<=Math.abs(dy)*t)return [a,[a[0],b[1],b[2]]];
        return points;
    }
    // Conservative one-stroke recognizer. Unknown paths remain pen strokes.
    function recognizeShape(points,w,h,axis=false){
        if(points.length<2||points.length>POINT_LIMIT||!(w>0&&h>0))return null;
        const pts=points.map(p=>[p[0]*w,p[1]*h]);
        const a=pts[0],z=pts.at(-1),dist=(p,q)=>Math.hypot(p[0]-q[0],p[1]-q[1]);
        let length=0;for(let i=1;i<pts.length;i++)length+=dist(pts[i-1],pts[i]);
        const chord=dist(a,z),b=pixelBounds(pts),bw=b.r-b.l,bh=b.b-b.t;
        const p0=points[0][2],p1=points.at(-1)[2];
        // v22: tolerate ordinary hand jitter, but reject reversals and strongly curved paths.
        const lineTol=Math.min(22,Math.max(3,chord*.085));
        if(chord>=32&&length/chord<=1.20){
            let peak=0,back=0,sum=0,maxDev=0;
            for(const p of pts){const along=((p[0]-a[0])*(z[0]-a[0])+(p[1]-a[1])*(z[1]-a[1]))/chord;
                back=Math.max(back,peak-along);peak=Math.max(peak,along);
                const d=segmentDistance(p[0],p[1],a,z);sum+=d*d;maxDev=Math.max(maxDev,d);}
            if(back<=Math.max(3,chord*.055)&&maxDev<=lineTol&&Math.sqrt(sum/pts.length)<=lineTol*.72){
            const ends=[points[0],points.at(-1)];return {tool:'line',points:axis?snapAxis(ends,w,h):ends};
            }
        }
        if(pts.length<5||Math.min(bw,bh)<22||Math.max(bw,bh)/Math.min(bw,bh)>10||chord>Math.min(36,Math.min(bw,bh)*.32))return null;
        const perimeter=2*(bw+bh),cx=(b.l+b.r)/2,cy=(b.t+b.b)/2,rx=bw/2,ry=bh/2;
        if(length<perimeter*.63||length>perimeter*1.25)return null;
        // A single traversal (no retracing / double loop / figure eight).
        let turn=0,travel=0;
        const angles=pts.map(p=>Math.atan2((p[1]-cy)/ry,(p[0]-cx)/rx));
        for(let i=1;i<angles.length;i++){const d=Math.atan2(Math.sin(angles[i]-angles[i-1]),Math.cos(angles[i]-angles[i-1]));turn+=d;travel+=Math.abs(d);}
        if(Math.abs(turn)<5.1||Math.abs(turn)>7.0||travel>7.8||travel-Math.abs(turn)>.9)return null;
        const corners=[[b.l,b.t],[b.r,b.t],[b.r,b.b],[b.l,b.b]];
        const tol=Math.min(24,Math.max(4,Math.min(bw,bh)*.15));
        const edge=p=>Math.min(Math.abs(p[0]-b.l),Math.abs(p[0]-b.r),Math.abs(p[1]-b.t),Math.abs(p[1]-b.b));
        const rect=length>=perimeter*.78&&pts.every(p=>edge(p)<=tol)&&corners.every(c=>pts.some(p=>dist(p,c)<=tol*1.65));
        const radial=pts.map(p=>Math.abs(Math.hypot((p[0]-cx)/rx,(p[1]-cy)/ry)-1));
        const ellipse=pts.length>=9&&radial.every(v=>v<=.22)&&radial.reduce((sum,v)=>sum+v,0)/radial.length<=.10;
        if(!rect&&!ellipse)return null;
        return {tool:rect?'rect':'circle',points:[[b.l/w,b.t/h,p0],[b.r/w,b.b/h,p1]]};
    }
    // v23: preserve existing highlighter alpha, width and JSON format.
    function highlightShapePoints(shape,w=1,h=1,width=3){
        const [a,b]=shape.points;
        if(shape.tool==='line')return [a,b];
        if(shape.tool==='arrow'){
            const head=arrowHead([a[0]*w,a[1]*h],[b[0]*w,b[1]*h],width);
            return [a,b,...head.map(p=>[clamp(p[0]/w),clamp(p[1]/h),b[2]])];
        }
        if(shape.tool==='rect')return [a,[b[0],a[1],a[2]],b,[a[0],b[1],b[2]],a];
        if(shape.tool==='circle'){
            const cx=(a[0]+b[0])/2,cy=(a[1]+b[1])/2,rx=(b[0]-a[0])/2,ry=(b[1]-a[1])/2;
            const pts=Array.from({length:64},(_,i)=>[clamp(cx+rx*Math.cos(i*Math.PI/32)),clamp(cy+ry*Math.sin(i*Math.PI/32)),a[2]]);
            return [...pts,pts[0]];
        }
        return shape.points;
    }
    if(typeof module==='object'   && module.exports && typeof document==='undefined') {
        module.exports={makeHistory,canDraw,samplePressure,penWidth,segmentDistance,strokeHit,sweptHit,inputSamples,inkPath,smoothPoints,pointBounds,translatePoints,scalePoints,lassoHit,inPolygon,segmentsCross,transformGroup,validLasso,defaultPresets,validatePresets,snapAxis,recognizeShape,highlightShapePoints,makeGrid,hitBounds}; return;
    }
    function init() {
        // v16: one explicit host per document; ambiguous hosts fail closed.
        if (document.documentElement.dataset.yjaConfigError) return;
        const externalNode=document.querySelector('script[type="application/json"][data-yja-config]');
        const external=externalNode?.yjaExternalConfig;
        const candidates = external?[external.host]:document.querySelectorAll('[data-yja-content]');
        if (candidates.length !== 1) { if(candidates.length>1) console.warn('YJA: exactly one host required'); return; }
        const host = candidates[0];
        if (!host || host.dataset.yjaActive || externalNode?.yjaExternalActive)
            return;
        const course = external?.course??host.dataset.yjaCourse, chapter = external?.chapter??host.dataset.yjaChapter, revision = external?.revision??host.dataset.yjaRevision;
        if (!course || !chapter || !revision) {
            console.warn('YJA: course/chapter/revision required');
            return;
        }
        const sections = external?[...external.sections]:[...host.querySelectorAll('[data-yja-anchor]')];
        const externalIds=external?new Map(sections.map(e=>[e,e.id])):null;
        const anchorId=e=>e?(externalIds?.get(e)??e.dataset.yjaAnchor):undefined;
        // v21: opt-in document-wide ink; existing integrations keep section mode.
        const PAGE_ANCHOR='__yja_page__', pageEnabled=!!external||host.dataset.yjaPageInk==='true';
        let pageMode=pageEnabled;
        const anchors = new Map(sections.map(e => [anchorId(e), e]));
        if (!sections.length || anchors.size !== sections.length || sections.some(e => !anchorId(e) || e.querySelector('[data-yja-anchor]'))) {
            console.warn('YJA: unique non-nested anchors required');
            return;
        }
        // v17: do not install an input-capturing engine if its required CSS is absent or overridden.
        // The probe is detached immediately, before modifying the content or registering handlers.
        const probe=el('div','yja-ui');
        probe.style.visibility='hidden';probe.style.pointerEvents='none';
        const probeLayer=svg('svg',{class:'yja-layer'});probe.append(probeLayer);
        document.body.append(probe);
        let cssReady=false;
        try {
            const u=getComputedStyle(probe), l=getComputedStyle(probeLayer), h=getComputedStyle(host);
            cssReady=u.getPropertyValue('--yja-css-contract').trim()==='1' && u.position==='fixed' &&
                l.position==='absolute' && l.pointerEvents==='none' && (external||['static','relative'].includes(h.position));
            if(external){const body=getComputedStyle(document.body),root=getComputedStyle(document.documentElement);
                cssReady=cssReady&&[body,root].every(x=>x.position==='static'&&x.transform==='none'&&x.perspective==='none'&&x.filter==='none'&&x.contain==='none'&&x.willChange==='auto'&&x.zoom==='1');}
        } finally { probe.remove(); }
        if(!cssReady){console.warn('YJA: missing/incompatible CSS or host positioning; annotation disabled');return;}
        // (추가) 별도 판서 공간: 기존 절을 변경하지 않고 엔진이 관리하는 예약 앵커.
        if ([...anchors.keys()].some(k=>k.startsWith(BOARD_FIRST)||k===PAGE_ANCHOR)) { console.warn('YJA: reserved board anchor'); return; }
        let boards=defaultBoards(),activeBoard=BOARD_FIRST;
        const board=el('section','yja-board'); board.dataset.yjaAnchor=activeBoard;
        board.setAttribute('aria-label','독립 판서 공간'); board.hidden=true;
        board.append(el('h2','yja-board-title','추가 판서 공간'),el('p','yja-board-help','수식 · 회로 · 타이밍 설명'),el('div','yja-board-grid'));
        const boardNav=el('div','yja-board-nav');boardNav.hidden=true;boardNav.setAttribute('role','group');boardNav.setAttribute('aria-label','백지 페이지 관리');
        // External boards live outside the original content container.
        const boardParent=external?document.body:host;
        boardParent.append(boardNav,board); sections.push(board); anchors.set(activeBoard,board);
        if(external)externalNode.yjaExternalActive=true;
        else {host.dataset.yjaActive = 'true';host.classList.add('yja-host');}
        const key = 'yja:' + JSON.stringify([course, chapter, revision]);
        // v19: authenticated pilot frame never reads/writes shared browser storage.
        const serverManaged=!!document.querySelector('#yja-server-config');
        const mem=new Map();
        const storage=serverManaged?{getItem:k=>mem.has(k)?mem.get(k):null,setItem:(k,v)=>mem.set(k,v)}:null;
        // Access browser storage lazily (blocked storage remains covered by existing try/catch).
        const store=storage||{getItem:k=>localStorage.getItem(k),setItem:(k,v)=>localStorage.setItem(k,v)};

        let layoutHidden = 0, inputMode='both', mouseMock=null, laserTimer=0, laserPoint=null;
        let navHeld=false, smooth=true, barrelErase=false, autoShape=false, axisSnap=true, highlightShape='free';
        // (추가) 출처별 프리셋 저장소. 장별 판서 저장 키와 독립.
        const presetStorageKey='yja-presets:v1';
        let presetData=defaultPresets(),presetRaw=null,presetWarning='',presetBlocked=false;
        try{presetRaw=store.getItem(presetStorageKey);if(presetRaw!==null)presetData=validatePresets(JSON.parse(presetRaw));}
        catch{presetWarning='프리셋 읽기 오류 · 임시 사용';presetBlocked=true;}
        function persistPresets(){if(presetBlocked)return;
            try{if(store.getItem(presetStorageKey)!==presetRaw){presetBlocked=true;presetWarning='다른 탭 설정 변경 · 새로고침';return;}
                const raw=JSON.stringify(presetData);store.setItem(presetStorageKey,raw);presetRaw=raw;presetWarning='';}
            catch{presetWarning='프리셋 저장 불가 · 임시 사용';}
        }
        const styleFor=k=>k==='shape'?presetData.shape:presetData.slots[presetData[k]];
        // v24: geometry uses the selected ink preset, not a surprising independent color.
        const presetKey=t=>t==='pen'||['line','arrow','rect','circle'].includes(t)?'pen':t==='highlight'?'highlight':null;
        let lastInk='pen', selected=new Set(), addSelection=false;
        const diagnostic={type:'—',raw:0,used:0,min:1,max:0,events:0,button:0,buttons:0,tiltX:0,tiltY:0};
        const historyStore=makeHistory(),{undo,redo}=historyStore;
        let strokes = [], tool = 'select', color = styleFor('pen').color, width = styleFor('pen').width, pressure = true, visible = true, live = null, saveFailed = false, dirty = false;
        // Committed stroke objects are immutable; cache only by object identity.
        const nodeCache=new Map(), jsonCache=new WeakMap();
        let saveAttempts=0,saveSuccesses=0,lastSaveMs=0;
        function serializedPayload(){const {strokes:items,...meta}=payload();return JSON.stringify(meta).slice(0,-1)+',"strokes":['+items.map(s=>{let raw=jsonCache.get(s);if(raw===undefined){raw=JSON.stringify(s);jsonCache.set(s,raw);}return raw;}).join(',')+']}';}
        const layer = svg('svg', { class: 'yja-layer', 'aria-hidden': 'true' });
        if(pageEnabled){
            layer.classList.add('yja-page-layer');document.body.append(layer);anchors.set(PAGE_ANCHOR,layer);
        }else host.append(layer);
        const ui = el('div', 'yja-ui');
        ui.dataset.yjaEdgeOpen = 'false'; // initial mount is hidden, not a closing animation
        ui.setAttribute('role', 'group');
        ui.setAttribute('aria-label', '교재 판서 도구');
        ui.dataset.dock = innerWidth <= 860 ? 'bottom' : 'right';
        document.body.append(ui);
        // 포인터로 도구를 선택한 경우에만 포커스를 해제하여 Space 탐색을 바로 사용한다.
        // 키보드로 도구를 선택한 경우에는 초점을 유지한다.
        ui.addEventListener('click',e=>{const b=e.target.closest?.('button');if(e.detail>0&&b)b.blur();});
        const buttons = new Map();
        const group = () => { const g = el('div', 'yja-group'); ui.append(g); return g; };
        function button(parent, id, label, fn) { const b = el('button'); b.type = 'button'; b.title = label; b.setAttribute('aria-label', label); const icon = svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true' }); icon.append(svg('path', { d: icons[id] || icons.more })); b.append(icon, el('small', '', label)); b.addEventListener('click', fn); parent.append(b); buttons.set(id, b); return b; }
        const topbar=el('div','yja-topbar');ui.append(topbar);
        const fold = button(topbar, 'menu', '판서 도구', () => { const collapsed = ui.dataset.collapsed !== 'true'; ui.dataset.collapsed = String(collapsed); fold.setAttribute('aria-expanded', String(!collapsed)); if (collapsed){setMore(false);setTool('select');ui.scrollTop=0;} fitFloat(); });
        fold.setAttribute('aria-expanded', 'true');
        // (추가) 도구 모음 이동은 별도 손잡이에서만 시작한다.
        const grip=el('button','yja-grip','⠿ 이동');grip.type='button';grip.setAttribute('aria-label','도구 모음 이동');grip.title='드래그 또는 방향키로 이동 · Shift+방향키: 빠르게 이동';grip.setAttribute('aria-description','방향키로 이동, Shift와 함께 누르면 빠르게 이동');topbar.append(grip);
        const modeReadout=el('div','yja-mode-readout','읽기');topbar.append(modeReadout);
        icons.compact='M4 5h16M4 12h16M4 19h16 M9 8l3 2 3-2 M9 16l3-2 3 2';
        const compactButton=button(topbar,'compact','간소화',()=>{ui.dataset.compact=String(ui.dataset.compact!=='true');compactButton.setAttribute('aria-pressed',ui.dataset.compact);compactButton.querySelector('small').textContent=ui.dataset.compact==='true'?'간소화 켜짐':'간소화';fitFloat();});
        compactButton.setAttribute('aria-pressed','false');compactButton.title='색상·굵기 빠른 설정 표시/숨김';ui.dataset.compact='false';
        let drag=null;
        function place(x,y){ui.dataset.dock='float';dock.value='float';const r=ui.getBoundingClientRect();ui.style.left=Math.max(0,Math.min(innerWidth-r.width,x))+'px';ui.style.top=Math.max(0,Math.min(window.innerHeight-r.height,y))+'px';}
        function fitFloat(){if(ui.dataset.dock==='float'){const r=ui.getBoundingClientRect();place(r.left,r.top);}}
        function setDock(v){drag=null;ui.style.left='';ui.style.top='';ui.dataset.dock=v;dock.value=v;}
        // v28: the existing grip is also a keyboard movement handle.
        grip.addEventListener('keydown',e=>{const d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(!d||e.altKey||e.ctrlKey||e.metaKey||e.isComposing)return;e.preventDefault();const r=ui.getBoundingClientRect(),step=e.shiftKey?48:12;place(r.left+d[0]*step,r.top+d[1]*step);});
        grip.addEventListener('pointerdown',e=>{if(e.button!==0)return;const r=ui.getBoundingClientRect();drag={id:e.pointerId,dx:e.clientX-r.left,dy:e.clientY-r.top};grip.setPointerCapture(e.pointerId);e.preventDefault();});
        grip.addEventListener('pointermove',e=>{if(drag?.id===e.pointerId)place(e.clientX-drag.dx,e.clientY-drag.dy);});
        for(const event of ['pointerup','pointercancel','lostpointercapture'])grip.addEventListener(event,e=>{if(drag?.id===e.pointerId)drag=null;});
        const g = group();
        button(g, 'select', '읽기', () => setTool('select'));
        button(g, 'pen', '펜', () => setTool('pen'));
        button(g, 'highlight', '형광펜', () => setTool('highlight'));
        button(g, 'eraser', '지우개', () => toggleTransient('eraser')).title='지우개 · 다시 누르면 자유 필기 복귀';
        icons.fullscreen='M3 9V3h6 M15 3h6v6 M21 15v6h-6 M9 21H3v-6';icons.diagnostic='M3 12h4l3-7 4 14 3-7h4';
        icons.laser='M12 2v4M12 18v4M2 12h4M18 12h4 M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8';
        button(g, 'laser', '포인터', () => toggleTransient('laser')).title='포인터 · 다시 누르면 자유 필기 복귀';
        icons.input='M3 8h10v12H3z M8 8v5 M15 15l5-10 2 1-5 10-3 2z';
        const modeButton=button(g,'input','펜+마우스',()=>{finish(false); inputMode=inputMode==='both'?'pen':'both';refresh();});
        modeButton.title='입력 방식: 펜과 마우스로 판서 / 펜만 판서하고 마우스로 탐색';
        icons.edit='M3 3h6 M3 3v6 M21 3h-6 M21 3v6 M3 21h6 M3 21v-6 M21 21h-6 M21 21v-6 M9 12h6 M12 9v6';
        button(g,'edit','편집',()=>toggleTransient('edit')).title='편집 · 다시 누르면 자유 필기 복귀';
        icons.lasso='M18 15c4-2 4-9-2-11C8 1 1 6 3 12c1 4 6 5 10 4 M13 16c-5 0-5 6-1 5 3-1 1-5 1-5';
        button(g,'lasso','올가미',()=>toggleTransient('lasso')).title='올가미 · 다시 누르면 자유 필기 복귀';
        // (추가) 즐겨찾기: 도구 및 스타일을 동시에 전환한다.
        let pageButton=null;
        if(pageEnabled){const scopeGroup=group();scopeGroup.classList.add('yja-scope-group');
            icons.pageScope='M3 3h18v18H3z M7 7h10v10H7z';
            pageButton=button(scopeGroup,'pageScope','전체 판서',()=>{finish(false);clearLaser();selected.clear();pageMode=!pageMode;render();});
            pageButton.title='전체 페이지 판서 / 절별 판서 전환';
        }
        // v22: drawing aids visible directly; normal pen stays unmodified by default.
        const shapeGroup=group();shapeGroup.classList.add('yja-shape-group');
        icons.autoShape='M3 17l5-5 4 4 9-11 M15 5h6v6';icons.axisSnap='M3 20h18 M4 20V3 M7 14h7v-7';
        const autoButton=button(shapeGroup,'autoShape','자동 도형',()=>shapeTool('auto'));
        autoButton.title='현재 펜 또는 형광펜: 직선·사각형·타원 자동 보정 / 자유 필기 전환';
        const axisButton=button(shapeGroup,'axisSnap','축 정렬',()=>{finish(false);axisSnap=!axisSnap;refresh();});
        axisButton.title='수평·수직에 가까운 직선과 화살표를 정확히 정렬 (±15°)';
        // v24: one state transition for every geometry button, including keyboard activation.
        const shapeNames={auto:'자동 도형',line:'직선',rect:'사각형',arrow:'화살표',circle:'타원'};
        function shapeMode(){return tool==='highlight'?highlightShape:tool==='pen'&&autoShape?'auto':['line','rect','arrow','circle'].includes(tool)?tool:'free';}
        function shapeTool(t){
            const medium=tool==='highlight'||(!presetKey(tool)&&lastInk==='highlight')?'highlight':'pen';
            if(shapeMode()===t){setTool(medium);return;}
            if(medium==='highlight'||t==='auto')setTool(medium,t);else setTool(t);
        }
        button(shapeGroup,'line','직선',()=>shapeTool('line')).title='현재 펜 또는 형광펜으로 직선 그리기 · 다시 누르면 해제';
        button(shapeGroup,'rect','사각형',()=>shapeTool('rect')).title='현재 펜 또는 형광펜으로 사각형 그리기 · 다시 누르면 해제';
        const pg=group();pg.classList.add('yja-sep');pg.classList.add('yja-presets');
        const presetButtons=[];
        for(let i=0;i<4;i++){
            const b=el('button','yja-preset');b.type='button';b.setAttribute('aria-label','프리셋 '+(i+1));
            const sample=svg('svg',{viewBox:'0 0 36 18','aria-hidden':'true'});
            const mark=svg('path',{d:'M4 12 Q12 3 20 10 T32 7'});sample.append(mark);
            const label=el('small','','');b.append(sample,label);b.addEventListener('click',()=>choosePreset(i));pg.append(b);presetButtons.push({b,mark,label});
        }
        const presetStatus=el('div','yja-preset-status','');presetStatus.setAttribute('role','status');pg.append(presetStatus);
        function choosePreset(i){if(!Number.isInteger(i)||i<0||i>=4)return;const k=slotTypes[i];if(presetData[k]!==i){presetData[k]=i;persistPresets();}setTool(k);}
        function changeStyle(patch){finish(false);Object.assign(styleFor(presetKey(tool)||lastInk),patch);({color,width}=styleFor(presetKey(tool)||lastInk));persistPresets();refresh();}
        function refreshPresets(){for(let i=0;i<4;i++){const {b,mark,label}=presetButtons[i],v=presetData.slots[i],k=slotTypes[i];
            b.setAttribute('aria-pressed',String(presetKey(tool)===k&&presetData[k]===i&&!navHeld&&visible));b.title=`${i+1}번 ${k==='pen'?'펜':'형광펜'} · ${v.color} · ${v.width}px`;
            label.textContent=(i+1)+' '+(k==='pen'?'펜':'형광')+' '+v.width;
            mark.setAttribute('style',`stroke:${v.color};stroke-width:${k==='highlight'?Math.min(v.width+3,12):Math.min(v.width,8)};stroke-opacity:${v.opacity??defaultOpacity(k)};fill:none`);
        }presetStatus.textContent=presetWarning||'1–4 빠른 전환';presetStatus.dataset.warn=String(!!presetWarning);}
        const cg = group();
        cg.classList.add('yja-sep');cg.classList.add('yja-style-group');
        const sw = el('div', 'yja-swatches');
        cg.append(sw);
        const colorButtons = [];
        for (const c of colors) {
            const b = el('button');
            b.type = 'button';
            b.title = c;
            b.setAttribute('aria-label', '색상 ' + c);
            const dot = el('i');
            dot.style.background = c;
            b.append(dot);
            b.addEventListener('click', () => { changeStyle({color:c}); });
            sw.append(b);
            colorButtons.push([c, b]);
        }
        // v39: choose any RGB color and per-preset opacity, without changing existing strokes.
        const customColor=el('input');customColor.type='color';customColor.setAttribute('aria-label','사용자 지정 색상');customColor.title='사용자 지정 색상';
        const customLabel=el('label','yja-custom-color','색상');customLabel.append(customColor);cg.append(customLabel);
        customColor.addEventListener('change',()=>{if(validColor(customColor.value))changeStyle({color:customColor.value});});
        const opacityLabel=el('label','yja-opacity-label','');const opacityRange=el('input');opacityRange.type='range';opacityRange.min='10';opacityRange.max='100';opacityRange.step='5';opacityRange.setAttribute('aria-label','불투명도');
        const opacityText=el('span');opacityLabel.append(opacityText,opacityRange);cg.append(opacityLabel);
        opacityRange.addEventListener('input',()=>{const v=Number(opacityRange.value)/100;if(validOpacity(v))changeStyle({opacity:v});});
        // (추가) 자주 쓰는 굵기를 별도 메뉴 진입 없이 선택한다.
        const widths=el('div','yja-widths');cg.append(widths);const widthButtons=[];
        for(const n of [1,2,3,4,6,8]){const b=el('button','',String(n));b.type='button';b.setAttribute('aria-label','굵기 '+n+' px');b.addEventListener('click',()=>setWidth(n));widths.append(b);widthButtons.push([n,b]);}
        const ug = group();ug.classList.add('yja-history-group');
        ug.classList.add('yja-sep');
        button(ug, 'undo', '취소', () => history(false));
        button(ug, 'redo', '복원', () => history(true));
        button(ug, 'eye', '숨김', () => { finish(false); clearLaser(); visible = !visible; if (!visible)
            setTool('select'); refresh(); });
        const mg = group();mg.classList.add('yja-action-group');
        button(mg, 'more', '더보기', e => setMore(more.hidden,e.detail===0));
        buttons.get('more').setAttribute('aria-expanded', 'false');
        const more = el('div', 'yja-more');
        more.hidden = true;
        ui.append(more);
        // v28: reveal the existing menu locally, without scrolling the lesson.
        function setMore(open,keyboard=false){
            const trigger=buttons.get('more'),returnFocus=!open&&more.contains(document.activeElement);
            more.hidden=!open;trigger.setAttribute('aria-expanded',String(open));fitFloat();
            if(open){const first=more.querySelector('button');if(first){
                if(keyboard)first.focus({preventScroll:true});
                const r=first.getBoundingClientRect(),u=ui.getBoundingClientRect(),h=topbar.getBoundingClientRect();
                const top=Math.max(u.top,h.bottom)+4,bottom=u.bottom-8;
                if(r.top<top||r.bottom>bottom)ui.scrollTop+=r.top-top;
            }}else if(returnFocus){trigger.focus({preventScroll:true});}
        }
        for (const [id, label] of [['arrow', '화살표'], ['circle', '타원']])
            button(more, id, label, () => shapeTool(id)).title=label+' 그리기 · 다시 누르면 해제';
        const shapeHelp=el('div','yja-help','자동 도형: 한 획을 그리고 놓으면 직선·사각형·타원 보정. 취소 1회로 원래 획, 2회로 제거. 축 정렬: 수평·수직 ±15° 이내. 활성 도형을 다시 누르거나 Esc를 누르면 자유 필기 복귀.');more.append(shapeHelp);
        const wl = el('label', '', '굵기 3');
        const range = el('input');
        range.type = 'range';
        range.min = '1';
        range.max = '12';
        range.value = '3';
        range.setAttribute('aria-label', '펜 굵기');
        function setWidth(n){if(Number.isInteger(n)&&n>=1&&n<=12)changeStyle({width:n});}
        range.oninput = () => setWidth(Number(range.value));
        more.append(wl, range);
        const pl = el('label');
        const pc = el('input');
        pc.type = 'checkbox';
        pc.checked = true;
        pc.onchange = () => { finish(false);pressure = pc.checked; };
        pl.append(pc, document.createTextNode(' 필압'));
        more.append(pl);
        const toggleSetting=(label,checked,fn)=>{const l=el('label','yja-setting');const c=el('input');c.type='checkbox';c.checked=checked;c.onchange=()=>{finish(false);fn(c.checked);};l.append(c,document.createTextNode(' '+label));more.append(l);return c;};
        toggleSetting('필기 부드럽게',true,v=>smooth=v);
        toggleSetting('펜 측면 버튼 지우개 (실험)',false,v=>barrelErase=v);
        toggleSetting('올가미 선택 추가',false,v=>addSelection=v);
        button(more,'deleteSelection','선택 삭제',()=>deleteSelection());
        button(more,'resetPresets','펜 설정 초기화',()=>{if(!confirm('펜 1~4와 도형 설정만 초기화할까요? 기존 판서는 유지됩니다.'))return;finish(false);presetData=defaultPresets();
            // (추가) 명시적 초기화에서만 손상된 설정을 대체한다.
            try{presetRaw=store.getItem(presetStorageKey);presetBlocked=false;presetWarning='';persistPresets();}catch{presetBlocked=true;presetWarning='프리셋 저장 불가 · 임시 사용';}
            ({color,width}=styleFor(presetKey(tool)||lastInk));refresh();});
        const help=el('div','yja-help','1~4 즐겨찾기 · P 펜 · H 형광펜 · E 지우개 · V 편집 · A 올가미 · R 읽기 · L 포인터 · G 자동 도형 · I 직선 · B 사각형 · J 화살표 · O 타원 · Space 일시 탐색 · Esc 취소/도형 해제/읽기');more.append(help);
        const shortcuts={p:'pen',r:'select',e:'eraser',h:'highlight',l:'laser',v:'edit',a:'lasso'};
        const shapeShortcuts={g:'auto',i:'line',b:'rect',j:'arrow',o:'circle'};
        for(const [k,t] of [...Object.entries(shortcuts),...Object.entries(shapeShortcuts)]){const b=buttons.get(t==='auto'?'autoShape':t);b.setAttribute('aria-keyshortcuts',k.toUpperCase());b.title+=' · '+k.toUpperCase()+' 키';}
        const dock = el('select');
        dock.setAttribute('aria-label', '도구 위치');
        for (const [v, t] of [['right', '오른쪽'], ['left', '왼쪽'], ['bottom', '아래쪽'], ['float','자유 이동']]) {
            const o = el('option', '', t);
            o.value = v;if(v==='float')o.disabled=true;
            dock.append(o);
        }
        dock.value = ui.dataset.dock;
        dock.onchange = () => setDock(dock.value);
        more.append(dock);
        icons.board='M3 4h18v14H3z M8 22l4-4 4 4';
        // v25: opening an auxiliary board must not invalidate the chapter's coordinate basis.
        let boardReturn=null,boardPageBasis=null;
        const boardButton=button(mg,'board','백지',()=>{
            finish(false);clearLaser();selected.clear();
            if(board.hidden){
                boardReturn={x:window.scrollX,y:window.scrollY};
                if(pageEnabled)boardPageBasis={height:physicalPageRect().height,end:lessonEnd()};
                board.hidden=false;boardNav.hidden=false;
                boardNav.scrollIntoView({block:'start'});if(tool==='select')setTool(lastInk);
            }else{
                board.hidden=true;boardNav.hidden=true;boardPageBasis=null;
                if(boardReturn&&typeof window.scrollTo==='function')window.scrollTo(boardReturn.x,boardReturn.y);
                boardReturn=null;
            }
            boardButton.setAttribute('aria-pressed',String(!board.hidden));render();schedule();
        });
        // 페이지 관리 UI는 판서 앵커 밖에 배치한다.
        const boardLabel=el('strong','yja-board-count');boardLabel.setAttribute('aria-live','polite');boardNav.append(boardLabel);
        const pageSelect=el('select');pageSelect.setAttribute('aria-label','백지 페이지');boardNav.append(pageSelect);
        const navButton=(label,fn)=>{const b=el('button','',label);b.type='button';b.setAttribute('aria-label',label);b.addEventListener('click',fn);boardNav.append(b);return b;};
        const prevBoard=navButton('이전 백지',()=>switchBoard(boards[boards.findIndex(b=>b.id===activeBoard)-1]?.id));
        const nextBoard=navButton('다음 백지',()=>switchBoard(boards[boards.findIndex(b=>b.id===activeBoard)+1]?.id));
        const addBoard=navButton('새 백지',()=>{if(boards.length>=BOARD_LIMIT)return;const id=BOARD_FIRST+':'+(globalThis.crypto?.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2));let n=1;while(boards.some(b=>b.name==='백지 '+n))n++;commit(strokes,[...boards,{id,name:'백지 '+n}],id);});
        const pageName=el('input');pageName.type='text';pageName.maxLength=60;pageName.setAttribute('aria-label','백지 이름');boardNav.append(pageName);
        const renameBoard=navButton('이름 변경',()=>{const name=pageName.value.trim();if(!name||name.length>60||/[\x00-\x1f\x7f]/.test(name)){boardLabel.textContent='이름은 1~60자';return;}if(name===boards.find(b=>b.id===activeBoard).name)return;commit(strokes,boards.map(b=>b.id===activeBoard?{...b,name}:b));});
        const deleteBoard=navButton('백지 삭제',()=>{if(boards.length<=1)return;const i=boards.findIndex(b=>b.id===activeBoard),id=activeBoard;if(!confirm('이 백지와 해당 판서를 삭제할까요? 실행 취소할 수 있습니다.'))return;const next=boards.filter(b=>b.id!==id);commit(strokes.filter(s=>s.anchor!==id),next,next[Math.min(i,next.length-1)].id);});
        pageSelect.onchange=()=>switchBoard(pageSelect.value);
        pageName.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing&&e.keyCode!==229){e.preventDefault();renameBoard.click();}});
        function syncBoard(){for(const k of [...anchors.keys()])if(isBoardId(k))anchors.delete(k);board.dataset.yjaAnchor=activeBoard;anchors.set(activeBoard,board);
            const i=boards.findIndex(b=>b.id===activeBoard);pageSelect.replaceChildren(...boards.map((b,j)=>{const o=el('option','',`${j+1}. ${b.name}`);o.value=b.id;return o;}));pageSelect.value=activeBoard;pageName.value=boards[i].name;boardLabel.textContent=`백지 ${i+1} / ${boards.length}`;prevBoard.disabled=i===0;nextBoard.disabled=i===boards.length-1;addBoard.disabled=boards.length>=BOARD_LIMIT;deleteBoard.disabled=boards.length<=1;
        }
        function switchBoard(id){if(id===activeBoard||!boards.some(b=>b.id===id))return;finish(false);clearLaser();selected.clear();activeBoard=id;syncBoard();save();render();schedule();}
        boardButton.setAttribute('aria-pressed','false');
        icons.output='M7 8V3h10v5 M7 17H4V9h16v8h-3 M7 14h10v7H7z M16 11h1';
        button(mg,'output','출력',()=>openOutput());
        button(more,'fullscreen','전체 화면',async()=>{try{if(document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen();}catch(e){status('전체 화면 제한 · 브라우저 F11 사용',true);}});
        document.addEventListener('fullscreenchange',()=>{const b=buttons.get('fullscreen'),name=document.fullscreenElement?'전체 해제':'전체 화면';b.querySelector('small').textContent=name;b.setAttribute('aria-label',name);});
        const diagButton=button(more,'diagnostic','입력 진단',()=>{panel.hidden=!panel.hidden;diagButton.setAttribute('aria-expanded',String(!panel.hidden)); updateDiag();});
        diagButton.setAttribute('aria-expanded','false');
        const panel=el('div','yja-diagnostic');panel.hidden=true;document.body.append(panel);
        const dt=el('div','yja-diag-title','입력 장치 진단');const dc=el('button','','닫기');dc.type='button';dc.onclick=()=>{panel.hidden=true;diagButton.setAttribute('aria-expanded','false');};dt.append(dc);panel.append(dt);
        const dr=el('pre','yja-diag-readout');panel.append(dr);
        const mockLabel=el('label');const mock=el('input');mock.type='checkbox';mockLabel.append(mock,document.createTextNode(' 마우스 필압 모의 시험'));panel.append(mockLabel);
        const mockRange=el('input');mockRange.type='range';mockRange.min='0';mockRange.max='100';mockRange.value='50';mockRange.setAttribute('aria-label','모의 필압');mockRange.disabled=true;panel.append(mockRange);
        const mockText=el('div','','모의 필압: 꺼짐');panel.append(mockText);
        const mockUpdate=()=>{mouseMock=mock.checked?Number(mockRange.value)/100:null;mockRange.disabled=!mock.checked;mockText.textContent=mouseMock===null?'모의 필압: 꺼짐':'모의 필압: '+mouseMock.toFixed(2)+' (실제 펜 아님)';};mock.onchange=mockUpdate;mockRange.oninput=mockUpdate;
        const resetDiag=el('button','','측정 초기화');resetDiag.type='button';resetDiag.onclick=()=>{Object.assign(diagnostic,{type:'—',raw:0,used:0,min:1,max:0,events:0,button:0,buttons:0,tiltX:0,tiltY:0});updateDiag();};panel.append(resetDiag);
        function updateDiag(){if(panel.hidden)return;dr.textContent=`장치: ${diagnostic.type}
원시 필압: ${diagnostic.raw.toFixed(3)}
적용 필압: ${diagnostic.used.toFixed(3)}
범위: ${diagnostic.events?diagnostic.min.toFixed(3)+' ~ '+diagnostic.max.toFixed(3):'—'}
이벤트: ${diagnostic.events}
button/buttons: ${diagnostic.button}/${diagnostic.buttons}
기울기 X/Y: ${diagnostic.tiltX}/${diagnostic.tiltY}
입력: ${inputMode==='both'?'펜+마우스':'펜만 판서'}`;}
        function recordInput(e,p,refreshNow=true){const type=e.pointerType||'unknown';if(diagnostic.type!==type){diagnostic.min=1;diagnostic.max=0;diagnostic.events=0;}Object.assign(diagnostic,{type,raw:Number(e.pressure)||0,used:p,button:e.button,buttons:e.buttons,tiltX:e.tiltX||0,tiltY:e.tiltY||0});diagnostic.min=Math.min(diagnostic.min,p);diagnostic.max=Math.max(diagnostic.max,p);diagnostic.events++;if(refreshNow)updateDiag();}
        function downloadRaw(raw,suffix=''){const b=new Blob([raw],{type:'application/json'}),u=URL.createObjectURL(b),a=el('a');a.href=u;a.download='판서-'+chapter.replace(/[^\w-]/g,'_')+suffix+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
        button(more, 'export', '내보내기', () => downloadRaw(serializedPayload()));
        const file = el('input');
        file.type = 'file';
        file.accept = '.json,application/json';
        file.hidden = true;
        more.append(file);
        button(more, 'import', '불러오기', () => file.click());
        file.onchange = async () => { try {
            const f = file.files[0];
            if (!f)
                return;
            if (f.size > 15e6)
                throw Error('파일이 너무 큽니다');
            const before=strokes,beforeBoards=boards,beforeActive=activeBoard;
            const next = validate(JSON.parse(await f.text()));
            if(live||before!==strokes||beforeBoards!==boards||beforeActive!==activeBoard)throw Error('읽는 동안 판서가 변경되었습니다. 다시 불러오세요.');
            if (!confirm('이 장의 현재 판서를 가져온 데이터로 교체할까요?'))
                return;
            // Only a known corrupt startup record is replaceable; never overwrite another tab.
            if(corruptRaw!==null&&storageBlocked){
                if(!confirm('오류 원본을 별도 보존하고 복구할까요?'))return;
                const archive=key+':recovery';
                if(store.getItem(key)!==corruptRaw)throw Error('다른 탭에서 변경된 원본 · 복구 중단');
                const previous=store.getItem(archive);
                if(previous!==null&&previous!==corruptRaw)throw Error('기존 복구 원본 존재 · 오류 원본 백업 후 별도 확인 필요');
                store.setItem(archive,corruptRaw);
                if(store.getItem(archive)!==corruptRaw||store.getItem(key)!==corruptRaw)throw Error('오류 원본 보존 확인 실패 · 복구 중단');
                storageBlocked=false;
            }
            commit(next.strokes,next.boards,next.activeBoard);
            if(!saveFailed){corruptRaw=null;refreshRecovery();status('가져오기 완료');}
        }
        catch (e) {
            status('가져오기 실패: ' + e.message, true);
        }
        finally {
            file.value = '';
        } };
        button(more, 'trash', '전체 삭제', () => { if (strokes.length && confirm('이 장의 판서를 모두 삭제할까요? 실행 취소가 가능합니다.'))
            commit([]); });
        // v12: compact recovery actions remain visible even while folded.
        const recovery=el('div','yja-recovery');recovery.hidden=true;ui.append(recovery);
        const recoveryText=el('div','yja-recovery-text');recoveryText.setAttribute('role','alert');recovery.append(recoveryText);
        const retry=button(recovery,'retrySave','저장 재시도',()=>{save();refresh();});
        button(recovery,'backupNow','긴급 백업',()=>buttons.get('export').click());
        const rawBackup=button(recovery,'rawBackup','오류 원본 백업',()=>{if(corruptRaw!==null)downloadRaw(corruptRaw,'-오류원본');});
        const sessionInfo=el('div','yja-help yja-session-info');more.append(sessionInfo);
        const info = el('div', 'yja-status', '읽기');
        info.setAttribute('role', 'status');
        ui.append(info);
        // v40: frequent style controls first; keep DOM and keyboard navigation in the same order.
        cg.classList.remove('yja-sep');
        cg.prepend(widths);
        ui.insertBefore(cg,g);
        g.classList.add('yja-primary-group');
        const utilityGroup=el('div','yja-group yja-utility-group');
        for(const id of ['laser','input','edit','lasso'])utilityGroup.append(buttons.get(id));
        ui.insertBefore(ug,shapeGroup);
        ui.insertBefore(utilityGroup,mg);
        if(pageButton)ui.insertBefore(pageButton.parentElement,mg);
        more.prepend(compactButton);
        fold.querySelector('small').textContent='도구';
        autoButton.querySelector('small').textContent='자동';
        axisButton.querySelector('small').textContent='정렬';
        function status(t, w = false) { info.textContent = t; info.dataset.warn = String(w); }
        function refreshRecovery(){recovery.hidden=!saveFailed;retry.disabled=storageBlocked;rawBackup.hidden=corruptRaw===null;recoveryText.textContent=storageBlocked?(corruptRaw!==null?'오류 원본 백업 · 정상 JSON 불러오기 가능':'저장 충돌/읽기 오류 · 백업 후 새로고침'):'저장 실패 · 재시도 또는 백업';}
        function payload() { return { schema: SCHEMA, course, chapter, revision, strokes, boards, activeBoard }; }
        function validate(o) { if (!o || o.schema !== SCHEMA || o.course !== course || o.chapter !== chapter || o.revision !== revision || !Array.isArray(o.strokes) || o.strokes.length > LIMIT)
            throw Error('스키마 또는 교재/장/개정 ID 불일치'); const pageData=validateBoards(o.boards,o.activeBoard),validBoardIds=new Set(pageData.boards.map(b=>b.id)); let total = 0; const ids = new Set(); const validated=o.strokes.map(s => { if (!s || typeof s.id !== 'string' || s.id.length > 100 || ids.has(s.id) || !(isBoardId(s.anchor)?validBoardIds.has(s.anchor):anchors.has(s.anchor)) || !drawTools.includes(s.tool) || !validColor(s.color) || (s.opacity!==undefined&&!validOpacity(s.opacity)) || !Number.isFinite(s.width) || s.width < 1 || s.width > 12 || !Array.isArray(s.layout) || s.layout.length < 2 || s.layout.length > 100 || !s.layout.every(Number.isFinite) || !Array.isArray(s.points) || !s.points.length || s.points.length > POINT_LIMIT || (total += s.points.length) > TOTAL_POINTS || (!['pen', 'highlight'].includes(s.tool) && s.points.length !== 2))
            throw Error('잘못된 판서 데이터'); ids.add(s.id); return { id: s.id, anchor: s.anchor, tool: s.tool, color: s.color, width: s.width, ...(s.opacity===undefined?{}:{opacity:s.opacity}), layout: s.layout.slice(), smooth: s.smooth === true, points: s.points.map(p => { if (!Array.isArray(p) || p.length !== 3 || !p.every(Number.isFinite) || p[0] < 0 || p[0] > 1 || p[1] < 0 || p[1] > 1 || p[2] < 0 || p[2] > 1)
                throw Error('잘못된 좌표'); return p.slice(); }) }; }); return {...pageData,strokes:validated}; }
        // v12: retain the exact loaded value; never silently replace a changed or corrupt record.
        let storedRaw = null, corruptRaw = null;
        try {
            const raw = store.getItem(key); storedRaw = raw;
            if (raw !== null){try{const loaded=validate(JSON.parse(raw));({strokes,boards,activeBoard}=loaded);}catch(e){corruptRaw=raw;throw e;}}
            syncBoard();
        }
        catch (e) {
            saveFailed = true;
            status('저장소/기존 데이터 오류 · 내보내기 권장', true);
        }
        let storageBlocked = saveFailed;
        if(storageBlocked)syncBoard();
        function save() { dirty = true; if (storageBlocked) {
            saveFailed = true;
            return;
        } const started=globalThis.performance?.now?.()??Date.now();saveAttempts++;try {
            if (store.getItem(key) !== storedRaw) { storageBlocked = true; saveFailed = true; return; }
            const raw = serializedPayload();
            store.setItem(key, raw); storedRaw = raw;
            // Read back to detect an immediate conflicting write; not atomic across tabs.
            if(store.getItem(key)!==raw){storageBlocked=true;saveFailed=true;return;}
            saveSuccesses++;dirty = false;corruptRaw=null;
            saveFailed = false;
        }
        catch (e) {
            saveFailed = true;
        } finally {lastSaveMs=(globalThis.performance?.now?.()??Date.now())-started;if(serverManaged)window.dispatchEvent(new Event('yja-server-change'));} }
        // Retry only unsaved committed data. Never recreate an externally changed record.
        function flushPending(){if(dirty&&!storageBlocked){save();refresh();}}
        function snapshot(){return {strokes,boards,activeBoard};}
        function commit(next,nextBoards=boards,nextActive=activeBoard) { const pageChange=nextBoards!==boards||nextActive!==activeBoard;if(pageChange){finish(false);clearLaser();selected.clear();}historyStore.record(snapshot()); strokes = next; boards=nextBoards;activeBoard=nextActive;if(pageChange)syncBoard();save(); render(); }
        function history(forward) { finish(false);clearLaser(); selected.clear(); const prev=historyStore.step(forward,snapshot());if(!prev){render();return;}({strokes,boards,activeBoard}=prev);syncBoard();save(); render(); }
        // v24: transient tool re-selection returns to the most recent free ink.
        function toggleTransient(t){setTool(tool===t?lastInk:t);}
        function setTool(t,mode='free') { if(t!=='select'&&ui.dataset.collapsed==='true'){ui.dataset.collapsed='false';fold.setAttribute('aria-expanded','true');} finish(false); clearLaser(); navHeld=false; if(!(['edit','lasso'].includes(tool)&&['edit','lasso'].includes(t)))selected.clear(); tool = t; autoShape=t==='pen'&&mode==='auto';highlightShape=t==='highlight'?mode:'free'; drawSelection();
            const k=presetKey(t);if(k){lastInk=k;({color,width}=styleFor(k));}
            if (t !== 'select') visible = true; refresh(); fitFloat(); }
        function setNavigation(v){if(navHeld===v)return;finish(false);clearLaser();navHeld=v;drawSelection();refresh();}
        function refresh() { if(pageButton){pageButton.querySelector('small').textContent=pageMode?'전체 판서':'절별 판서';pageButton.setAttribute('aria-label',pageMode?'전체 판서':'절별 판서');pageButton.setAttribute('aria-pressed',String(pageMode));document.body.classList.toggle('yja-page-drawing',tool!=='select'&&visible&&!navHeld);document.body.classList.toggle('yja-page-pen-only',inputMode==='pen');} const hs=historyStore.stats();sessionInfo.textContent=`이력 ${hs.undo}/${hs.redo} · 보존 좌표 ${hs.points.toLocaleString('ko-KR')}/300,000 · 오래된 이력 정리 ${hs.evicted}회 · 저장 ${saveSuccesses}/${saveAttempts} · ${lastSaveMs.toFixed(1)}ms`; modeReadout.textContent=!visible?'판서 숨김':navHeld?'일시 탐색':tool==='select'?'읽기 모드':(tool==='pen'&&autoShape?'자동 도형':tool==='highlight'&&highlightShape!=='free'?'형광펜 · '+shapeNames[highlightShape]:buttons.get(tool).getAttribute('aria-label'))+' · '+(inputMode==='pen'?'펜만':'펜+마우스');modeReadout.dataset.active=String(tool!=='select'&&visible&&!navHeld); refreshRecovery(); buttons.get('autoShape').setAttribute('aria-pressed',String(autoShape&&tool==='pen'||tool==='highlight'&&highlightShape==='auto'));buttons.get('axisSnap').setAttribute('aria-pressed',String(axisSnap));refreshPresets(); const currentOpacity=styleFor(presetKey(tool)||lastInk).opacity??defaultOpacity(presetKey(tool)||lastInk);customColor.value=color;opacityRange.value=String(Math.round(currentOpacity*100));opacityText.textContent='불투명도 '+Math.round(currentOpacity*100)+'%'; range.value=String(width);wl.textContent='굵기 '+width; for(const [n,b] of widthButtons)b.setAttribute('aria-pressed',String(n===width)); if(!external){host.classList.toggle('yja-drawing', tool !== 'select' && visible && !navHeld); host.classList.toggle('yja-pen-only',inputMode==='pen');} modeButton.querySelector('small').textContent=inputMode==='both'?'혼합':'펜만';modeButton.setAttribute('aria-pressed',String(inputMode==='pen'));modeButton.setAttribute('aria-label',inputMode==='both'?'펜+마우스':'펜만 판서'); updateDiag(); layer.toggleAttribute('hidden', !visible); for (const t of ['select', 'edit', 'lasso', 'eraser', 'laser', ...drawTools])
            buttons.get(t).setAttribute('aria-pressed', String((t === tool && !(t==='pen'&&autoShape))||(tool==='highlight'&&['line','rect','arrow','circle'].includes(t)&&highlightShape===t))); buttons.get('eye').setAttribute('aria-pressed', String(!visible)); for (const [c, b] of colorButtons)
            b.setAttribute('aria-pressed', String(c === color)); buttons.get('undo').disabled = !undo.length; buttons.get('redo').disabled = !redo.length; buttons.get('deleteSelection').disabled=!selected.size||!visible||navHeld; const name = buttons.get(tool).textContent; status(saveFailed ? '저장 불가 · JSON 내보내기' : (!visible ? '판서 숨김' : navHeld ? '일시 탐색 · Space 해제' : name + ' · ' + strokes.length + '개' + (autoShape&&tool==='pen'?' · 자동 도형':tool==='highlight'&&highlightShape!=='free'?' · '+shapeNames[highlightShape]:'') + (axisSnap&&(autoShape&&tool==='pen'||['line','arrow'].includes(tool)||tool==='highlight'&&['auto','line','arrow'].includes(highlightShape))?' · 축 정렬':'') + (['edit','lasso'].includes(tool) ? (selected.size?' · 선택 '+selected.size+'개':tool==='lasso'?' · 영역 그리기':' · 획 선택'):'') + (layoutHidden ? ' · 배치 변경 숨김 ' + layoutHidden : '')), saveFailed || layoutHidden > 0); }
        function physicalPageRect(){const r=document.body.getBoundingClientRect();return {left:-window.scrollX,top:-window.scrollY,width:document.documentElement.clientWidth,height:Math.max(document.documentElement.clientHeight,Math.ceil(r.bottom+window.scrollY))};}
        function lessonEnd(){return Math.max(0,...sections.filter(e=>e!==board).map(e=>e.getBoundingClientRect().bottom+window.scrollY));}
        function pageRect(){const r=physicalPageRect();if(boardPageBasis&&!board.hidden)r.height=Math.max(document.documentElement.clientHeight,Math.round(boardPageBasis.height+lessonEnd()-boardPageBasis.end));return r;}
        // SVG covers the auxiliary board too; chapter ink retains its original logical extent.
        function syncPageLayer(){if(pageEnabled){const r=physicalPageRect();layer.style.width=r.width+'px';layer.style.height=r.height+'px';}}
        function rectOf(a){return a===PAGE_ANCHOR?pageRect():anchors.get(a).getBoundingClientRect();}
        function geometry(anchor) { const h = pageEnabled?pageRect():layer.getBoundingClientRect(), r = rectOf(anchor); return { x: r.left - h.left, y: r.top - h.top, w: r.width, h: r.height }; }
        function localPoint(e, a, previous=null, ending=false,r=rectOf(a),refreshNow=true) { const p = samplePressure(e.pointerType,e.pressure,pressure,mouseMock,previous,ending); recordInput(e,p,refreshNow); return [clamp((e.clientX - r.left) / Math.max(r.width, 1)), clamp((e.clientY - r.top) / Math.max(r.height, 1)), p]; }
        function protectedTarget(e){return !!e.target?.closest?.('.yja-ui,.yja-diagnostic,.yja-board-nav,.yja-output-dialog,.yja-sync-panel,nav,button,input,select,textarea,a,summary,[contenteditable=true]'+(external?',label,[contenteditable],[role=button],[role=link],[role=checkbox],[role=menuitem],[role=tab],[role=slider],[role=textbox]':''));}
        function anchorAt(e) { const section=anchorId(sections.find(a => { const r = a.getBoundingClientRect(); return r.width > 0 && r.height > 0 && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; })); if(isBoardId(section))return section; if(pageEnabled&&pageMode){const r=pageRect();if(e.clientX>=r.left&&e.clientX<=r.left+r.width&&e.clientY>=r.top&&e.clientY<=r.top+r.height)return PAGE_ANCHOR;} return section; }
        // Layout signature: fail closed rather than place a mark over the wrong text.
        function layoutOf(a) {
            if(a!==PAGE_ANCHOR)return layoutOfElement(anchors.get(a));
            const r=pageRect();let h1=2166136261,h2=0x9e3779b9;
            const mix=v=>{v=Math.round(v)|0;h1=Math.imul(h1^v,16777619);h2=Math.imul(h2^v,2246822519);};
            for(const e of sections.filter(e=>e!==board)){const q=e.getBoundingClientRect();for(const v of [q.left-r.left,q.top-r.top,...layoutOfElement(e)])mix(v);}
            return [r.width,r.height,-21,sections.length-1,h1>>>0,h2>>>0];
        }
        function layoutOfElement(e) { const r = e.getBoundingClientRect();
            // v15: include every relevant block and both scroll axes. Compact dual hash
            // avoids copying large layout arrays into every stroke. Position is section-relative.
            const blocks=[...new Set([...e.children,...e.querySelectorAll('pre,[data-yja-scroll],img,svg,table,.tablewrap,.codeblock,details,figure')])];
            let h1=2166136261,h2=0x9e3779b9;
            function mix(v){v=v|0;h1=Math.imul(h1^v,16777619);h2=Math.imul(h2^v,2246822519);}
            for(const v of blocks){const q=v.getBoundingClientRect();for(const n of [q.left-r.left,q.top-r.top,q.width,q.height,v.scrollLeft||0,v.scrollTop||0])mix(Math.round(n));}
            return [Math.round(r.width),Math.round(r.height),-15,blocks.length,h1>>>0,h2>>>0];
        }
        function sameLayout(a,b){return a.length===b.length&&a.every((v,i)=>i<2?Math.abs(v-b[i])<=1:v===b[i]);}
        function anchorState(a,cache){if(cache?.has(a))return cache.get(a);let state=null;
            if(anchors.has(a)&&!(isBoardId(a)&&board.hidden)){const g=geometry(a);if(g.w>0&&g.h>0)state={g,n:layoutOf(a)};}
            cache?.set(a,state);return state;}
        // v26: bind completed page strokes to the bands they actually cross.
        // No scaling on reflow: only a proven rigid translation of unchanged sections is allowed.
        // Old -21 signatures remain supported; the serialized schema and storage key are unchanged.
        const bandCacheKey=Symbol('page bands'), bandBounds=new WeakMap();
        function pageBands(cache){
            if(cache?.has(bandCacheKey))return cache.get(bandCacheKey);
            const g=geometry(PAGE_ANCHOR), entries=sections.filter(e=>e!==board).map((e,i)=>{
                const r=geometry(anchorId(e));return {i,g:r,n:layoutOfElement(e)};
            }).filter(e=>e.g.w>0&&e.g.h>0);
            const v={g,entries};cache?.set(bandCacheKey,v);return v;
        }
        function bandRange(s,g){
            let b=bandBounds.get(s);if(!b){b=pointBounds(s.points);bandBounds.set(s,b);}
            const pad=s.tool==='arrow'?10+s.width*3:s.tool==='highlight'?(s.width+10)/2+2:s.width/2+2;
            return {l:g.x+b.l*g.w-pad,r:g.x+b.r*g.w+pad,t:g.y+b.t*g.h-pad,b:g.y+b.b*g.h+pad};
        }
        function bandsFor(entries,b){return entries.filter(e=>e.g.y<=b.b&&e.g.y+e.g.h>=b.t);}
        function bandSignature(bands,ref){
            let h1=2166136261,h2=0x9e3779b9;
            const mix=v=>{v=Math.round(v)|0;h1=Math.imul(h1^v,16777619);h2=Math.imul(h2^v,2246822519);};
            for(const e of bands)for(const v of [e.i,e.g.x-ref.g.x,e.g.y-ref.g.y,...e.n])mix(v);
            return [bands.length,h1>>>0,h2>>>0];
        }
        function bindPageStroke(s,cache=new Map()){
            if(s.anchor!==PAGE_ANCHOR)return s;
            const {g,entries}=pageBands(cache),bounds=bandRange(s,g),bands=bandsFor(entries,bounds);
            // Header/footer/gap-only marks lack a stable section reference; retain strict page protection.
            if(!bands.length||bounds.t<bands[0].g.y-1||bounds.b>bands.at(-1).g.y+bands.at(-1).g.h+1)return {...s,layout:layoutOf(PAGE_ANCHOR)};
            const ref=bands[0];
            return {...s,layout:[g.w,g.h,-26,ref.i,ref.g.x,ref.g.y,...bandSignature(bands,ref)]};
        }
        function strokeGeometry(s,cache=new Map()){
            if(cache.has(s))return cache.get(s);
            let result=null;
            if(s.anchor===PAGE_ANCHOR&&s.layout[2]===-26){
                const [w,h,marker,index,x,y,count,h1,h2]=s.layout;
                const {g:current,entries}=pageBands(cache),ref=entries.find(e=>e.i===index);
                if(s.layout.length===9&&w>0&&h>0&&ref){
                    const g={x:ref.g.x-x,y:ref.g.y-y,w,h},b=bandRange(s,g),bands=bandsFor(entries,b);
                    const sig=bandSignature(bands,ref);
                    // Permit a partially clipped stroke only if its centerline is still inside the page.
                    const p=bandBounds.get(s);
                    if(bands[0]===ref&&sig[0]===count&&sig[1]===h1&&sig[2]===h2&&
                        g.x+p.l*w>=-1&&g.y+p.t*h>=-1&&g.x+p.r*w<=current.w+1&&g.y+p.b*h<=current.h+1)result=g;
                }
            }else{
                const state=anchorState(s.anchor,cache);if(state&&sameLayout(state.n,s.layout))result=state.g;
            }
            // Live strokes mutate points and must not be cached across events.
            cache.set(s,result);return result;
        }
        function matches(s,cache){return !!strokeGeometry(s,cache instanceof Map?cache:new Map());}
        const geometryKey=({g,n})=>JSON.stringify([g.x,g.y,g.w,g.h,n]);
        function xy(s, r = geometry(s.anchor)) { const pts=s.points.map(p => [r.x + p[0] * r.w, r.y + p[1] * r.h, p[2]]);return s.tool==='pen'&&s.smooth?smoothPoints(pts):pts; }
        function graphic(s, bounds) {
            const pts = xy(s, bounds), a = pts[0], b = pts.at(-1), g = svg('g', { 'data-stroke': s.id, 'stroke': s.color, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'fill': 'none' });
            const w = s.width;
            const alpha=s.opacity??defaultOpacity(s.tool);if(alpha!==1)g.setAttribute('opacity',String(alpha));
            if (s.tool === 'pen') {
                g.append(svg('path',{d:inkPath(pts,w),fill:s.color,stroke:'none','fill-rule':'nonzero'}));
            }
            else if (s.tool === 'highlight') {
                g.append(svg('polyline', { points: pts.map(p => p.slice(0, 2).join(',')).join(' '), 'stroke-width': w + 10 }));
                if (pts.every(p=>p[0]===a[0]&&p[1]===a[1]))
                    g.append(svg('circle', { cx: a[0], cy: a[1], r: (w + 10) / 2, fill: s.color, stroke: 'none' }));
            }
            else {
                g.setAttribute('stroke-width', w);
                if (s.tool === 'rect')
                    g.append(svg('rect', { x: Math.min(a[0], b[0]), y: Math.min(a[1], b[1]), width: Math.abs(a[0] - b[0]), height: Math.abs(a[1] - b[1]) }));
                else if (s.tool === 'circle')
                    g.append(svg('ellipse', { cx: (a[0] + b[0]) / 2, cy: (a[1] + b[1]) / 2, rx: Math.abs(a[0] - b[0]) / 2, ry: Math.abs(a[1] - b[1]) / 2 }));
                else {
                    g.append(svg('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1] }));
                    if (s.tool === 'arrow') {
                        const t = Math.atan2(b[1] - a[1], b[0] - a[0]), l = 10 + w * 2;
                        g.append(svg('polyline', { points: [[b[0] - l * Math.cos(t - .5), b[1] - l * Math.sin(t - .5)], b.slice(0, 2), [b[0] - l * Math.cos(t + .5), b[1] - l * Math.sin(t + .5)]].map(p => p.join(',')).join(' ') }));
                    }
                }
            }
            return g;
        }
        // (추가) 선택 상자는 원본 필기에 포함되지 않는 임시 UI 레이어.
        // v10: local, read-only export snapshots. Never change the active page or stored strokes.
        function openOutput(){
            finish(false);clearLaser();
            if(document.querySelector('.yja-output-dialog'))return;
            const dialog=el('dialog','yja-output-dialog');dialog.setAttribute('aria-label','판서 출력');
            const header=el('div','yja-output-head');header.append(el('strong','','교재 · 판서 출력'));
            const close=el('button','','닫기');close.type='button';header.append(close);dialog.append(header);
            const settings=el('div','yja-output-settings');dialog.append(settings);
            function choice(label,options){const l=el('label','',label),s=el('select');s.setAttribute('aria-label',label);for(const [v,t] of options){const o=el('option','',t);o.value=v;s.append(o);}l.append(s);settings.append(l);return s;}
            const lessonSections=sections.filter(e=>e!==board);
            const scope=choice('출력 범위',[['chapter','교재 전체 (절별)'],['page','전체 배경 · 여백 포함'],...lessonSections.map(e=>['section:'+anchorId(e),e.querySelector('h2,h3')?.textContent||anchorId(e)]),['board','현재 백지'],['boards','전체 백지'],['all','교재 + 전체 백지']]);
            const ink=choice('판서 포함',[['yes','판서 포함'],['no','원본만']]);
            const quality=choice('이미지 해상도',[['1','표준 (1배)'],['2','고해상도 (2배)']]);
            const orientation=choice('PDF 용지',[['portrait','A4 세로'],['landscape','A4 가로']]);
            const create=el('button','','미리보기 생성');create.type='button';settings.append(create);
            const print=el('button','','PDF 저장 / 인쇄');print.type='button';print.disabled=true;settings.append(print);
            const message=el('p','yja-output-message','절·백지별 또는 전체 배경 PNG를 생성합니다. 전체 배경은 긴 페이지를 나누어 출력합니다. PDF는 이미지 기반입니다.');message.setAttribute('role','status');dialog.append(message);
            const previews=el('div','yja-output-previews');dialog.append(previews);
            const printRoot=el('div','yja-print-root');document.body.append(dialog,printRoot);
            const printStyle=el('style');document.head.append(printStyle);
            let busy=false,closed=false;
            function clear(){previews.replaceChildren();printRoot.replaceChildren();print.disabled=true;}
            function dispose(){closed=true;dialog.remove();printRoot.remove();printStyle.remove();}
            close.onclick=()=>dialog.close();dialog.addEventListener('close',dispose,{once:true});
            for(const s of [scope,ink,quality,orientation])s.onchange=()=>{clear();message.textContent='설정 변경 · 미리보기를 다시 생성하세요.';};
            print.onclick=()=>{if(!print.disabled)window.print();};
            create.onclick=async()=>{
                if(busy)return;busy=true;clear();for(const x of [scope,ink,quality,orientation,create])x.disabled=true;
                message.textContent='출력 이미지 생성 중…';
                try{
                    await document.fonts?.ready;
                    const v=scope.value,include=ink.value==='yes',scale=Number(quality.value),land=orientation.value==='landscape';
                    const snapshotStrokes=strokes.slice(),snapshotBoards=boards.slice();
                    const targets=[];
                    if(v==='page')targets.push({id:'page',title:'전체 배경',page:true});
                    if(v==='chapter'||v==='all')for(const e of lessonSections)targets.push({id:anchorId(e),e,title:e.querySelector('h2,h3')?.textContent||anchorId(e)});
                    if(v.startsWith('section:')){const e=anchors.get(v.slice(8));if(e)targets.push({id:anchorId(e),e,title:e.querySelector('h2,h3')?.textContent||anchorId(e)});}
                    if(['board','boards','all'].includes(v))for(const b of snapshotBoards.filter(b=>v!=='board'||b.id===activeBoard))targets.push({id:b.id,title:b.name,board:true});
                    if(!targets.length)throw Error('출력할 범위가 없습니다.');
                    let pixels=0,omitted=0,shrunk=0;const outputs=[];
                    const pageInk=include&&pageEnabled?snapshotStrokes.filter(s=>s.anchor===PAGE_ANCHOR):[];
                    const exportCache=new Map(),pageValid=pageInk.filter(s=>matches(s,exportCache));const pageBox=pageEnabled?pageRect():null;
                    // Capture every DOM snapshot synchronously before asynchronous rasterization.
                    for(const t of targets){
                        let stage=null;
                        try{
                            if(t.page){
                                const box=physicalPageRect(),w=Math.ceil(box.width),h=Math.ceil(box.height);
                                if(w<1||h<1||w*scale>8192||w*h*scale*scale>40000000)throw Error('전체 배경 크기 제한 · 표준 해상도 또는 절별 출력 사용');
                                const origin=pageEnabled?box:layer.getBoundingClientRect();
                                const extra=[];
                                for(const s of include?snapshotStrokes:[]){
                                    const g=strokeGeometry(s,exportCache);
                                    if(!g){omitted++;continue;}
                                    extra.push({s,g:{...g,x:g.x+origin.left-box.left,y:g.y+origin.top-box.top}});
                                }
                                const xml=exportSection(document.body,[],w,h,w,h,extra,snapshotStrokes,true);
                                // Crop one immutable snapshot into A4-proportional vertical tiles; no gaps.
                                const step=Math.max(1,Math.min(Math.floor(8192/scale),Math.floor(w*(land?174/277:261/190))));
                                for(let y=0,i=1;y<h;y+=step,i++){
                                    const th=Math.min(step,h-y),tile=xml.replace(/viewBox="0 0 [^"]+"/,`viewBox="0 ${y} ${w} ${th}"`).replace(/^<svg[^>]*>/,m=>m.replace(/height="[^"]+"/,`height="${th}"`));
                                    outputs.push({id:'page-'+i,title:'전체 배경 '+i,w,h:th,snapshot:tile});
                                }
                                continue;
                            }
                            let source=t.e;
                            if(t.board){
                                if(t.id===activeBoard&&!board.hidden)source=board;
                                else {stage=board.cloneNode(true);stage.hidden=false;stage.removeAttribute('data-yja-anchor');Object.assign(stage.style,{position:'fixed',left:'-100000px',top:'0',width:host.clientWidth+'px',margin:'0',pointerEvents:'none'});boardParent.append(stage);source=stage;}
                            }
                            const r=source.getBoundingClientRect(),w=Math.ceil(r.width),h=Math.ceil(r.height);
                            if(w<1||h<1||w*scale>8192||h*scale>8192||(pixels+=w*h*scale*scale)>40000000)throw Error('출력 크기 제한 초과 · 범위를 줄이거나 표준 해상도를 선택하세요.');
                            const signature=layoutOfElement(source),candidates=include?snapshotStrokes.filter(s=>s.anchor===t.id):[];
                            const valid=candidates.filter(s=>sameLayout(signature,s.layout));
                            omitted+=candidates.length-valid.length;
                            const extra=t.board?[]:pageValid.map(s=>{const g=strokeGeometry(s,exportCache);return {s,g:{...g,x:g.x+pageBox.left-r.left,y:g.y+pageBox.top-r.top}};});
                            const snapshot=exportSection(source,valid,w,h,r.width,r.height,extra,snapshotStrokes);
                            outputs.push({id:t.id,title:t.title,w,h,snapshot});
                        }finally{stage?.remove();}
                    }
                    const ready=[];
                    for(const o of outputs){if(closed)return;const url=await rasterExport(o.snapshot,o.w,o.h,scale);ready.push({...o,url,snapshot:null});}
                    if(closed)return;
                    printStyle.textContent=`@page { size: A4 ${land?'landscape':'portrait'}; margin: 10mm; }`;
                    for(const [i,o] of ready.entries()){
                        const card=el('article','yja-output-card');card.append(el('h3','',`${i+1}. ${o.title}`));
                        const img=el('img');img.src=o.url;img.alt=o.title;card.append(img);
                        const dl=el('a','','PNG 저장');dl.href=o.url;dl.download=`${chapter.replace(/[^\w-]/g,'_')}-${o.id.replace(/[^\w-]/g,'_')}-${include?'ink':'original'}.png`;card.append(dl);previews.append(card);
                        const sheet=el('article','yja-print-sheet');sheet.append(el('h2','',`${i+1}. ${o.title}`));
                        const pi=el('img');pi.src=o.url;pi.alt=o.title;
                        // Fit without reflow: one source section/board per page, never crop.
                        const maxW=land?277:190,maxH=land?174:261;
                        const mm=Math.min(maxW/o.w,maxH/o.h);if(mm*o.w<maxW*.8)shrunk++;
                        pi.style.width=(mm*o.w)+'mm';pi.style.height=(mm*o.h)+'mm';sheet.append(pi);printRoot.append(sheet);
                    }
                    print.disabled=false;
                    message.textContent=`${ready.length}개 출력 준비 · ${include?'판서 포함':'원본만'}${omitted?` · 배치 불일치 판서 ${omitted}개 제외`:''}${pageInk.length&&v!=='page'?` · 전체 판서 중 절 밖 여백은 PNG/PDF 제외 (JSON 보존)${pageInk.length!==pageValid.length?' · 배치 불일치 전체 판서 '+(pageInk.length-pageValid.length)+'개 제외':''}`:''}${shrunk?` · 긴 절 ${shrunk}개 축소 (PNG는 원래 비율)`:''}`;
                    message.dataset.warn=String(omitted>0||shrunk>0||(v!=='page'&&pageInk.length>0));
                }catch(e){if(!closed){clear();message.textContent='출력 실패: '+e.message;message.dataset.warn='true';}}
                finally{busy=false;if(!closed)for(const x of [scope,ink,quality,orientation,create])x.disabled=false;}
            };
            dialog.showModal();
        }
        function exportSection(source,items,w,h,actualW,actualH,extra=[],order=[],full=false){
            // Snapshot computed visual styles; do not execute cloned content or fetch resources.
            const root=source.cloneNode(true),src=[source,...source.querySelectorAll('*')],dst=[root,...root.querySelectorAll('*')];
            const unsafe=/^(SCRIPT|IFRAME|OBJECT|EMBED|VIDEO|AUDIO|CANVAS|INPUT|TEXTAREA|SELECT|FORM|LINK|STYLE)$/i;
            const excluded=new Set();
            // Whole-page snapshot excludes only engine UI, non-rendered nodes and executable resources.
            const skip='.yja-edge-tab,.yja-ui,.yja-diagnostic,.yja-layer,.yja-board-nav,.yja-output-dialog,.yja-print-root,.yja-sync-panel,script,style,link,template';
            const props='display position box-sizing width height min-width min-height max-width max-height margin margin-top margin-right margin-bottom margin-left padding padding-top padding-right padding-bottom padding-left border border-top border-right border-bottom border-left border-radius background-color background-image background-size background-position background-repeat color font-family font-size font-weight font-style line-height letter-spacing text-align text-decoration white-space overflow-wrap word-break vertical-align overflow overflow-x overflow-y opacity flex flex-direction flex-wrap justify-content align-items gap row-gap column-gap grid-template-columns grid-template-rows grid-column grid-row list-style-type list-style-position table-layout border-collapse border-spacing text-anchor dominant-baseline fill fill-opacity stroke stroke-width stroke-opacity stroke-linecap stroke-linejoin stroke-dasharray marker-start marker-mid marker-end transform transform-origin'.split(' ');
            for(let i=0;i<src.length;i++){
                const a=src[i],b=dst[i],tag=a.localName.toLowerCase();
                if(full&&i>0&&(excluded.has(a.parentElement)||a.matches(skip)||getComputedStyle(a).display==='none')){excluded.add(a);b.remove();continue;}
                const checkInput=full&&tag==='input'&&['checkbox','radio'].includes(a.type);
                if(unsafe.test(tag)&&!checkInput)throw Error('출력 미지원 요소: '+tag);
                if(checkInput){b.toggleAttribute('checked',a.checked);b.removeAttribute('name');}
                if(a.scrollLeft||a.scrollTop)throw Error('내부 스크롤을 처음 위치로 돌린 뒤 다시 출력하세요.');
                for(const attr of [...b.attributes])if(/^on/i.test(attr.name)||['href','src','srcset','poster','action','style'].includes(attr.name.toLowerCase())||attr.name==='xlink:href'){
                    if((attr.name==='href'||attr.name==='xlink:href')&&attr.value.startsWith('#')&&a.namespaceURI===NS)b.setAttribute(attr.name,attr.value);else b.removeAttribute(attr.name);
                }
                const cs=getComputedStyle(a);
                for(const p of full?[...props,'top','right','bottom','left','z-index','box-shadow','align-self','justify-self','grid-auto-flow']:props){let value=cs.getPropertyValue(p);if(!value)continue;
                    if(/url\(/i.test(value)){
                        // Only same-document SVG fragment markers; never external CSS assets.
                        const m=value.match(/^url\(["']?(?:[^#"')]*#)([\w:.-]+)["']?\)$/);if(!m||a.namespaceURI!==NS)throw Error('외부 CSS 이미지/참조는 출력할 수 없습니다.');value=`url(#${m[1]})`;
                    }
                    b.style.setProperty(p,value);
                }
                if(tag==='img'){
                    if(!a.complete||!a.naturalWidth||a.naturalWidth*a.naturalHeight>16000000)throw Error('이미지 로딩 또는 크기 제한');
                    const c=el('canvas');c.width=a.naturalWidth;c.height=a.naturalHeight;c.getContext('2d').drawImage(a,0,0);b.setAttribute('src',c.toDataURL('image/png'));
                }
                if(full&&cs.position==='sticky'){b.style.position='relative';b.style.top='auto';b.style.bottom='auto';}
                if(full&&cs.position==='fixed')throw Error('고정 위치 교재 요소는 전체 출력 미지원');
                if(tag==='button'&&!full){b.style.visibility='hidden';}
            }
            let contentRoot=root;
            if(full){contentRoot=el('div');contentRoot.style.cssText=root.style.cssText;while(root.firstChild)contentRoot.append(root.firstChild);}
            Object.assign(contentRoot.style,{position:'relative',left:'auto',top:'auto',margin:'0',width:actualW+'px',height:actualH+'px',maxWidth:'none',maxHeight:'none',transform:'none'});
            const wrapper=document.createElementNS('http://www.w3.org/1999/xhtml','div');Object.assign(wrapper.style,{width:w+'px',height:h+'px',overflow:'hidden',background:'#F1F2EE'});wrapper.append(contentRoot);
            const out=svg('svg',{xmlns:NS,width:w,height:h,viewBox:`0 0 ${w} ${h}`});
            const fo=svg('foreignObject',{x:0,y:0,width:w,height:h});fo.append(wrapper);out.append(fo);
            const marks=new Map(items.map(s=>[s.id,{s,g:{x:0,y:0,w:actualW,h:actualH}}]));for(const item of extra)marks.set(item.s.id,item);
            for(const s of order.length?order:items){const item=marks.get(s.id);if(item)out.append(graphic(item.s,item.g));}
            return new XMLSerializer().serializeToString(out);
        }
        async function rasterExport(xml,w,h,scale){
            const image=new Image();const data='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(xml);
            await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('이미지 변환 시간 초과')),15000);image.onload=()=>{clearTimeout(timer);resolve();};image.onerror=()=>{clearTimeout(timer);reject(Error('이미지 변환 제한'));};image.src=data;});
            const c=el('canvas');c.width=w*scale;c.height=h*scale;const ctx=c.getContext('2d');if(!ctx)throw Error('Canvas 초기화 실패');ctx.fillStyle='#F1F2EE';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(image,0,0,c.width,c.height);
            const result=c.toDataURL('image/png');if(!result.startsWith('data:image/png;base64,'))throw Error('PNG 생성 실패');return result;
        }
        function selectedItems(){const cache=new Map();return strokes.filter(s=>selected.has(s.id)&&matches(s,cache));}
        function selectionBox(items) {
            const r=geometry(items[0].anchor),b=pixelBounds(items.flatMap(s=>{const g=strokeGeometry(s)||r;return s.points.map(p=>[g.x+p[0]*g.w,g.y+p[1]*g.h]);})),pad=12+Math.max(...items.map(s=>s.width))/2;
            return {l:Math.max(r.x,b.l-pad),t:Math.max(r.y,b.t-pad),r:Math.min(r.x+r.w,b.r+pad),b:Math.min(r.y+r.h,b.b+pad),resizable:Math.hypot(b.r-b.l,b.b-b.t)>3};
        }
        function handles(b){return [[b.l,b.t],[b.r,b.t],[b.r,b.b],[b.l,b.b]];}
        function drawSelection(){
            layer.querySelector('[data-yja-selection]')?.remove();
            if(!['edit','lasso'].includes(tool)||!visible||navHeld||!selected.size)return;
            const items=live?.transform?.next||selectedItems();
            if(items.length!==selected.size){selected.clear();return;}
            const b=selectionBox(items),g=svg('g',{'data-yja-selection':'','data-count':items.length,'pointer-events':'none'});
            g.append(svg('rect',{x:b.l,y:b.t,width:b.r-b.l,height:b.b-b.t,fill:'none',stroke:'#1764d2','stroke-width':1.5,'stroke-dasharray':'5 3'}));
            if(b.resizable)handles(b).forEach(([x,y],i)=>g.append(svg('circle',{cx:x,cy:y,r:6,fill:'#fff',stroke:'#1764d2','stroke-width':2,'data-yja-handle':i})));
            layer.append(g);
        }
        function editDown(e,anchor){
            const r=layer.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
            // v25: visible ink is editable regardless of the current drawing scope.
            // Groups remain within one coordinate anchor; cross-anchor shift starts a new group.
            const cache=new Map(),old=selectedItems(),hit=()=>strokes.slice().reverse().find(s=>matches(s,cache)&&strokeHit(s.tool,xy(s,strokeGeometry(s,cache)),s.width,x,y));
            if(e.shiftKey){const s=hit();if(s){if(old.some(item=>item.anchor!==s.anchor)||old.length!==selected.size)selected.clear();if(selected.has(s.id))selected.delete(s.id);else selected.add(s.id);}finish(false);return;}
            let items=[],corner=-1;
            if(old.length){const b=selectionBox(old);if(b.resizable)corner=handles(b).findIndex(([hx,hy])=>Math.hypot(x-hx,y-hy)<=12);
                if(corner>=0||(x>=b.l&&x<=b.r&&y>=b.t&&y<=b.b))items=old;}
            if(!items.length){const s=hit();if(s)items=[s];}
            selected=new Set(items.map(s=>s.id));
            if(!items.length){finish(false);return;}
            const g=geometry(items[0].anchor),start=[(x-g.x)/g.w,(y-g.y)/g.h];
            // Work in the current coordinate frame; rebind moved page ink only on commit.
            const base=items.map(s=>{if(s.anchor!==PAGE_ANCHOR)return s;const old=strokeGeometry(s,cache);return {...s,layout:layoutOf(s.anchor),points:s.points.map(p=>[clamp((old.x+p[0]*old.w-g.x)/g.w),clamp((old.y+p[1]*old.h-g.y)/g.h),p[2]])};});
            let pivot=null;if(corner>=0){const b=pointBounds(base.flatMap(s=>s.points));pivot=[[b.r,b.b],[b.l,b.b],[b.l,b.t],[b.r,b.t]][corner];}
            live.transform={original:items,base,next:base,start,pivot};drawSelection();refresh();
        }
        function editMove(e){
            const t=live.transform;if(!t)return;const cache=new Map();
            if(!t.original.every(s=>matches(s,cache))){finish(false);return;}
            const r=rectOf(t.original[0].anchor),q=[(e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height];
            let k=1;
            if(t.pivot){const a=[(t.start[0]-t.pivot[0])*r.width,(t.start[1]-t.pivot[1])*r.height],v=[(q[0]-t.pivot[0])*r.width,(q[1]-t.pivot[1])*r.height];const den=a[0]**2+a[1]**2;k=den?(a[0]*v[0]+a[1]*v[1])/den:1;}
            t.next=transformGroup(t.base,q[0]-t.start[0],q[1]-t.start[1],t.pivot,k);schedule();
        }
        function lassoPoint(e){const r=rectOf(live.anchor),g=geometry(live.anchor);return [g.x+clamp((e.clientX-r.left)/r.width)*r.width,g.y+clamp((e.clientY-r.top)/r.height)*r.height];}
        function drawLasso(){layer.querySelector('[data-yja-lasso]')?.remove();if(!live?.lasso)return;layer.append(svg('polygon',{'data-yja-lasso':'',points:live.lasso.map(p=>p.join(',')).join(' '),fill:'#1764d2','fill-opacity':'.09',stroke:'#1764d2','stroke-width':1.5,'stroke-dasharray':'5 3','pointer-events':'none'}));}
        function lassoMove(e){if(!live.lasso)return;if(!matches({anchor:live.anchor,layout:live.layout})){finish(false);return;}
            const p=lassoPoint(e),a=live.lasso.at(-1);if(Math.hypot(p[0]-a[0],p[1]-a[1])>=3){if(live.lasso.length>=256)live.lasso=live.lasso.filter((_,i)=>i%2===0);live.lasso.push(p);}drawLasso();}
        function completeLasso(l){
            if(!matches({anchor:l.anchor,layout:l.layout}))return;
            if(!validLasso(l.lasso))return;
            const prior=selectedItems().filter(s=>s.anchor===l.anchor);
            const cache=new Map(),hit=strokes.filter(s=>s.anchor===l.anchor&&matches(s,cache)&&lassoHit(s.tool,xy(s,strokeGeometry(s,cache)),s.width,l.lasso));
            selected=new Set([...(l.add?prior:[]),...hit].map(s=>s.id));tool='edit';
        }
        function deleteSelection(){finish(false);if(!['edit','lasso'].includes(tool)||!visible||navHeld)return;const items=selectedItems();if(!items.length)return;const ids=new Set(items.map(s=>s.id));selected.clear();commit(strokes.filter(s=>!ids.has(s.id)));}
        function render() {
            syncPageLayer();
            const cache=new Map(),shown=[],keep=new Set(),previews=new Map((live?.transform?.next||[]).map(s=>[s.id,s]));layoutHidden=0;
            // Remove only ephemeral overlays; committed SVG nodes survive ordinary edits.
            for(const attr of ['data-yja-live','data-yja-laser','data-yja-selection','data-yja-lasso'])layer.querySelector('['+attr+']')?.remove();
            for(const s of strokes){if(!matches(s,cache)){if(!(isBoardId(s.anchor)&&(board.hidden||s.anchor!==activeBoard)))layoutHidden++;continue;}
                const item=previews.get(s.id)||s,g=strokeGeometry(item,cache)||geometry(item.anchor),k=JSON.stringify([g.x,g.y,g.w,g.h]);let entry=nodeCache.get(s.id);
                if(!entry||entry.item!==item||entry.k!==k){const node=graphic(item,g);if(entry)entry.node.remove();entry={item,k,node};nodeCache.set(s.id,entry);}
                const vis=live?.ids.has(s.id)?'hidden':'';if(entry.node.style.visibility!==vis)entry.node.style.visibility=vis;shown.push(entry.node);keep.add(s.id);
            }
            for(const [id,entry] of nodeCache)if(!keep.has(id)){entry.node.remove();nodeCache.delete(id);}
            // Preserve document z-order including undo/redo and imported order.
            const existing=Array.from(layer.children);if(existing.length!==shown.length||shown.some((node,i)=>existing[i]!==node)){
                for(let i=0;i<shown.length;i++){const at=layer.children[i];if(at!==shown[i])layer.insertBefore(shown[i],at||null);}
            }
            if(live?.s&&matches(live.s,cache)){const node=graphic(live.s,strokeGeometry(live.s,cache));node.setAttribute('data-yja-live','');layer.append(node);}
            drawLaser();drawSelection();drawLasso();refresh();
        }
        let raf = 0;
        function schedule() { if (!raf)
            raf = requestAnimationFrame(() => { raf = 0; render(); }); }
        let liveFrame = 0;
        function scheduleLive() { if (!liveFrame)
            liveFrame = requestAnimationFrame(() => { liveFrame = 0; layer.querySelector('[data-yja-live]')?.remove(); if (live?.s && matches(live.s)) {
                const g = graphic(live.s);
                g.setAttribute('data-yja-live', '');
                layer.append(g);
            } }); }
        function drawLaser(){layer.querySelector('[data-yja-laser]')?.remove();if(!laserPoint||!visible)return;const r=geometry(laserPoint.anchor),p=laserPoint.point,x=r.x+p[0]*r.w,y=r.y+p[1]*r.h;const g=svg('g',{'data-yja-laser':'','pointer-events':'none'});g.append(svg('circle',{cx:x,cy:y,r:13,fill:'#ff3344',opacity:.22}),svg('circle',{cx:x,cy:y,r:4,fill:'#ff3344'}));layer.append(g);}
        function clearLaser(){clearTimeout(laserTimer);laserPoint=null;drawLaser();}
        function setLaser(e,a){clearTimeout(laserTimer);laserPoint={anchor:a,point:localPoint(e,a)};drawLaser();}
        function erase(e,samples=[e]) {
            const r=layer.getBoundingClientRect();
            const cache=new Map(),keys=[...sections.map(anchorId),...(pageEnabled?[PAGE_ANCHOR]:[])].map(id=>{const state=anchorState(id,cache);return [id,state?geometryKey(state):null];}),signature=JSON.stringify(keys);
            // Do not bridge an eraser trajectory across a changed coordinate frame.
            if(!live.eraseIndex||live.eraseIndex.signature!==signature){const grid=makeGrid();for(const s of strokes)if(matches(s,cache)){const pts=xy(s,strokeGeometry(s,cache));grid.add([s,pts],hitBounds(s,pts));}live.eraseIndex={signature,grid};live.eraseLast=null;}
            for(const q of samples){
                const x=q.clientX-r.left,y=q.clientY-r.top,prev=live.eraseLast||[x,y];live.eraseLast=[x,y];
                const query={l:Math.min(x,prev[0]),t:Math.min(y,prev[1]),r:Math.max(x,prev[0]),b:Math.max(y,prev[1])};
                for(const [s,pts] of live.eraseIndex.grid.query(query)){if(live.ids.has(s.id))continue;
                    if(sweptHit(s.tool,pts,s.width,prev,[x,y])){live.ids.add(s.id);const entry=nodeCache.get(s.id);if(entry)entry.node.style.visibility='hidden';}}
            }
        }
        function down(e) {
            // A fresh press from the same pointer cannot continue an orphaned gesture.
            if(live?.captureLost&&live.pointer===e.pointerId&&live.pointerType===e.pointerType&&canDraw(e.pointerType,e.button,inputMode,barrelErase))finish(false);
            if(tool==='select'||navHeld||!visible||live||!canDraw(e.pointerType,e.button,inputMode,barrelErase)){if(!live)recordInput(e,samplePressure(e.pointerType,e.pressure,pressure,mouseMock));return;}
            if(e.target?.closest?.('.yja-board-nav')||(pageEnabled&&protectedTarget(e)))return;const anchor=anchorAt(e);if(!anchor)return;
            e.preventDefault();e.stopPropagation();
            let captureLost=false;
            // Capture is an optimization, not a prerequisite: window capture listeners track the accepted gesture.
            try{layer.setPointerCapture(e.pointerId);}catch{captureLost=true;}
            const activeTool=e.pointerType==='pen'&&(e.button===5||(e.buttons&32)||(barrelErase&&(e.button===2||(e.buttons&2))))?'eraser':tool;
            live={pointer:e.pointerId,pointerType:e.pointerType,ids:new Set(),activeTool,anchor,last:null,captureLost};
            if(activeTool==='eraser'){recordInput(e,samplePressure(e.pointerType,e.pressure,pressure,mouseMock));erase(e);return;}
            if(activeTool==='laser'){setLaser(e,anchor);return;}
            if(activeTool==='edit'){editDown(e,anchor);return;}
            if(activeTool==='lasso'){live.lasso=[lassoPoint(e)];live.layout=layoutOf(anchor);live.add=addSelection||e.shiftKey;drawLasso();return;}
            const p=localPoint(e,anchor);live.last=p;live.highlightMode=activeTool==='highlight'?highlightShape:'free';live.start=p;
            live.s={id:globalThis.crypto?.randomUUID?.()||Date.now()+'-'+Math.random(),anchor,tool:activeTool,color,width,...(styleFor(presetKey(activeTool)||lastInk).opacity===undefined?{}:{opacity:styleFor(presetKey(activeTool)||lastInk).opacity}),smooth:activeTool==='pen'&&smooth,layout:layoutOf(anchor),points:['pen','highlight'].includes(activeTool)?[p]:[p,p]};scheduleLive();
        }
        function move(e,ending=false) {
            if(!live||live.pointer!==e.pointerId||live.pointerType!==e.pointerType)return;
            if(!ending&&['mouse','pen'].includes(e.pointerType)&&e.buttons===0){finish(false);return;}
            e.preventDefault();e.stopPropagation();
            if(live.activeTool==='laser'){if(!ending)setLaser(e,live.anchor);return;}
            if(live.activeTool==='edit'){editMove(e);return;}
            if(live.activeTool==='lasso'){lassoMove(e);return;}
            if(!live.s){erase(e,ending?[e]:inputSamples(e));return;}
            const s=live.s;if(!matches(s)){finish(false);return;}const samples=ending?[e]:inputSamples(e),r=rectOf(s.anchor);
            for(const q of samples){
                const p=localPoint(q,s.anchor,live.last?.[2]??null,ending,r,false);
                if(s.tool==='highlight'&&['line','rect','arrow','circle'].includes(live.highlightMode)){
                    const g=geometry(s.anchor),ends=[live.start,p];
                    s.points=highlightShapePoints({tool:live.highlightMode,points:['line','arrow'].includes(live.highlightMode)&&axisSnap?snapAxis(ends,g.w,g.h):ends},g.w,g.h,s.width);
                }else if(['pen','highlight'].includes(s.tool)){
                    const last=s.points.at(-1);if(s.points.length<POINT_LIMIT&&(Math.abs(p[0]-last[0])+Math.abs(p[1]-last[1])>1e-7||(!ending&&s.tool==='pen'&&Math.abs(p[2]-last[2])>.01)))s.points.push(p);
                }else {s.points[1]=p;if(axisSnap&&['line','arrow'].includes(s.tool)){const g=geometry(s.anchor);s.points=snapAxis(s.points,g.w,g.h);}}
                live.last=p;
            }updateDiag();scheduleLive();
        }
        function finish(accept) { if (!live)
            return; const l = live; live = null; if (layer.hasPointerCapture(l.pointer))
            layer.releasePointerCapture(l.pointer); if(l.activeTool==='laser'){if(accept)laserTimer=setTimeout(clearLaser,650);else clearLaser();return;} if (accept) {
            if(l.lasso){completeLasso(l);render();return;}
            if(l.transform){const cache=new Map(),{original,base,next}=l.transform;if(original.every(s=>matches(s,cache))&&next.some((s,j)=>s.points.some((p,i)=>Math.abs(p[0]-base[j].points[i][0])+Math.abs(p[1]-base[j].points[i][1])>1e-7))){const byId=new Map(next.map(s=>[s.id,bindPageStroke(s,cache)]));commit(strokes.map(s=>byId.get(s.id)||s));return;}}
            if (l.s) {
                if (strokes.length >= LIMIT || strokes.reduce((n, s) => n + s.points.length, 0) + l.s.points.length > TOTAL_POINTS) {
                    render();
                    status('판서 한도 도달 · 내보내기 후 정리', true);
                    return;
                }
                if(!matches(l.s)){render();return;}
                const g=geometry(l.s.anchor);
                const explicit=l.s.tool==='highlight'?l.highlightMode:l.s.tool;
                if(['line','arrow','rect','circle'].includes(explicit)){
                    const end=l.last||l.s.points.at(-1),dx=Math.abs(end[0]-l.start[0])*g.w,dy=Math.abs(end[1]-l.start[1])*g.h;
                    if(Math.hypot(dx,dy)<3||(['rect','circle'].includes(explicit)&&Math.min(dx,dy)<3)){render();return;}
                }
                const shape=(autoShape&&l.s.tool==='pen'||l.s.tool==='highlight'&&l.highlightMode==='auto')?recognizeShape(l.s.points,g.w,g.h,axisSnap):null;
                const corrected=shape?(l.s.tool==='highlight'?{...l.s,points:highlightShapePoints(shape),smooth:false}:{...l.s,...shape,smooth:false}):null;
                // A sampled ellipse may have more points than the original gesture.
                // Keep the original if the converted shape exceeds the document budget.
                const fits=corrected&&strokes.reduce((n,s)=>n+s.points.length,0)+corrected.points.length<=TOTAL_POINTS;
                if(fits){
                    // One gesture, two undo levels: corrected -> original raw -> absent.
                    // Save only the final corrected state; the raw path remains in bounded history.
                    const before=snapshot(),raw={...before,strokes:[...strokes,bindPageStroke(l.s)]};
                    historyStore.record(before,raw);
                    strokes=[...strokes,bindPageStroke(corrected)];save();render();return;
                }
                commit([...strokes, bindPageStroke(l.s)]);
                return;
            }
            if (l.ids.size) {
                commit(strokes.filter(s => !l.ids.has(s.id)));
                return;
            }
        } render(); }
        const inputRoot=pageEnabled?document:host;
        inputRoot.addEventListener('pointerdown',down,true);
        // In pen-only mode mouse targets the real HTML; prevent pen clicks activating links after drawing.
        inputRoot.addEventListener('click',e=>{if(!(pageEnabled&&protectedTarget(e))&&!e.target?.closest?.('.yja-board-nav')&&tool!=='select'&&!navHeld&&visible&&e.pointerType==='pen'&&anchorAt(e)){e.preventDefault();e.stopImmediatePropagation();}},true);
        inputRoot.addEventListener('contextmenu',e=>{if(!(pageEnabled&&protectedTarget(e))&&tool!=='select'&&!navHeld&&visible&&e.pointerType==='pen')e.preventDefault();},true);
        layer.addEventListener('pointermove', move);
        layer.addEventListener('pointerup', e => { if (live?.pointer === e.pointerId && live.pointerType===e.pointerType) {
            move(e,true);
            finish(true);
        } });
        // v30: observe accepted pointer events before host handlers can stop bubbling.
        // move() stops propagation; finish() clears live before releasing capture.
        window.addEventListener('pointermove',e=>{if(live?.pointer===e.pointerId&&live.pointerType===e.pointerType)move(e);},true);
        window.addEventListener('pointerup',e=>{if(live?.pointer===e.pointerId&&live.pointerType===e.pointerType){move(e,true);finish(true);}},true);
        window.addEventListener('pointercancel',e=>{if(live?.pointer===e.pointerId&&live.pointerType===e.pointerType)finish(false);},true);
        layer.addEventListener('pointercancel',e=>{if(live?.pointer===e.pointerId&&live.pointerType===e.pointerType)finish(false);});
        layer.addEventListener('lostpointercapture',e=>{
            if(live?.pointer!==e.pointerId||live.pointerType!==e.pointerType)return;
            // Lost capture while still pressed is a routing change, NOT cancellation.
            // Keep the current samples; only pointerup commits. Cancel/blur/geometry changes still discard.
            if(e.buttons!==0){live.captureLost=true;return;}
            finish(false);
        });
        window.addEventListener('keydown', e => {
            // External reading mode must not steal the host's shortcuts. Activate a pen or focus our own toolbar first.
            if(external&&tool==='select'&&!e.target.closest?.('.yja-ui'))return;
            if (e.defaultPrevented || e.isComposing || e.keyCode===229 || e.altKey || (e.ctrlKey&&e.metaKey)) return; if (e.target.closest?.('.yja-output-dialog,input,textarea,select,[contenteditable],[role=textbox],[role=combobox],[role=slider],[role=spinbutton],[role=menu],[role=tablist]'))
            return; if (e.key === 'Escape') {
            if(e.repeat){e.preventDefault();return;}
            // Cancel only the current action first; do not unexpectedly leave the ink tool.
            if(live){finish(false);e.preventDefault();return;}
            if(navHeld){setNavigation(false);e.preventDefault();return;}
            if(shapeMode()!=='free'){setTool(lastInk);e.preventDefault();return;}
            if(['edit','lasso'].includes(tool)&&selected.size){selected.clear();drawSelection();refresh();e.preventDefault();return;}
            if(['eraser','laser','edit','lasso'].includes(tool)){setTool(lastInk);e.preventDefault();return;}
            if(!more.hidden){setMore(false);e.preventDefault();return;}
            setTool('select');
            return;
        }
        if(e.code==='Space' && tool!=='select' && visible && !e.ctrlKey&&!e.metaKey&&!e.altKey&&!e.target.closest?.('a,button')){e.preventDefault();if(!e.repeat)setNavigation(true);return;}
        // v28: letter shortcuts also work after keyboard activation of our own toolbar buttons.
        // Space/Enter retain native button activation; other site controls are not hijacked.
        if (!e.ctrlKey&&!e.metaKey&&!e.altKey&&!e.shiftKey&&!e.repeat&&(!e.target.closest?.('a,button')||e.target.closest?.('.yja-ui button'))) { if(/^[1-4]$/.test(e.key)){e.preventDefault();choosePreset(Number(e.key)-1);return;}const k=e.key.toLowerCase(),shape=shapeShortcuts[k],t=shortcuts[k];if(shape){e.preventDefault();shapeTool(shape);return;}if(t){e.preventDefault();if(['eraser','laser','edit','lasso'].includes(t))toggleTransient(t);else setTool(t);return;} }
        if(e.key==='Delete'&&['edit','lasso'].includes(tool)&&!e.target.closest?.('a,button')){e.preventDefault();deleteSelection();return;}
        if (tool === 'select')
            return; if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            history(e.shiftKey);
        }
        else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
            e.preventDefault();
            history(true);
        } });
        window.addEventListener('keyup',e=>{if(e.code==='Space'&&navHeld){e.preventDefault();setNavigation(false);}});
        window.addEventListener('blur',()=>{finish(false);setNavigation(false);});
        document.addEventListener('visibilitychange',()=>{if(document.hidden){finish(false);setNavigation(false);flushPending();}});
        window.addEventListener('pagehide',()=>{finish(false);flushPending();});
        window.addEventListener('pageshow',()=>{flushPending();});
        const observer = new ResizeObserver(() => { finish(false); schedule(); });
        observer.observe(host);if(pageEnabled)observer.observe(document.body);
        sections.forEach(s => {observer.observe(s);for(const e of s.querySelectorAll('img,svg,pre,table,[data-yja-scroll],.tablewrap,.codeblock,details,figure'))observer.observe(e);});
        host.addEventListener('load',()=>{finish(false);schedule();},true);
        host.addEventListener('toggle',e=>{if(e.target instanceof HTMLDetailsElement){finish(false);schedule();}},true);
        window.addEventListener('resize', () => { finish(false); clearLaser(); if(ui.dataset.dock==='float'){const r=ui.getBoundingClientRect();place(r.left,r.top);} schedule(); });
        window.addEventListener('scroll',()=>{if(live)finish(false);},{passive:true});
        document.fonts?.ready.then(schedule);
        host.addEventListener('scroll', e => { if (e.target !== host && e.target instanceof Element) {
            finish(false);
            schedule();
        } }, true);
        window.addEventListener('beforeunload', e => { if (dirty) {
            e.preventDefault();
            e.returnValue = '';
        } });
        window.addEventListener('storage', e => { if(serverManaged)return; if(e.key===presetStorageKey||e.key===null){presetBlocked=true;presetWarning='다른 탭 설정 변경 · 새로고침';refreshPresets();} if ((e.key === key || e.key === null) && (!e.storageArea || e.storageArea === localStorage)) {
            // storage.clear() sends key=null; an equal value is harmless.
            try { if(store.getItem(key) === storedRaw) return; } catch {}
            storageBlocked = true;
            saveFailed = true;
            refreshRecovery();status('다른 탭 변경 감지 · 내보내기 후 새로고침', true);
        } });
        if (innerWidth <= 860) {
            ui.dataset.collapsed = 'true';
            fold.setAttribute('aria-expanded', 'false');
        }
        render();
        refresh();
        // v19: the trusted same-origin sync adapter can use validated snapshots only.
        if(serverManaged)window.YJA_SERVER_ENGINE=Object.freeze({
            snapshot:()=>live?null:serializedPayload(),
            restore:o=>{if(live)throw Error('입력 진행 중');const next=validate(o);commit(next.strokes,next.boards,next.activeBoard);return serializedPayload();},
            // Explicit server deletion must not leave deleted ink in undo/redo.
            clear:()=>{if(live)throw Error('입력 진행 중');clearLaser();selected.clear();historyStore.clear();strokes=[];boards=[{id:'__yja_board__',name:'백지 1'}];activeBoard='__yja_board__';syncBoard();save();render();return serializedPayload();}
        });
    }
    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', init, { once: true });
    else
        init();
})();

}

/* v38: edge drawer, independent of ink and lesson layout. */
const edgeCss = `
/* v42: dock-directed slide, independently of the existing positioning transform. */
.yja-ui[data-yja-edge-open]{translate:0 0;opacity:1;transition:translate 320ms cubic-bezier(.2,.75,.25,1),opacity 320ms ease,visibility 0s linear}
.yja-ui[data-yja-edge-open="false"]{visibility:hidden!important;opacity:0!important;pointer-events:none!important;transition:translate 850ms cubic-bezier(.35,0,.2,1),opacity 850ms ease,visibility 0s linear 850ms}
.yja-ui[data-yja-edge-open="false"][data-dock="right"]{translate:calc(100% + 16px) 0}
.yja-ui[data-yja-edge-open="false"][data-dock="left"]{translate:calc(-100% - 16px) 0}
.yja-ui[data-yja-edge-open="false"][data-dock="bottom"]{translate:0 calc(100% + 16px)}
/* Floating position is preserved; fade instead of altering the saved drag coordinates. */
@media(prefers-reduced-motion:reduce){.yja-ui[data-yja-edge-open]{transition:none!important}}
.yja-edge-tab{all:initial;box-sizing:border-box;position:fixed;z-index:2147483001;right:0;top:50%;transform:translateY(-50%);width:10px;height:76px;padding:0;border:0;border-radius:5px 0 0 5px;background:#526479;opacity:.72;cursor:pointer;touch-action:manipulation;display:block;color:white}
.yja-edge-tab::after{content:'';position:absolute;inset:27px 3px;border-radius:2px;background:currentColor}
.yja-edge-tab:hover,.yja-edge-tab:focus-visible{opacity:1;background:#4635b1;outline:2px solid #fbbf24;outline-offset:-2px}
.yja-edge-tab[hidden]{display:none!important}
.yja-edge-tab[data-dock="left"]{right:auto;left:0;border-radius:0 5px 5px 0}
.yja-edge-tab[data-dock="bottom"]{top:auto;bottom:0;right:auto;left:50%;transform:translateX(-50%);width:76px;height:10px;border-radius:5px 5px 0 0}
.yja-edge-tab[data-dock="bottom"]::after{inset:3px 27px}
@media (pointer:fine){
.yja-ui[data-yja-edge-open]:not([data-dock=bottom]):not([data-collapsed=true]){width:124px;padding:4px;gap:3px}
.yja-ui[data-yja-edge-open] button,.yja-ui[data-yja-edge-open] .yja-topbar button,.yja-ui[data-yja-edge-open] .yja-group button,.yja-ui[data-yja-edge-open] .yja-widths button,.yja-ui[data-yja-edge-open] .yja-preset,.yja-ui[data-yja-edge-open] .yja-recovery button{min-height:30px;min-width:0;padding:2px}
.yja-ui[data-yja-edge-open] button svg{width:14px;height:14px}
.yja-ui[data-yja-edge-open] .yja-preset svg{width:24px;height:13px}
.yja-ui[data-yja-edge-open] button small{font-size:10px}
.yja-ui[data-yja-edge-open] .yja-mode-readout{font-size:10px;padding:3px 2px}
.yja-ui[data-yja-edge-open] .yja-topbar button[aria-label="간소화"],.yja-ui[data-yja-edge-open] .yja-scope-group button,.yja-ui[data-yja-edge-open]:not([data-dock=bottom]) .yja-style-group .yja-swatches button,.yja-ui[data-yja-edge-open]:not([data-dock=bottom]) .yja-widths button{min-height:30px}
.yja-ui[data-yja-edge-open]:not([data-dock=bottom]) .yja-style-group .yja-swatches{grid-template-columns:repeat(4,minmax(0,1fr));gap:2px}
.yja-ui[data-yja-edge-open] .yja-swatches i{width:13px;height:13px}
}
.yja-ui .yja-custom-color,.yja-ui .yja-opacity-label{grid-column:1/-1;display:flex;align-items:center;gap:6px;justify-content:space-between;min-width:0;font-size:11px}
.yja-ui .yja-custom-color input{width:54px;height:30px;padding:1px;border:1px solid #526479;background:#26374a;cursor:pointer}
.yja-ui .yja-opacity-label{display:grid;gap:2px}.yja-ui .yja-opacity-label input{margin:0;min-width:0}
.yja-ui[data-dock=bottom] .yja-opacity-label{width:112px}.yja-ui[data-dock=bottom] .yja-custom-color{width:94px}
/* v40: isolate the toolbar text from lesson styles, and prioritize frequent controls. */
.yja-ui[data-yja-edge-open]{color:#f1f5f9!important;color-scheme:dark}
.yja-ui[data-yja-edge-open] button{color:#f1f5f9!important;background:#26374a;border-color:#526479}
.yja-ui[data-yja-edge-open] button:hover:not(:disabled){background:#394d63}
.yja-ui[data-yja-edge-open] button[aria-pressed=true]{color:#142e50!important;background:#dbeafe;border-color:#60a5fa}
.yja-ui[data-yja-edge-open] button small{color:inherit!important;opacity:1!important;font-weight:600;line-height:1.15}
.yja-ui[data-yja-edge-open] button:disabled{opacity:.55}
.yja-ui[data-yja-edge-open] .yja-mode-readout{color:#f1f5f9!important}
.yja-ui[data-yja-edge-open] .yja-mode-readout[data-active=true]{color:#38258e!important}
.yja-ui[data-yja-edge-open] .yja-custom-color,.yja-ui[data-yja-edge-open] .yja-opacity-label{color:#f1f5f9!important}
.yja-ui[data-yja-edge-open] .yja-preset-status,.yja-ui[data-yja-edge-open] .yja-help,.yja-ui[data-yja-edge-open] .yja-status{color:#dbe5f2!important}
.yja-ui[data-yja-edge-open] [data-warn=true]{color:#fde68a!important}
@media (pointer:fine){
.yja-ui[data-yja-edge-open]:not([data-dock=bottom]) .yja-topbar{gap:2px;padding-bottom:3px}
.yja-ui[data-yja-edge-open]:not([data-dock=bottom]) .yja-topbar button{min-height:24px;min-width:0;display:flex;align-items:center;justify-content:center;gap:3px;padding:2px;font-size:11px}
.yja-ui[data-yja-edge-open]:not([data-dock=bottom]) .yja-mode-readout{padding:2px;line-height:1.2}
.yja-ui[data-yja-edge-open]:not([data-dock=bottom]) .yja-group{gap:3px}
.yja-ui[data-yja-edge-open]:not([data-dock=bottom]) .yja-sep{padding-top:3px}
.yja-ui[data-yja-edge-open]:not([data-dock=bottom]) .yja-widths{grid-template-columns:repeat(3,minmax(0,1fr));gap:2px}
.yja-ui[data-yja-edge-open]:not([data-dock=bottom]) .yja-widths button{font-size:10px;font-weight:600}
.yja-ui[data-yja-edge-open]:not([data-dock=bottom]) .yja-style-group .yja-swatches button{min-height:24px}
.yja-ui[data-yja-edge-open]:not([data-dock=bottom]) .yja-custom-color input{height:24px}
.yja-ui[data-yja-edge-open]:not([data-dock=bottom]) .yja-opacity-label{gap:0;line-height:1.25}
.yja-ui[data-yja-edge-open]:not([data-dock=bottom]) :is(.yja-primary-group,.yja-shape-group,.yja-utility-group,.yja-scope-group,.yja-history-group,.yja-action-group) button{display:flex;align-items:center;justify-content:center;gap:2px;min-height:26px;padding:2px 1px}
.yja-ui[data-yja-edge-open]:not([data-dock=bottom]) :is(.yja-primary-group,.yja-shape-group,.yja-utility-group,.yja-scope-group,.yja-history-group,.yja-action-group) button small{font-size:10px;overflow-wrap:anywhere}
.yja-ui[data-yja-edge-open]:not([data-dock=bottom]) :is(.yja-history-group,.yja-action-group) button svg{display:none}
.yja-ui[data-yja-edge-open]:not([data-dock=bottom]) :is(.yja-widths,.yja-history-group) button{height:24px;min-height:24px;max-height:24px;line-height:1.15;padding:1px}
.yja-ui[data-yja-edge-open]:not([data-dock=bottom]) .yja-scope-group button{grid-column:1/-1}
.yja-ui[data-yja-edge-open]:not([data-dock=bottom]) .yja-preset{min-height:28px}
}
@media print{.yja-edge-tab{display:none!important}}
`;
let edgeDrawer = null;
function installEdgeDrawer() {
  const panel = document.querySelector('.yja-ui');
  if (!panel) throw Error('toolbar not found');
  const tab = document.createElement('button');
  tab.type = 'button'; tab.className = 'yja-edge-tab'; tab.title = '판서 도구 펼치기';
  tab.setAttribute('aria-label','판서 도구 펼치기'); tab.setAttribute('aria-expanded','false');
  document.body.append(tab);
  let enabled = false, open = false, timer = 0, last = null, keyboard = false, held = null;
  const clear = () => { clearTimeout(timer); timer = 0; };
  const side = () => panel.dataset.dock === 'left' ? 'left' : panel.dataset.dock === 'bottom' ? 'bottom' : 'right';
  const sync = () => { tab.dataset.dock = side(); };
  const contains = target => !!target && (panel.contains(target) || tab.contains(target));
  const focusHeld = () => (keyboard || document.activeElement?.matches?.('.yja-custom-color input')) && contains(document.activeElement) && document.activeElement !== tab;
  function setOpen(value) {
    clear(); open = enabled && value;
    if (!open && panel.contains(document.activeElement)) document.activeElement.blur();
    panel.dataset.yjaEdgeOpen = String(open); panel.inert = !open;
    tab.setAttribute('aria-expanded',String(open));
    tab.title = open ? '판서 도구 열림' : '판서 도구 펼치기';
  }
  function nearEdge(e) {
    const w=document.documentElement.clientWidth,h=document.documentElement.clientHeight;
    if (side()==='left') return e.clientX <= 10;
    if (side()==='bottom') return e.clientY >= h-10;
    return e.clientX >= w-10;
  }
  function later() {
    if (!enabled || !open || timer || held!==null || focusHeld()) return;
    timer = setTimeout(() => {
      timer=0;
      if (held!==null || focusHeld()) return;
      if (last && (contains(document.elementFromPoint(last.x,last.y)) || last.edge)) return;
      setOpen(false);
    }, 5400);
  }
  function move(e) {
    if (!enabled) return;
    const hover = e.buttons === 0 && e.pointerType !== 'touch';
    last={x:e.clientX,y:e.clientY,edge:hover && nearEdge(e)};
    if (contains(e.target) || last.edge) { clear(); if (hover && (last.edge || tab.contains(e.target))) setOpen(true); }
    else later();
  }
  window.addEventListener('pointermove',move,true);
  window.addEventListener('pointerdown',e=>{
    if(!enabled)return;
    keyboard=false;
    if(contains(e.target)){held=e.pointerId;clear();}
    else {if(document.activeElement?.matches?.('.yja-custom-color input'))document.activeElement.blur();last={x:e.clientX,y:e.clientY,edge:false};later();}
  },true);
  function release(e){if(held===e.pointerId){held=null;if(last && !contains(document.elementFromPoint(last.x,last.y)) && !last.edge)later();}}
  window.addEventListener('pointerup',release,true);
  window.addEventListener('pointercancel',release,true);
  document.documentElement.addEventListener('pointerleave',()=>{last=null;later();});
  window.addEventListener('blur',()=>{held=null;last=null;keyboard=false;later();});
  window.addEventListener('keydown',e=>{if(e.key==='Tab')keyboard=true;},true);
  tab.addEventListener('click',e=>{if(!enabled)return;setOpen(true);if(e.detail===0){keyboard=true;panel.querySelector('button:not([disabled])')?.focus({preventScroll:true});}});
  panel.addEventListener('focusout',()=>{queueMicrotask(later);});
  new MutationObserver(sync).observe(panel,{attributes:true,attributeFilter:['data-dock']});
  sync();
  return {enable(value){enabled=value;held=null;last=null;keyboard=false;tab.hidden=!value;setOpen(false);}};
}

async function toggle() {
  if (busy) return;
  if (failed) { report('failed'); return; }
  busy = true;
  const bridge = bookmarkBridge;
  try {
    let result;
    if (bridge.state() === 'ready') result = bridge.toggle();
    else {
      result = await bridge.prepare();
      if (result !== 'prepared') { report(result); return; }
      style = document.createElement('style'); style.textContent = css + edgeCss; document.head.append(style);
      loadCore();
      result = bridge.complete();
      if (result !== 'on') throw new Error('activation incomplete');
      edgeDrawer = installEdgeDrawer();
    }
    if (result === 'on' || result === 'off') edgeDrawer?.enable(result === 'on');
    report(result);
  } catch (error) {
    failed = true;
    if (bridge.cleanup()) style?.remove();
    report('failed', String(error?.message || error));
  } finally { busy = false; }
}
window.addEventListener('keydown', event => {
  if (failed || bookmarkBridge.state() !== 'ready') return;
  if (event.defaultPrevented || event.repeat || event.isComposing || event.ctrlKey || event.metaKey) return;
  const original = event.altKey && event.shiftKey && event.code === 'KeyY';
  const alternate = !event.altKey && !event.shiftKey && event.code === 'F8';
  if (!original && !alternate) return;
  if (original && event.target?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"])')) return;
  event.preventDefault();
  toggle();
}, true);
Object.defineProperty(window, '__YJA_BOOKMARK_V1', {value: Object.freeze({version:'42.0.0',toggle}),configurable:false});
toggle();
})();
