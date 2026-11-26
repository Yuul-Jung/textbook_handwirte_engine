/* YJA shared loader v32: pinned releases; external mode only. */
(() => {
    'use strict';
    const source = document.currentScript;
    if (!source || Object.prototype.hasOwnProperty.call(window, 'YJA_LOADER')) return;
    const pins = Object.freeze({
        'annotation.css': 'sha384-Ceyn/+DFNojEBXMG06IQgWQ2Cwuhgd/xjSU4jG8x2zpsNjAKFg03Uo8usToHbXBr',
        'annotation-config.js': 'sha384-MdCI9V/+E0YEHzFWOF7EzFJXOaoOa42VADq7Ar3HKuGXpx3x981y4w8evd2vQWQ7',
        'annotation.js': 'sha384-ztqCcXxf6b4ExQT4k35WdFG4ZjsvrNB1AiDcU6jf00b77DmfMB3JT2I3q0RvznPr'
    });
    // v32 deliberately keeps the validated v31 core byte-for-byte identical.
    const releases = Object.freeze({v31: pins, v32: pins});
    const release = source.dataset.yjaRelease ?? 'v32';
    let state = 'loading', reason = '', enteredEngine = false, validatedConfig = null;
    const owned = [];
    const api = Object.freeze({get state(){return state;}, get release(){return release;}, get reason(){return reason;}});
    Object.defineProperty(window, 'YJA_LOADER', {value: api, configurable: false});
    const fail = err => {
        reason = String(err.message || err);
        // Never attempt hot rollback after code could have installed listeners.
        state = enteredEngine ? 'reload-required' : 'disabled';
        if (!enteredEngine) { owned.forEach(e => e.remove()); if (validatedConfig) delete validatedConfig.yjaExternalConfig; }
        console.warn('YJA loader: '+reason);
    };
    function asset(base, name, hashes) {
        return new Promise((resolve, reject) => {
            const css = name.endsWith('.css');
            const node = document.createElement(css ? 'link' : 'script');
            node.integrity = hashes[name]; node.crossOrigin = 'anonymous';
            node.dataset.yjaLoaderAsset = name;
            if (source.nonce) node.nonce = source.nonce;
            node.addEventListener('load', resolve, {once:true});
            node.addEventListener('error', () => reject(Error('asset rejected: '+name)), {once:true});
            if (css) { node.rel = 'stylesheet'; node.href = new URL(name, base).href; }
            else { node.async = false; node.src = new URL(name, base).href; }
            owned.push(node); document.head.append(node);
        });
    }
    async function start() {
        try {
            if (!Object.prototype.hasOwnProperty.call(releases, release)) throw Error('unsupported release');
            if (!/^https?:$/.test(location.protocol)) throw Error('HTTP(S) required');
            const base = new URL('releases/'+release+'/', source.src);
            if (!/^https?:$/.test(base.protocol)) throw Error('HTTP(S) assets required');
            const configs = document.querySelectorAll('script[type="application/json"][data-yja-config]');
            if (configs.length !== 1 || document.querySelector('[data-yja-content],.yja-ui,#yja-server-config') || document.documentElement.hasAttribute('data-yja-config-error')) throw Error('one independent external configuration required');
            const config = configs[0], value = JSON.parse(config.textContent);
            if (value?.external !== true || value?.pageInk !== true || config.yjaExternalConfig) throw Error('external pageInk configuration required');
            const hashes = releases[release]; validatedConfig = config;
            await asset(base, 'annotation.css', hashes);
            await asset(base, 'annotation-config.js', hashes);
            if (!config.yjaExternalConfig) {
                // The legacy adapter sets this diagnostic; only clear the marker it added.
                if (document.documentElement.dataset.yjaConfigError === 'true') delete document.documentElement.dataset.yjaConfigError;
                throw Error('configuration rejected');
            }
            // Distinguish resource rejection from a runtime exception during execution.
            let executionError = false;
            const onError = e => { if (e instanceof ErrorEvent) executionError = true; };
            window.addEventListener('error', onError);
            try { await asset(base, 'annotation.js', hashes); }
            finally { window.removeEventListener('error', onError); }
            enteredEngine = true;
            if (executionError) throw Error('engine execution error');
            if (!config.yjaExternalActive && !document.querySelector('.yja-ui')) {
                enteredEngine = false; delete config.yjaExternalConfig;
                throw Error('engine declined activation');
            }
            if (!config.yjaExternalActive || document.querySelectorAll('.yja-ui').length !== 1) throw Error('incomplete engine activation');
            state = 'ready';
        } catch (err) { fail(err); }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
    else start();
})();
