from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parents[1]
fixture='''<!doctype html><html><head><style>body{margin:0}main{width:70%;margin:auto}section{height:500px;border:1px solid #aaa} </style></head><body><main><section id="s1"><h2>Test chapter</h2><button id="copy" onclick="window.copied=true">Copy</button><input id="test" type="checkbox"></section><section id="s2">Second</section></main></body></html>'''
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page(viewport={'width':1440,'height':900});page.set_default_timeout(4000)
 page.goto('about:blank');page.set_content(fixture)
 # about:blank in this runner is not a real HTTPS origin: deterministic digest and storage test doubles.
 page.evaluate('''()=>{if(!crypto.subtle)Object.defineProperty(crypto,'subtle',{value:{digest:async(a,b)=>new Uint8Array(32).fill(b.length%251).buffer}});let m=new Map();Object.defineProperty(window,'localStorage',{value:{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)}});window.testStore=m;}''')
 original=page.locator('main').evaluate('e=>e.outerHTML'); geom=page.locator('main').bounding_box()
 def check(name,cond):
  assert cond,name; print('PASS',name,flush=True)
 check('initial no UI',page.locator('.yja-ui').count()==0)
 page.add_script_tag(path=str(root/'bridge.js'));check('bridge alone no UI',page.locator('.yja-ui').count()==0)
 check('valid config',page.evaluate('__yjaShortcut.prepare()')=='prepared')
 page.add_style_tag(path=str(root/'annotation.css'))
 for f in ['annotation-config.js','annotation.js']:page.add_script_tag(path=str(root/f))
 check('activate',page.evaluate('__yjaShortcut.complete()')=='on');check('single UI',page.locator('.yja-ui').count()==1)
 check('original host unchanged',page.locator('main').evaluate('e=>e.outerHTML')==original and page.locator('main').bounding_box()==geom)
 page.mouse.move(100,200);page.mouse.down();page.mouse.move(180,220,steps=5);page.mouse.up();page.wait_for_timeout(100)
 raw=page.evaluate("[...testStore.entries()].find(([k])=>k.startsWith('yja:'))?.[1]");check('one stroke saved',raw and len(json.loads(raw)['strokes'])==1)
 check('toggle off',page.evaluate('__yjaShortcut.toggle()')=='off');check('toolbar and ink hidden',not page.locator('.yja-ui').is_visible() and not page.locator('.yja-layer').is_visible())
 check('host DOM unchanged off',page.locator('main').evaluate('e=>e.outerHTML')==original and page.locator('main').bounding_box()==geom)
 page.locator('#copy').click();page.locator('#test').check();check('original controls work off',page.evaluate('window.copied') and page.locator('#test').is_checked())
 check('toggle on',page.evaluate('__yjaShortcut.toggle()')=='on');check('same toolbar visible',page.locator('.yja-ui').count()==1 and page.locator('.yja-ui').is_visible());check('data unchanged',page.evaluate("[...testStore.entries()].find(([k])=>k.startsWith('yja:'))?.[1]")==raw)
 check('ink visible again',page.locator('.yja-layer').is_visible())
 for i in range(5):
  assert page.evaluate('__yjaShortcut.toggle()')=='off';assert page.evaluate('__yjaShortcut.toggle()')=='on'
 check('five repeated toggles no duplicate',page.locator('.yja-ui').count()==1)
 b.close()
