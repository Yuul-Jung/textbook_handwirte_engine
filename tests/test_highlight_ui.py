from pathlib import Path
import json,re,os,math
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
 b('형광펜').click()
 path([(520,180),(560,185),(610,178),(660,188),(730,182)])
 q=saved()[-1];check('free highlight retained',q['tool']=='highlight' and len(q['points'])>2)
 original_style=(q['color'],q['width'])
 b('자동 도형').click();check('auto retains highlight mode',b('형광펜').get_attribute('aria-pressed')=='true' and b('자동 도형').get_attribute('aria-pressed')=='true')
 path([(520,260),(560,266),(610,254),(660,269),(730,263)])
 q=saved()[-1];check('auto horizontal highlight',q['tool']=='highlight' and len(q['points'])==2 and q['points'][0][1]==q['points'][1][1])
 check('style retained',(q['color'],q['width'])==original_style)
 node=page.locator('[data-stroke="'+q['id']+'"]');check('render alpha and width',node.get_attribute('opacity')=='.3' and node.locator('polyline').get_attribute('stroke-width')==str(q['width']+10))
 b('취소').click();check('undo restores highlight raw',saved()[-1]['tool']=='highlight' and len(saved()[-1]['points'])>2);b('복원').click();check('redo restores line',len(saved()[-1]['points'])==2)
 path([(780,300),(840,305),(910,298),(995,305),(1000,350),(993,410),(925,414),(850,406),(781,412),(776,357),(780,309)])
 q=saved()[-1];p=q['points'];check('auto highlight rectangle',q['tool']=='highlight' and len(p)==5 and p[0]==p[4] and p[0][1]==p[1][1] and p[1][0]==p[2][0])
 path([(60,260),(100,255),(145,268),(190,263)])
 q=saved()[-1];check('background highlight line',q['tool']=='highlight' and q['anchor']=='__yja_page__' and len(q['points'])==2)
 path([(1120,300),(1125,350),(1117,400),(1127,450)])
 q=saved()[-1];check('vertical highlight',len(q['points'])==2 and q['points'][0][0]==q['points'][1][0])
 path([(1040+int(60*math.cos(i*math.pi/16)),170+int(35*math.sin(i*math.pi/16))) for i in range(33)])
 q=saved()[-1];check('auto highlight ellipse',q['tool']=='highlight' and len(q['points'])==65 and q['points'][0]==q['points'][-1])
 path([(520,450),(555,510),(590,450),(625,510)])
 check('unrecognized highlight stays raw',saved()[-1]['tool']=='highlight' and len(saved()[-1]['points'])>5)
 b('축 정렬').click();path([(520,570),(580,575),(640,590),(700,596)])
 q=saved()[-1];check('axis off diagonal retained',len(q['points'])==2 and q['points'][0][1]!=q['points'][1][1])
 b('직선').click();draw(550,630,730,650);q=saved()[-1];check('explicit highlight line',q['tool']=='highlight' and len(q['points'])==2 and (q['color'],q['width'])==original_style)
 b('사각형').click();draw(820,530,1010,650);q=saved()[-1];check('explicit highlight rectangle',q['tool']=='highlight' and len(q['points'])==5)
 b('형광펜').click();check('free tool restores mode',b('사각형').get_attribute('aria-pressed')=='false')
 b('지우개').click();before=len(saved());draw(550,630,650,630);check('eraser hits corrected highlight',len(saved())<before)
 b('취소').click();check('erase undo',len(saved())==before)
 b('펜').click();b('직선').click();draw(800,680,1000,680);check('ordinary line unaffected',saved()[-1]['tool']=='line')
 b('형광펜').click();b('자동 도형').click();page.screenshot(path=str(root/'highlight_preview.png'))
 check('no browser exceptions',not errors);browser.close()
print(f'{n} highlight UI checks passed')
