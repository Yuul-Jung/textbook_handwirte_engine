"""Standalone HTML with mock storage in Chromium; direct navigation blocked by sandbox policy."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parent.parent
n=0
def check(name,ok):
 global n
 assert ok,name;n+=1;print('PASS '+name,flush=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page(viewport={'width':1640,'height':900});page.set_default_timeout(5000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 html=(root/'annotation_course_v30.html').read_text()
 def boot(raw=None):
  page.goto('about:blank');key='yja:'+json.dumps(['amd-soc-rtl-pilot','part02-01','v15-fixture'],separators=(',',':'))
  data=json.dumps([[key,raw]] if raw else []);mock='<script>const m=new Map('+data+');Object.defineProperty(window,"localStorage",{value:{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)}});</script>'
  page.set_content(html.replace('</head>',mock+'</head>',1));page.wait_for_timeout(250)
 boot()
 btn=lambda name:page.get_by_role('button',name=name,exact=True,include_hidden=True)
 on=lambda name:btn(name).get_attribute('aria-pressed')=='true'
 key='yja:'+json.dumps(['amd-soc-rtl-pilot','part02-01','v15-fixture'],separators=(',',':'))
 saved=lambda:page.evaluate('(k)=>localStorage.getItem(k)',key)
 page.keyboard.press('h');page.keyboard.press('i');check('standalone shape shortcut selects highlighter line',on('형광펜') and on('직선'))
 page.locator('#io').evaluate('e=>e.scrollIntoView()');page.wait_for_timeout(200);page.mouse.move(80,200);page.mouse.down();page.mouse.move(180,205,steps=5);page.mouse.up();page.wait_for_timeout(120)
 raw=saved();check('mock storage saves a two-point highlighter line',raw is not None and len(json.loads(raw)['strokes'])==1 and json.loads(raw)['strokes'][0]['tool']=='highlight' and len(json.loads(raw)['strokes'][0]['points'])==2)
 boot(raw);check('standalone reinitialization preserves saved bytes and visible stroke',saved()==raw and page.locator('.yja-layer>[data-stroke]').count()==1)
 page.keyboard.press('p');btn('더보기').click();dock=page.get_by_role('combobox',name='도구 위치');dock.select_option('left');check('left dock selectable',page.locator('.yja-ui').get_attribute('data-dock')=='left')
 grip=btn('도구 모음 이동');grip.focus();r=page.locator('.yja-ui').bounding_box();page.keyboard.press('Shift+ArrowRight');q=page.locator('.yja-ui').bounding_box();check('keyboard grip fast step 48 CSS px',abs(q['x']-r['x']-48)<=1 and dock.input_value()=='float');dock.select_option('bottom');check('dock selector returns from float to bottom',page.locator('.yja-ui').get_attribute('data-dock')=='bottom')
 # Keep actual lesson scroll fixed when the toolbar menu opens using pointer or keyboard.
 btn('더보기').click();page.evaluate('window.scrollTo(0,300)');page.wait_for_timeout(100);y=page.evaluate('scrollY');btn('더보기').click();check('menu open does not scroll document',page.evaluate('scrollY')==y)
 check('bottom dock menu first control visible',btn('화살표').evaluate('e=>{const r=e.getBoundingClientRect(),u=e.closest(".yja-ui").getBoundingClientRect();return r.top>=u.top-1&&r.bottom<=u.bottom+1&&r.width>0}'))
 check('tool access changes do not modify stroke payload',saved()==raw)
 page.keyboard.press('Escape');page.keyboard.press('p');page.set_viewport_size({'width':390,'height':700});page.wait_for_timeout(150);r=page.locator('.yja-ui').bounding_box();check('small viewport toolbar stays on screen',r['x']>=-1 and r['y']>=-1 and r['x']+r['width']<=391 and r['y']+r['height']<=701)
 check('no browser errors',not errors)
 b.close()
print(f'{n}/{n} standalone checks passed')
