"""Chromium with simulated resource delivery, real engine and in-memory storage.
HTTP(S) and browser-native SRI must be separately tested outside this sandbox.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,re
root=Path(__file__).resolve().parent.parent
loader=(root/'annotation-loader.js').read_text()
fixture=(root/'annotation_external_v32.html').read_text()
fixture=re.sub(r'<script src="annotation-loader.js"[^>]*></script>','',fixture)
key='yja:'+json.dumps(['amd-soc-rtl-pilot','part02-01','v15-fixture'],separators=(',',':'))
n=0
def check(label,ok):
 global n
 assert ok,label
 n+=1;print('PASS '+label,flush=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page(viewport={'width':1640,'height':900});page.set_default_timeout(5000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 def boot(release,raw=None,fail=None,revision=None):
  page.goto('about:blank');html=fixture if revision is None else fixture.replace('"revision": "v15-fixture"','"revision": "'+revision+'"')
  seed=json.dumps([[key,raw]] if raw is not None else [])
  html=html.replace('</head>','<script>const memory=new Map('+seed+');Object.defineProperty(window,"localStorage",{value:{getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)}})</script></head>',1)
  page.set_content(html);page.wait_for_timeout(100)
  before=page.locator('#course').evaluate('e=>e.outerHTML');geom=page.locator('#course').bounding_box()
  assets={name:(root/'releases'/release/name).read_text() for name in ['annotation.css','annotation-config.js','annotation.js']}
  page.evaluate('''({loader,assets,release,fail})=>{
    // Simulated delivery: no network or native SRI claim. Run real asset source in document.
    const append=document.head.append.bind(document.head), fake=document.createElement('script');
    fake.src='https://test.invalid/annotation-loader.js';fake.dataset.yjaRelease=release;
    Object.defineProperty(document,'currentScript',{configurable:true,get:()=>fake});
    document.head.append=function(...nodes){for(const node of nodes){const name=node.dataset?.yjaLoaderAsset;
      if(!name){append(node);continue;}
      queueMicrotask(()=>{if(name===fail){node.dispatchEvent(new Event('error'));return;}
        const resource=document.createElement(name.endsWith('.css')?'style':'script');resource.textContent=assets[name];
        // append delivered source and let loader own it for cleanup in this harness
        const remove=node.remove.bind(node);node.remove=()=>{resource.remove();remove();};append(resource);node.dispatchEvent(new Event('load'));});
    }};
    new Function('location',loader)({protocol:'https:'});
    delete document.currentScript;
  }''',{'loader':loader,'assets':assets,'release':release,'fail':fail})
  page.wait_for_function("window.YJA_LOADER.state!=='loading'");page.wait_for_timeout(150)
  return before,geom
 def saved():return page.evaluate('(k)=>localStorage.getItem(k)',key)
 def ink(y):
  page.get_by_role('button',name='펜',exact=True).click();page.mouse.move(80,y);page.mouse.down();page.mouse.move(150,y+10,steps=5);page.mouse.up();page.wait_for_timeout(150)
 before,geom=boot('v31');check('v31 loader simulated ready',page.evaluate('YJA_LOADER.state')=='ready');check('v31 original host and layout unchanged',page.locator('#course').evaluate('e=>e.outerHTML')==before and page.locator('#course').bounding_box()==geom)
 ink(250);raw=saved();check('v31 stroke stored',raw is not None and len(json.loads(raw)['strokes'])==1)
 before,geom=boot('v32',raw);check('v32 loader simulated ready',page.evaluate('YJA_LOADER.state')=='ready');check('v31 payload exact bytes preserved on v32 load',saved()==raw);check('v31 stroke rendered by v32',page.locator('.yja-layer>[data-stroke]').count()==1);check('v32 host and layout unchanged',page.locator('#course').evaluate('e=>e.outerHTML')==before and page.locator('#course').bounding_box()==geom)
 ink(300);updated=saved();check('v32 appends without changing old stroke',len(json.loads(updated)['strokes'])==2 and json.loads(updated)['strokes'][0]==json.loads(raw)['strokes'][0]);boot('v31',updated);check('rollback renders both strokes without changing saved bytes',saved()==updated and page.locator('.yja-layer>[data-stroke]').count()==2)
 boot('v32',updated,revision='different-revision');check('different revision does not consume or alter prior record',saved()==updated and page.locator('.yja-layer>[data-stroke]').count()==0)
 for name in ['annotation.css','annotation-config.js','annotation.js']:
  before,geom=boot('v32',updated,fail=name);check(name+' failed delivery preserves original document and data',page.evaluate('YJA_LOADER.state')=='disabled' and page.locator('.yja-ui').count()==0 and page.locator('#course').evaluate('e=>e.outerHTML')==before and page.locator('#course').bounding_box()==geom and saved()==updated)
 check('no unexpected runtime exceptions',not errors);b.close()
print(f'{n}/{n} Chromium simulated-delivery checks passed')
