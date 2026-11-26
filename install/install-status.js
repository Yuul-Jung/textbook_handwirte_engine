/* Stable installer: informational detection, never grants browser permissions. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const valid = v => typeof v === 'string' && /^\d{1,6}(\.\d{1,6}){2}$/.test(v);
  const cmp = (a,b) => {const x=a.split('.').map(Number),y=b.split('.').map(Number);for(let i=0;i<3;i++)if(x[i]!==y[i])return Math.sign(x[i]-y[i]);return 0;};
  let latest = null;
  function render() {
    const installed = document.documentElement.dataset.yjaInstalledVersion;
    const known = valid(installed);
    $('installed').textContent = known ? installed : '확인되지 않음';
    $('latest').textContent = latest || '확인되지 않음';
    if (!known) { $('status').textContent='설치 또는 실행 권한 확인 필요 (구버전 포함)'; $('install').textContent='판서 엔진 설치 / 업데이트'; return; }
    if (!latest) { $('status').textContent='설치 확인 · 최신 버전 조회 불가'; $('install').textContent='설치 / 업데이트 확인'; return; }
    const order=cmp(installed,latest);
    $('status').textContent=order<0?'업데이트 가능':order===0?'최신 버전 실행 확인':'설치된 버전이 배포 정보보다 높음';
    $('install').textContent=order<0?'최신 버전으로 업데이트':'설치 / 업데이트 확인';
  }
  async function check() {
    latest=null;render();
    try {
      const res=await fetch('./annotation.meta.js',{cache:'no-cache',credentials:'same-origin'});
      if(!res.ok)throw Error('metadata unavailable');
      const m=(await res.text()).match(/^\/\/\s*@version\s+(\S+)\s*$/m);
      if(!m||!valid(m[1]))throw Error('invalid release');
      latest=m[1];
    } catch {} render();
  }
  new MutationObserver(render).observe(document.documentElement,{attributes:true,attributeFilter:['data-yja-installed-version']});
  $('refresh').addEventListener('click',()=>location.reload());
  $('copy-url').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('install').href);$('copy-result').textContent='주소 복사 완료';}catch{$('copy-result').textContent='아래 주소를 직접 선택해 복사하세요.';}});
  window.addEventListener('pageshow',check);
  check();
})();
