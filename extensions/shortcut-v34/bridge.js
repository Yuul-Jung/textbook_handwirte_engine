/* v34: isolated-world adapter. Never change original lesson markup. */
(() => {
  if (globalThis.__yjaShortcut) return;
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
  globalThis.__yjaShortcut = {prepare, complete, toggle, cleanup, state:()=>ready?'ready':config?'pending':'new'};
})();
