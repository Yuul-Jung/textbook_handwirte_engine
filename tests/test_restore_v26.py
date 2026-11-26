"""Read real v25 stroke bytes into v26; mock localStorage, not physical persistence."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,re
root=Path(__file__).resolve().parent.parent; old=root.with_name('annotation_engine_v25')
key='yja:'+json.dumps(['amd-soc-rtl-pilot','part02-01','v15-fixture'],separators=(',',':'))
def html_for(root,payload=None):
 lesson=root/'yja-annotation-pilot'/'lesson';assets=lesson/'annotation';s=(lesson/'index.html').read_text();s=re.sub(r'<script src="annotation/[^\"]+" defer></script>','',s).replace('<link rel="stylesheet" href="annotation/annotation.css">','');s=s.replace('</head>','<style>'+(assets/'annotation.css').read_text()+'</style></head>');data=json.dumps([[key,payload]] if payload else []);return s.replace('</body>','<script>const m=new Map('+data+');Object.defineProperty(window,"localStorage",{value:{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)}});</script><script>'+(assets/'annotation-config.js').read_text()+'</script><script>'+(assets/'annotation.js').read_text()+'</script></body>')
n=0
def check(name,ok):
 global n
 assert ok,name;n+=1;print('PASS '+name,flush=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page(viewport={'width':1640,'height':900});page.set_default_timeout(5000)
 def boot(root,payload=None):
  page.goto('about:blank');page.set_content(html_for(root,payload));page.wait_for_timeout(180)
 def draw(offset=0):
  page.get_by_role('button',name='펜',exact=True).click();page.locator('#io').evaluate('(e)=>e.scrollIntoView()');page.wait_for_timeout(180);r=page.locator('#io').bounding_box();x=r['x']+120;y=r['y']+65+offset;page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+100,y,steps=8);page.mouse.up();page.wait_for_timeout(120)
 raw=lambda:page.evaluate('(k)=>localStorage.getItem(k)',key)
 def count():return page.locator('.yja-layer>[data-stroke]').count()
 fixture=root/'tests'/'legacy_payload_v25.json'
 if old.is_dir():
  boot(old);draw();legacy=raw();fixture.write_text(legacy,encoding='utf-8')
 else:legacy=fixture.read_text(encoding='utf-8')
 check('real v25 page stroke uses legacy signature',json.loads(legacy)['strokes'][0]['layout'][2]==-21)
 boot(root,legacy);check('v26 loads old stroke at original layout unchanged',count()==1 and raw()==legacy)
 draw(60);combined=raw();check('new and legacy strokes coexist',count()==2 and [s['layout'][2] for s in json.loads(combined)['strokes']]==[-21,-26]);boot(root,combined);check('mixed payload restores in new document',count()==2 and raw()==combined)
 page.set_viewport_size({'width':1920,'height':900});page.wait_for_timeout(200);check('only new localized stroke follows resize',count()==1 and raw()==combined);page.set_viewport_size({'width':1640,'height':900});page.wait_for_timeout(200);check('both restored after return to initial geometry',count()==2 and raw()==combined)
 b.close()
print(f'{n} compatibility checks passed')
