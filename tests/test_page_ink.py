from pathlib import Path
import json,re,os
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent;lesson=root/'yja-annotation-pilot'/'lesson';assets=lesson/'annotation'
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
 b=lambda name:page.get_by_role('button',name=name,exact=True)
 b('펜').click();page.locator('#io').evaluate('(e)=>e.scrollIntoView()');page.wait_for_timeout(250)
 def draw(x,y,x2,y2):
  page.mouse.move(x,y);page.mouse.down();page.mouse.move(x2,y2,steps=12);page.mouse.up();page.wait_for_timeout(120)
 key='yja:'+json.dumps(['amd-soc-rtl-pilot','part02-01','v15-fixture'],separators=(',',':'))
 saved=lambda:page.evaluate('(k)=>JSON.parse(localStorage.getItem(k)||\'{"strokes":[]}\').strokes',key)
 box=page.locator('#io').bounding_box(); nxt=page.locator('#diagram').bounding_box();x=box['x']+120;y=box['y']+60
 check('page mode enabled',b('전체 판서').get_attribute('aria-pressed')=='true')
 draw(80,200,170,300);check('left outer background stroke',len(saved())==1 and saved()[0]['anchor']=='__yja_page__')
 draw(box['x']+box['width']+15,200,box['x']+box['width']+45,290);check('right outer background stroke',len(saved())==2)
 draw(x,y,x,nxt['y']+65);ss=saved();check('one continuous stroke across sections and gap',len(ss)==3 and len(ss[-1]['points'])>=10 and ss[-1]['points'][-1][1]>ss[-1]['points'][0][1])
 check('all three rendered',page.locator('.yja-layer>[data-stroke]').count()==3)
 page.screenshot(path=str(root/'page_ink_preview.png'))
 page.evaluate('window.scrollBy(0,150)');page.wait_for_timeout(160);check('document scrolling preserves strokes',page.locator('.yja-layer>[data-stroke]').count()==3)
 b('취소').click();check('undo entire crossing stroke',len(saved())==2);b('복원').click();check('redo entire crossing stroke',len(saved())==3)
 page.evaluate('window.scrollBy(0,-150)');page.wait_for_timeout(160);b('지우개').click();draw(80,200,170,300);check('background eraser',len(saved())==2)
 b('전체 판서').click();b('펜').click();draw(80,200,170,300);check('section mode excludes background',len(saved())==2)
 draw(x,y,x+60,y+20);check('legacy section mode stores section anchor',saved()[-1]['anchor']=='io')
 b('절별 판서').click();b('펜+마우스').click();n0=len(saved());draw(80,200,170,300);check('pen-only mouse is not captured',len(saved())==n0)
 b('펜만 판서').click();b('읽기').click();draw(80,200,170,300);check('reading mode does not write',len(saved())==n0)
 b('펜').click();page.locator('nav a[href="#diagram"]').click();page.wait_for_timeout(100);check('nav links work even in pen mode',page.evaluate('location.hash')=='#diagram' and len(saved())==n0)
 page.set_viewport_size({'width':1000,'height':900});page.wait_for_timeout(200);check('actual narrow reflow hides affected strokes without data loss',page.locator('.yja-layer>[data-stroke]').count()<n0 and len(saved())==n0)
 page.set_viewport_size({'width':1640,'height':900});page.wait_for_timeout(200);check('return to original layout restores strokes',page.locator('.yja-layer>[data-stroke]').count()==n0)
 # Page strokes are included in a section crop; margins explicitly excluded.
 b('출력').click();page.get_by_role('combobox',name='출력 범위').select_option('section:io');page.get_by_role('button',name='미리보기 생성').click();page.wait_for_function("document.querySelector('.yja-output-card img')?.complete && document.querySelector('.yja-output-card img')?.naturalWidth>0",timeout=20000)
 check('section PNG with page ink generated',page.locator('.yja-output-card img').count()==1)
 check('margin exclusion explicitly warned','절 밖 여백' in page.locator('.yja-output-message').text_content())
 page.get_by_role('button',name='닫기',exact=True).click()
 # Simulated pen in pen-only mode in the outer margin (physical tablet not tested).
 b('펜').click();b('펜+마우스').click();before=len(saved());cdp=page.context.new_cdp_session(page)
 for t,x0,y0,buttons,force in [('mousePressed',80,230,1,.35),('mouseMoved',130,260,1,.7),('mouseReleased',150,280,0,0)]:
  cdp.send('Input.dispatchMouseEvent',dict(type=t,x=x0,y=y0,button='left' if t!='mouseMoved' else 'none',buttons=buttons,clickCount=1,pointerType='pen',force=force))
 page.wait_for_timeout(150);check('simulated pen writes in outer margin',len(saved())==before+1 and saved()[-1]['anchor']=='__yja_page__')
 check('no browser exceptions',not errors);browser.close()
print(f'{n} page ink checks passed')
