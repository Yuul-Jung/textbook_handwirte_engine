"""Actual Chromium + mock fetch responses; no live WordPress or DB."""
from pathlib import Path
import json,re,os
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent.parent
lesson=root/'yja-annotation-pilot'/'lesson'; assets=lesson/'annotation'
html=(lesson/'index.html').read_text(); css=(assets/'annotation.css').read_text(); conf=(assets/'annotation-config.js').read_text(); engine=(assets/'annotation.js').read_text(); sync=(assets/'server-sync.js').read_text()
html=re.sub(r'<script src="annotation/[^\"]+" defer></script>','',html).replace('<link rel="stylesheet" href="annotation/annotation.css">','')
# Offline-only harness: substitute the origin comparison because about:blank is opaque.
# Production source is unchanged; no real HTTP or origin enforcement is claimed.
sync=sync.replace('url.origin!==location.origin', 'url.origin!=="https://wp.example.test"')
mock="""<script>window.storageAccess=0;Object.defineProperty(window,'localStorage',{get(){window.storageAccess++;throw Error('shared storage forbidden')}});window.fetch=async (url,opts)=>{const r=await window.mockRequest(JSON.parse(opts.body));return new Response(JSON.stringify(r.body),{status:r.status,headers:{'Content-Type':'application/json'}})};</script>"""
html=html.replace('</head>' ,'<style>'+css+'</style></head>').replace('</body>','<script type="application/json" id="yja-server-config">{"endpoint":"https://wp.example.test/sync","nonce":"mock"}</script>'+mock+'<script>'+conf+'</script><script>'+engine+'</script><script>'+sync+'</script></body>')
n=0
def check(name,ok):
 global n
 assert ok,name
 n+=1;print('PASS',name,flush=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
 ctx=browser.new_context(viewport={'width':1920,'height':1080});page=ctx.new_page();page.set_default_timeout(5000)
 state={'version':0,'payload':None};requests=[];errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 fail={'code':None}
 def route(q):
  requests.append(q)
  if fail['code']:return {'status':fail['code'],'body':{'error':'mock'}}
  if q['op']=='load':return {'status':200,'body':state}
  if q['version']!=state['version']:return {'status':409,'body':{'error':'conflict','version':state['version']}}
  state.update(version=state['version']+1,payload=None if q['op']=='delete' else q['payload']);return {'status':200,'body':{'version':state['version']}}
 def boot():
  global page
  page=ctx.new_page();page.set_default_timeout(5000);page.on('pageerror',lambda e:errors.append(str(e)));page.expose_function('mockRequest',route);page.set_content(html)
 page.close();boot()
 b=lambda s:page.get_by_role('button',name=s,exact=True)
 note=page.locator('.yja-sync-panel [role=status]');note.wait_for();page.wait_for_function("document.querySelector('.yja-sync-panel [role=status]').textContent.includes('기록 없음')")
 check('initial load with version zero',b('서버 저장').is_enabled())
 check('authenticated adapter exists',page.evaluate('!!window.YJA_SERVER_ENGINE'))
 def draw(y=60):
  b('펜').click();loc=page.locator('#diagram');loc.scroll_into_view_if_needed();page.wait_for_timeout(120);bb=loc.bounding_box();x=bb['x']+70;yy=bb['y']+y
  page.mouse.move(x,yy);page.mouse.down();page.mouse.move(x+100,yy+15,steps=8);page.mouse.up();page.wait_for_timeout(100)
 draw();check('actual mouse stroke',page.locator('.yja-layer>[data-stroke]').count()==1)
 check('no implicit server write',len(requests)==1)
 check('unsaved changes visibly indicated','미저장' in note.text_content())
 check('no shared localStorage',page.evaluate('window.storageAccess')==0)
 b('서버 저장').click();page.wait_for_function("document.querySelector('.yja-sync-panel [role=status]').textContent.includes('버전 1')")
 check('explicit save contains actual stroke',state['version']==1 and len(state['payload']['strokes'])==1)
 page.close();boot();page.wait_for_function("document.querySelector('.yja-sync-panel [role=status]')?.textContent.includes('복원')")
 check('reload restores saved stroke',len(json.loads(page.evaluate('YJA_SERVER_ENGINE.snapshot()'))['strokes'])==1)
 draw(100);state['version']=2;b('서버 저장').click();page.wait_for_function("document.querySelector('.yja-sync-panel [role=status]').textContent.includes('충돌')")
 check('stale save blocked and local ink retained',b('서버 저장').is_disabled() and len(json.loads(page.evaluate('YJA_SERVER_ENGINE.snapshot()'))['strokes'])==2)
 page.on('dialog',lambda d:d.accept());b('서버 불러오기').click();page.wait_for_function("document.querySelector('.yja-sync-panel [role=status]').textContent.includes('버전 2')")
 check('explicit conflict recovery restores server',b('서버 저장').is_enabled() and len(json.loads(page.evaluate('YJA_SERVER_ENGINE.snapshot()'))['strokes'])==1)
 draw(120);fail['code']=503;b('서버 저장').click();page.wait_for_function("document.querySelector('.yja-sync-panel [role=status]').textContent.includes('503')")
 check('failure keeps unsaved ink',len(json.loads(page.evaluate('YJA_SERVER_ENGINE.snapshot()'))['strokes'])==2 and b('서버 저장').is_enabled())
 fail['code']=None;b('서버 저장').click();page.wait_for_function("document.querySelector('.yja-sync-panel [role=status]').textContent.includes('버전 3')")
 check('retry succeeds',state['version']==3 and len(state['payload']['strokes'])==2)
 # Export reads server data, not current unsaved ink.
 draw(160)
 with page.expect_download() as dl:b('서버 JSON 내보내기').click()
 check('server export excludes unsaved stroke',json.loads(Path(dl.value.path()).read_text())==state['payload'])
 check('export does not replace local ink',len(json.loads(page.evaluate('YJA_SERVER_ENGINE.snapshot()'))['strokes'])==3)
 b('서버 판서 삭제').click();page.wait_for_function("document.querySelector('.yja-sync-panel [role=status]').textContent.includes('삭제 완료')")
 check('delete replaces server payload with tombstone',state=={'version':4,'payload':None})
 check('delete clears local strokes',len(json.loads(page.evaluate('YJA_SERVER_ENGINE.snapshot()'))['strokes'])==0)
 page.keyboard.press('Control+z');check('deleted ink cannot be undone',len(json.loads(page.evaluate('YJA_SERVER_ENGINE.snapshot()'))['strokes'])==0)
 check('delete disabled for tombstone',b('서버 판서 삭제').is_disabled())
 page.close();boot();page.wait_for_function("document.querySelector('.yja-sync-panel [role=status]')?.textContent.includes('기록 없음')")
 check('positive tombstone version loads',b('서버 저장').is_enabled() and b('서버 판서 삭제').is_disabled())
 draw(90);fail['code']=401;b('서버 저장').click();page.wait_for_function("document.querySelector('.yja-sync-panel [role=status]').textContent.includes('만료')")
 check('session expiry disables all server actions',all(b(t).is_disabled() for t in ['서버 저장','서버 불러오기','서버 JSON 내보내기','서버 판서 삭제']))
 check('session expiry preserves unsaved ink',len(json.loads(page.evaluate('YJA_SERVER_ENGINE.snapshot()'))['strokes'])==1)
 fail['code']=None
 page.evaluate('window.scrollTo(0,0)');page.screenshot(path=str(root/'server_preview.png'))
 check('no uncaught JS errors',not errors)
 browser.close()
print(f'{n} browser checks passed (offline mock fetch + origin comparison substitution).')
