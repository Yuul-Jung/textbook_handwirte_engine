from pathlib import Path
from playwright.sync_api import sync_playwright
import json,re,sys
root=Path(sys.argv[1]) if len(sys.argv)>1 else Path(__file__).resolve().parent.parent
lesson=root/'yja-annotation-pilot'/'lesson'; a=lesson/'annotation'
html=(lesson/'index.html').read_text();html=re.sub(r'<script src="annotation/[^\"]+" defer></script>','',html).replace('<link rel="stylesheet" href="annotation/annotation.css">','')
html=html.replace('</head>','<style>'+(a/'annotation.css').read_text()+'</style></head>').replace('</body>','<script>const m=new Map();Object.defineProperty(window,"localStorage",{value:{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)}});window.addEventListener("pointerdown",e=>window.pid=e.pointerId,true);</script><script>'+(a/'annotation-config.js').read_text()+'</script><script>'+(a/'annotation.js').read_text()+'</script></body>')
key='yja:'+json.dumps(['amd-soc-rtl-pilot','part02-01','v15-fixture'],separators=(',',':')); results=[]
def check(n,v):
 results.append(bool(v));print(('PASS ' if v else 'FAIL ')+n,flush=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page(viewport={'width':1640,'height':900});page.set_default_timeout(5000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.set_content(html);page.get_by_role('button',name='펜',exact=True).click();page.locator('#io').evaluate('e=>e.scrollIntoView()');page.wait_for_timeout(250)
 saved=lambda:page.evaluate('(k)=>JSON.parse(localStorage.getItem(k)||\'{"strokes":[]}\').strokes',key)
 page.evaluate('window.loss=[];window.addEventListener("lostpointercapture",e=>loss.push([e.pointerId,e.buttons,e.isTrusted]),true)')
 def ensure_pen():
  btn=page.get_by_role("button",name="펜",exact=True)
  if btn.get_attribute("aria-pressed")!="true":btn.click()
 def start(y):
  ensure_pen();page.mouse.move(60,y);page.mouse.down();page.mouse.move(90,y,steps=2)
 def lose():
  page.evaluate('document.querySelector(".yja-layer").releasePointerCapture(window.pid)')
 def end(y):
  page.mouse.move(130,y,steps=2);page.mouse.up();page.wait_for_timeout(60)
 def cancel(y):
  page.evaluate('y=>window.dispatchEvent(new PointerEvent("pointercancel",{pointerId:window.pid,pointerType:"mouse",buttons:0,clientX:90,clientY:y,bubbles:true}))',y)
 n=len(saved());start(170);lose();end(170);check('real capture loss with button down observed',any(q[1]==1 and q[2] for q in page.evaluate('loss')));check('capture loss retains exactly one stroke',len(saved())==n+1)
 if len(saved())==n+1:
  s=saved()[-1];check('recovered stroke retains final endpoint',abs(s['points'][-1][0]*s['layout'][0]-130)<1)
 else:check('recovered stroke retains final endpoint',False)
 n=len(saved());start(220);lose();page.mouse.move(100,220);cancel(220);end(220);check('true cancellation after loss discards stroke',len(saved())==n)
 n=len(saved());start(270);lose();page.mouse.move(100,270);page.keyboard.press('Escape');end(270);check('Escape after loss discards stroke',len(saved())==n)
 n=len(saved());start(320);lose();page.mouse.move(100,320);page.evaluate('window.dispatchEvent(new Event("blur"))');end(320);check('blur after loss discards stroke',len(saved())==n)
 n=len(saved());ensure_pen();page.mouse.click(80,370);check('next normal input commits once',len(saved())==n+1)
 page.evaluate('()=>{window.originalCapture=document.querySelector(".yja-layer").setPointerCapture;document.querySelector(".yja-layer").setPointerCapture=()=>{throw new DOMException("forced capture failure","NotFoundError")};}')
 n=len(saved());start(420);end(420);check('capture API failure falls back to window tracking',len(saved())==n+1)
 page.evaluate('()=>{document.querySelector(".yja-layer").setPointerCapture=window.originalCapture}')
 n=len(saved());start(470);lose();page.mouse.move(100,470);page.mouse.up();page.wait_for_timeout(60);check('no duplicated commit from layer and window',len(saved())==n+1)
 check('committed ink and visible nodes agree',page.locator('.yja-layer>[data-stroke]').count()==len(saved()));check('unique IDs',len({s['id'] for s in saved()})==len(saved()));check('no browser exception',not errors)
 b.close()
print(f'{sum(results)}/{len(results)} capture checks passed');sys.exit(0 if all(results) else 1)
