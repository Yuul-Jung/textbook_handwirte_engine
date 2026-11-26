from pathlib import Path
from playwright.sync_api import sync_playwright
import json, re, sys
root=Path(sys.argv[1]) if len(sys.argv)>1 else Path(__file__).resolve().parent.parent; lesson=root/'yja-annotation-pilot'/'lesson'; assets=lesson/'annotation'
html=(lesson/'index.html').read_text(); css=(assets/'annotation.css').read_text(); conf=(assets/'annotation-config.js').read_text(); js=(assets/'annotation.js').read_text()
html=re.sub(r'<script src="annotation/[^\"]+" defer></script>','',html).replace('<link rel="stylesheet" href="annotation/annotation.css">','')
html=html.replace('</head>','<style>'+css+'</style></head>').replace('</body>','<script>'+conf+'</script><script>'+js+'</script></body>')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']); ctx=b.new_context(viewport={'width':1640,'height':900}); page=ctx.new_page(); page.set_default_timeout(2500); errs=[]; page.on('pageerror',lambda e:errs.append(str(e)))
 html=html.replace('<head>','<head><script>const m=new Map();Object.defineProperty(window,"localStorage",{value:{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)}});</script>');page.set_content(html);page.wait_for_timeout(200)
 btn=lambda s:page.get_by_role('button',name=s,exact=True,include_hidden=True)
 on=lambda s:btn(s).get_attribute('aria-pressed')=='true'
 key='yja:'+json.dumps(['amd-soc-rtl-pilot','part02-01','v15-fixture'],separators=(',',':'))
 saved=lambda:page.evaluate('(k)=>JSON.parse(localStorage.getItem(k)||\'{"strokes":[]}\').strokes',key)
 shown=lambda:page.locator('.yja-layer>[data-stroke]').count()
 def draw(x,y,x2,y2):
  page.mouse.move(x,y);page.mouse.down();page.mouse.move(x2,y2,steps=8);page.mouse.up();page.wait_for_timeout(120)
 results=[]
 def check(n,v):
  results.append(bool(v));print(('PASS' if v else 'FAIL')+' '+n,flush=True)
 btn('펜').click();page.locator('#io').evaluate('(e)=>e.scrollIntoView()');page.wait_for_timeout(200);draw(80,200,180,260); ss=saved();check('mock storage initial draw',len(ss)==1 and shown()==1)
 scroll0=page.evaluate('scrollY');path0=page.locator('.yja-layer>[data-stroke] path').get_attribute('d');btn('백지').click();page.wait_for_timeout(250);check('opening whiteboard retains existing chapter stroke visible',shown()==1); print('board open rendered',shown(),'stored',len(saved()),flush=True)
 check('board open keeps original ink geometry',shown()==1 and page.locator('.yja-layer>[data-stroke] path').first.get_attribute('d')==path0)
 btn('백지').click();page.wait_for_timeout(250);check('closing board restores original stroke',shown()==1);check('closing board returns to lecture scroll position',abs(page.evaluate('scrollY')-scroll0)<=2);check('board toggle preserves stored bytes',saved()==ss)
 btn('직선').click();page.keyboard.down('Escape');page.keyboard.down('Escape');page.keyboard.up('Escape');check('held Escape does not cascade from shape to reading',on('펜') and not on('읽기'))
 btn('펜').click();page.keyboard.press('Shift+P');check('modified letter not consumed as plain shortcut',on('펜')) # test from highlight next
 btn('형광펜').click();page.keyboard.press('Shift+P');check('Shift+P preserves highlighter',on('형광펜'))
 # Add a section-anchored stroke, then select it while full-page drawing is active.
 btn('펜').click();btn('전체 판서').click();page.locator('#io').evaluate('(e)=>e.scrollIntoView()');page.wait_for_timeout(200);r=page.locator('#io').bounding_box();x=r['x']+80;y=r['y']+80;draw(x,y,x+100,y);section=saved()[-1];check('section stroke created',section['anchor']=='io');btn('절별 판서').click();btn('편집').click();page.mouse.click(x+50,y);page.wait_for_timeout(100);check('full-page mode can select existing section stroke',page.locator('[data-yja-selection]').count()==1)
 if page.locator('[data-yja-selection]').count():
  draw(x+50,y,x+75,y+20);moved=next(s for s in saved() if s['id']==section['id']);check('cross-scope edit preserves anchor and moves stroke',moved['anchor']=='io' and moved['points']!=section['points']);btn('취소').click();check('cross-scope move undo restores original',next(s for s in saved() if s['id']==section['id'])==section)
 else:check('cross-scope move and undo blocked',False)
 btn('펜').click();before=len(saved());page.mouse.move(80,350);page.mouse.down();page.mouse.move(110,360,steps=3);page.evaluate("window.dispatchEvent(new PointerEvent('pointermove',{pointerType:'mouse',pointerId:1,buttons:0,clientX:120,clientY:360,bubbles:true,cancelable:true}))");page.mouse.move(150,370);page.mouse.up();page.wait_for_timeout(100);check('missed mouse release cancels orphan drag',len(saved())==before);draw(80,380,150,390);check('fresh mouse input after orphan drag works',len(saved())==before+1)
 check('no page errors',not errs);page.screenshot(path=str(Path(__file__).resolve().parent.parent/'audit_preview_v25.png')) if all(results) else None;b.close()
 print(f'{sum(results)}/{len(results)} independent checks passed');sys.exit(0 if all(results) else 1)
