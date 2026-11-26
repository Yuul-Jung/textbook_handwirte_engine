from pathlib import Path
import json,re
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
lesson=root/'yja-annotation-pilot'/'lesson'; assets=lesson/'annotation'
html=(lesson/'index.html').read_text();css=(assets/'annotation.css').read_text();conf=(assets/'annotation-config.js').read_text();js=(assets/'annotation.js').read_text()
html=re.sub(r'<script src="annotation/[^\"]+" defer></script>','',html).replace('<link rel="stylesheet" href="annotation/annotation.css">','')
html=html.replace('</head>','<style>'+css+'</style></head>').replace('</body>','<script>const m=new Map();Object.defineProperty(window,"localStorage",{value:{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)}});</script><script>'+conf+'</script><script>'+js+'</script></body>')
n=0
def check(name,ok):
 global n
 assert ok,name
 n+=1;print('PASS',name,flush=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=browser.new_page(viewport={'width':1640,'height':900});page.set_default_timeout(5000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.set_content(html)
 b=lambda name:page.get_by_role('button',name=name,exact=True,include_hidden=True)
 click=lambda name:b(name).click()
 on=lambda name:b(name).get_attribute('aria-pressed')=='true'
 shapes=['자동 도형','직선','사각형','화살표','타원']
 def active():return [s for s in shapes if on(s)]
 def readout():return page.locator('.yja-mode-readout').inner_text()
 key='yja:'+json.dumps(['amd-soc-rtl-pilot','part02-01','v15-fixture'],separators=(',',':'))
 saved=lambda:page.evaluate('(k)=>JSON.parse(localStorage.getItem(k)||\'{"strokes":[]}\').strokes',key)
 def draw(pts):
  page.mouse.move(*pts[0]);page.mouse.down()
  for x,y in pts[1:]:page.mouse.move(x,y,steps=4)
  page.mouse.up();page.wait_for_timeout(80)
 click('펜');page.locator('#io').evaluate('(e)=>e.scrollIntoView()');page.wait_for_timeout(200)
 click('더보기')
 # Test every shape button, both ink media, every toggle, and button/visible state agreement.
 for medium in ['펜','형광펜']:
  for shape in shapes:
   click(medium);click(shape);check(medium+' '+shape+' exclusively selected',active()==[shape] and shape in readout())
   click(shape);check(medium+' '+shape+' repeat returns free',active()==[] and on(medium) and readout().startswith(medium))
 for medium in ['펜','형광펜']:
  click(medium);click('자동 도형');click('직선');check(medium+' shape switch',active()==['직선']);click('사각형');check(medium+' second shape switch',active()==['사각형']);click('지우개');check(medium+' eraser clears shape',active()==[] and on('지우개'));click('직선');check(medium+' last medium resumed',active()==['직선'] and (on('형광펜')==(medium=='형광펜')));click(medium)
 # Preset and shortcuts must have identical free-tool semantics.
 click('펜');click('자동 도형');click('프리셋 3');check('preset clears automatic correction',on('펜') and not active() and on('프리셋 3'))
 click('형광펜');click('직선');page.keyboard.press('4');check('keyboard preset clears highlight shape',on('형광펜') and not active())
 click('사각형');page.keyboard.press('p');check('P resets all shape state',on('펜') and not active())
 click('자동 도형');page.keyboard.press('h');check('H resets all shape state',on('형광펜') and not active())
 click('직선');page.keyboard.press('Escape');check('Esc geometry to same medium',on('형광펜') and not active());page.keyboard.press('Escape');check('Esc closes more',b('더보기').get_attribute('aria-expanded')=='false' and on('형광펜'));page.keyboard.press('Escape');check('Esc free ink to reading',on('읽기'))
 click('프리셋 1');click('굵기 4 px');draw([(80,250),(130,257),(180,250)]);ink=saved()[-1];click('직선');draw([(80,320),(180,332)]);q=saved()[-1];check('geometry preserves chosen ink color and width',q['tool']=='line' and (q['color'],q['width'])==(ink['color'],ink['width']));click('직선');draw([(80,385),(130,392),(180,385)]);check('free pen after line toggle',saved()[-1]['tool']=='pen' and len(saved()[-1]['points'])>2)
 click('사각형');before=len(saved());draw([(80,450),(180,450)]);check('degenerate rectangle not stored',len(saved())==before);page.mouse.click(80,470);check('accidental click does not store shape',len(saved())==before);click('사각형');page.mouse.click(80,480);page.wait_for_timeout(80);check('free pen dot still stored',len(saved())==before+1)
 click('형광펜');click('더보기');click('타원');draw([(580,220),(740,320)]);q=saved()[-1];check('direct ellipse retains highlighter',q['tool']=='highlight' and len(q['points'])==65);click('타원');click('화살표');draw([(580,360),(740,360)]);q=saved()[-1];check('direct arrow retains highlighter',q['tool']=='highlight' and len(q['points'])==5);check('highlighter arrow opacity',page.locator('[data-stroke="'+q['id']+'"]').get_attribute('opacity')=='.3');click('화살표');check('arrow toggle returns highlighter',not active() and on('형광펜'))
 click('직선');before=len(saved());page.mouse.move(100,530);page.mouse.down();page.mouse.move(180,540,steps=5);page.keyboard.press('Escape');page.mouse.up();page.wait_for_timeout(100);check('Esc cancels only in-flight gesture',len(saved())==before and on('직선'));click('직선')
 click('형광펜');click('백지');page.wait_for_timeout(200);check('whiteboard preserves ink medium',on('형광펜'));click('백지');page.wait_for_timeout(200)
 click('직선');click('판서 도구');check('collapse safely enters reading',on('읽기') and not active());page.keyboard.press('4');check('shortcut expands and returns free highlight',on('형광펜') and not active() and b('판서 도구').get_attribute('aria-expanded')=='true')
 for name,key in [('지우개','e'),('포인터','l'),('편집','v'),('올가미','a')]:
  click('형광펜');click(name);check(name+' active',on(name));click(name);check(name+' repeat returns ink',on('형광펜') and not active());page.keyboard.press(key);page.keyboard.press(key);check(name+' shortcut toggles identically',on('형광펜') and not on(name))
 click('펜');b('직선').focus();page.keyboard.press('Enter');check('keyboard button activation',on('직선'));page.keyboard.press('Enter');check('keyboard button reactivation returns pen',on('펜') and not active());b('직선').evaluate('(e)=>e.blur()')
 click('지우개');page.keyboard.press('Escape');check('Escape transient returns pen',on('펜'))
 for w,h in [(1920,1080),(1366,768),(1024,768),(390,700)]:
  page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(120);r=page.locator('.yja-ui').bounding_box();check(f'{w}x{h} toolbar within viewport',r['x']>=-1 and r['y']>=-1 and r['x']+r['width']<=w+1 and r['y']+r['height']<=h+1)
 page.set_viewport_size({'width':1640,'height':900});page.wait_for_timeout(150);page.locator('#io').evaluate('(e)=>e.scrollIntoView()');page.wait_for_timeout(150);click('형광펜');click('직선');draw([(570,265),(810,270)]);click('직선');click('펜');click('사각형');draw([(850,325),(1050,410)]);click('사각형');click('직선');
 check('no browser exceptions',not errors)
 page.screenshot(path=str(root/'ux_preview_v24.png'));browser.close()
print(f'{n} usability checks passed')
