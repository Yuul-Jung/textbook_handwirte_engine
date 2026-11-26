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
