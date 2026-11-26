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
 def path(pts):
  page.mouse.move(*pts[0]);page.mouse.down()
  for x,y in pts[1:]:page.mouse.move(x,y,steps=3)
  page.mouse.up();page.wait_for_timeout(100)
 check('shape controls directly available',all(b(k).is_visible() for k in ['자동 도형','축 정렬','직선','사각형']))
 path([(520,180),(560,185),(610,178),(660,188),(730,182)])
 check('ordinary pen unchanged',saved()[-1]['tool']=='pen')
 b('자동 도형').click()
 path([(520,260),(560,266),(610,254),(660,269),(730,263)])
 q=saved()[-1];check('rough horizontal corrected',q['tool']=='line' and q['points'][0][1]==q['points'][1][1])
 b('취소').click();check('undo restores rough pen',saved()[-1]['tool']=='pen');b('복원').click();check('redo restores line',saved()[-1]['tool']=='line')
 path([(780,300),(840,305),(910,298),(995,305),(1000,350),(993,410),(925,414),(850,406),(781,412),(776,357),(780,309)])
 q=saved()[-1];check('rough box corrected',q['tool']=='rect' and len(q['points'])==2)
 path([(60,260),(100,255),(145,268),(190,263)])
 q=saved()[-1];check('background straight line',q['tool']=='line' and q['anchor']=='__yja_page__')
 path([(1120,300),(1125,350),(1117,400),(1127,450)])
 q=saved()[-1];check('rough vertical corrected',q['tool']=='line' and q['points'][0][0]==q['points'][1][0])
 path([(520,450),(555,510),(590,450),(625,510)])
 check('zigzag preserved',saved()[-1]['tool']=='pen')
 b('축 정렬').click();path([(520,570),(580,575),(640,590),(700,596)])
 q=saved()[-1];check('axis off keeps incline',q['tool']=='line' and q['points'][0][1]!=q['points'][1][1])
 b('직선').click();draw(550,630,730,650);check('explicit line',saved()[-1]['tool']=='line')
 b('사각형').click();draw(820,530,1010,650);check('explicit rectangle',saved()[-1]['tool']=='rect')
 b('펜').click();check('normal pen exits recognition',b('자동 도형').get_attribute('aria-pressed')=='false')
 page.screenshot(path=str(root/'shape_ui_preview.png'))
 check('no browser exceptions',not errors);browser.close()
print(f'{n} shape UI checks passed')
