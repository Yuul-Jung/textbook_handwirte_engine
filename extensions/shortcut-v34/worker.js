/* v34: activeTab only. Packaged scripts, no remote executable code. */
const busyTabs = new Set();
const labels = {on:['ON','판서 켜짐'],off:['','판서 꺼짐'],unsupported:['!','지원하지 않는 교재 구조'],conflict:['!','기존 판서 엔진이 있거나 설정 충돌'],busy:['!','출력 창을 닫고 다시 시도'],failed:['!','판서 연결 실패 · 페이지 새로고침 후 재시도'],blocked:['!','허용된 교육 페이지에서 사용하세요']};
async function report(id,state) { const [text,title]=labels[state]||labels.failed; await chrome.action.setBadgeText({tabId:id,text}); await chrome.action.setTitle({tabId:id,title:title+' (Alt+Shift+Y)'}); }
async function invoke(target, method) {
  const [r] = await chrome.scripting.executeScript({target,func:m=>globalThis.__yjaShortcut[m](),args:[method]}); return r.result;
}
chrome.action.onClicked.addListener(async tab => {
  if (!Number.isInteger(tab.id) || busyTabs.has(tab.id)) return;
  const id=tab.id; busyTabs.add(id); let css=false, target=null;
  try {
    const url=new URL(tab.url);
    if (!(url.protocol==='https:' && url.hostname==='yuul-jung.github.io')) {await report(id,'blocked');return;}
    const [injection]=await chrome.scripting.executeScript({target:{tabId:id},files:['bridge.js']});
    if(!injection?.documentId)throw Error('document identity unavailable');
    target={tabId:id,documentIds:[injection.documentId]};
    const state=await invoke(target,'state');
    if(state==='ready'){await report(id,await invoke(target,'toggle'));return;}
    if(state==='pending'){await report(id,'failed');return;}
    const result=await invoke(target,'prepare');
    if(result!=='prepared'){await report(id,result);return;}
    await chrome.scripting.insertCSS({target,files:['annotation.css']});css=true;
    await chrome.scripting.executeScript({target,files:['annotation-config.js','annotation.js']});
    const final=await invoke(target,'complete');
    if(final!=='on')throw Error('activation incomplete');
    await report(id,'on');
  } catch(e) {
    try{if(target && await invoke(target,'cleanup') && css)await chrome.scripting.removeCSS({target,files:['annotation.css']});}catch{}
    try{await report(id,'failed');}catch{}
  } finally {busyTabs.delete(id);}
});
