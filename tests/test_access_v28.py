from pathlib import Path
from playwright.sync_api import sync_playwright
import re,sys,json
root=Path(sys.argv[1]) if len(sys.argv)>1 else Path(__file__).resolve().parent.parent
lesson=root/'yja-annotation-pilot'/'lesson'; assets=lesson/'annotation'
html=(lesson/'index.html').read_text(); css=(assets/'annotation.css').read_text(); conf=(assets/'annotation-config.js').read_text(); js=(assets/'annotation.js').read_text()
html=re.sub(r'<script src="annotation/[^\"]+" defer></script>','',html).replace('<link rel="stylesheet" href="annotation/annotation.css">','')
html=html.replace('</head>','<style>'+css+'</style></head>').replace('</body>','<script>const m=new Map();Object.defineProperty(window,"localStorage",{value:{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)}});</script><script>'+conf+'</script><script>'+js+'</script></body>')
results=[]
def check(name,ok):
 results.append(bool(ok));print(('PASS ' if ok else 'FAIL ')+name,flush=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=browser.new_page(viewport={'width':1366,'height':768});page.set_default_timeout(5000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.set_content(html)
 b=lambda n:page.get_by_role('button',name=n,exact=True,include_hidden=True)
 on=lambda n:b(n).get_attribute('aria-pressed')=='true'
 def key(k):page.keyboard.press(k)
 def reset():
  page.evaluate('document.activeElement.blur()');key('p')
 def focused(n):return b(n).evaluate('(e)=>e===document.activeElement')
 def visible_in_toolbar(n):
  return b(n).evaluate('e=>{const r=e.getBoundingClientRect(),u=e.closest(".yja-ui").getBoundingClientRect(),h=e.closest(".yja-ui").querySelector(".yja-topbar").getBoundingClientRect();return r.top>=h.bottom-1&&r.bottom<=u.bottom+1&&r.width>0}')
 reset()
 for k,n in [('g','자동 도형'),('i','직선'),('b','사각형'),('j','화살표'),('o','타원')]:
  reset();key(k);check(k+' activates '+n,on(n));key(k);check(k+' toggles back to pen',on('펜') and not on(n))
 reset();key('h');key('j');check('shortcut retains highlighter medium',on('형광펜') and on('화살표'));key('j');check('shortcut returns free highlighter',on('형광펜') and not on('화살표'))
 reset();b('펜').focus();key('e');check('shortcut works with own toolbar button focused',on('지우개'));key('h');check('second shortcut without Tab or click',on('형광펜'))
 reset();b('더보기').click();check('opening more reveals first item without another scroll',visible_in_toolbar('화살표'));b('더보기').click()
 b('더보기').focus();key('Enter');check('keyboard open focuses first menu control',focused('화살표'));key('Escape');check('closing more restores focus to trigger',focused('더보기') and b('더보기').get_attribute('aria-expanded')=='false')
 reset();b('더보기').click();b('타원').focus();b('판서 도구').click();check('collapse resets toolbar scroll',page.locator('.yja-ui').evaluate('e=>e.scrollTop')==0);key('p');check('keyboard reopen keeps primary pen accessible',visible_in_toolbar('펜'))
 reset();grip=b('도구 모음 이동');grip.focus();before=page.locator('.yja-ui').bounding_box();key('ArrowLeft');after=page.locator('.yja-ui').bounding_box();check('keyboard grip moves toolbar left',after['x']<before['x'] and page.locator('.yja-ui').get_attribute('data-dock')=='float')
 reset();key('h');page.locator('body').evaluate('e=>{const i=document.createElement("input");i.id="v28-text";e.append(i);i.focus()}');key('i');check('typing is not intercepted',page.locator('#v28-text').input_value()=='i' and on('형광펜'));page.locator('#v28-text').evaluate('e=>e.remove()');key('Shift+I');check('modified shortcut not intercepted',on('형광펜') and not on('직선'))
 reset();b('펜').focus();key('Space');check('Space on focused button still activates button',on('펜') and '일시 탐색' not in page.locator('.yja-mode-readout').inner_text())
 check('no browser exceptions',not errors);browser.close()
print(f'{sum(results)}/{len(results)} accessibility checks passed');sys.exit(0 if all(results) else 1)
