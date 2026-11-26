from pathlib import Path
from playwright.sync_api import sync_playwright
import json,re,sys
root=Path(sys.argv[1]) if len(sys.argv)>1 else Path(__file__).resolve().parent.parent
lesson=root/'yja-annotation-pilot'/'lesson'; assets=lesson/'annotation'
html=(lesson/'index.html').read_text(); css=(assets/'annotation.css').read_text(); conf=(assets/'annotation-config.js').read_text(); js=(assets/'annotation.js').read_text()
html=re.sub(r'<script src="annotation/[^\"]+" defer></script>','',html).replace('<link rel="stylesheet" href="annotation/annotation.css">','')
html=html.replace('</head>','<style>'+css+'</style></head>').replace('</body>','<script>const m=new Map();Object.defineProperty(window,"localStorage",{value:{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)}});window.addEventListener("pointerdown",e=>{window.pid=e.pointerId},true);</script><script>'+conf+'</script><script>'+js+'</script></body>')
results=[]
def check(n,v):
 results.append(bool(v));print(('PASS' if v else 'FAIL')+' '+n,flush=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']); page=browser.new_page(viewport={'width':1640,'height':900});page.set_default_timeout(5000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.set_content(html)
 btn=lambda n:page.get_by_role('button',name=n,exact=True,include_hidden=True)
 key='yja:'+json.dumps(['amd-soc-rtl-pilot','part02-01','v15-fixture'],separators=(',',':'))
 saved=lambda:page.evaluate('(k)=>JSON.parse(localStorage.getItem(k)||\'{"strokes":[]}\').strokes',key)
 def draw(x,y,x2,y2):
  page.mouse.move(x,y);page.mouse.down();page.mouse.move(x2,y2,steps=4);page.mouse.up();page.wait_for_timeout(60)
 def dispatch(x,y,samples,typ='mouse',buttons=1,kind='pointermove'):
  page.evaluate('''({x,y,samples,typ,buttons,kind})=>{const init={pointerType:typ,pointerId:window.pid,buttons,button:0,clientX:x,clientY:y,pressure:.5,bubbles:true,cancelable:true};const e=new PointerEvent(kind,init);Object.defineProperty(e,'getCoalescedEvents',{value:()=>samples.map(([a,b])=>new PointerEvent('pointermove',{...init,clientX:a,clientY:b}))});window.dispatchEvent(e)}''',dict(x=x,y=y,samples=samples,typ=typ,buttons=buttons,kind=kind))
 btn('펜').click();page.locator('#io').evaluate('(e)=>e.scrollIntoView()');page.wait_for_timeout(180)
 # Actual mouse establishes capture; synthetic batches exercise edge conditions the CDP cannot generate directly.
 page.mouse.move(65,170);page.mouse.down();dispatch(170,170,[[100,190],[130,150]]);page.mouse.up();page.wait_for_timeout(80)
 q=saved()[-1];xs=[v[0]*q['layout'][0] for v in q['points']];check('parent endpoint not lost from coalesced batch',any(abs(x-170)<1 for x in xs));check('intermediate samples retained',any(abs(x-100)<1 for x in xs) and any(abs(x-130)<1 for x in xs))
 # Real mouse release coordinate from prior location is allowed; avoid using these samples for performance conclusions.
 btn('펜').click();page.mouse.click(95,260);page.wait_for_timeout(60);dot=saved()[-1]['id'];check('single click creates dot',len(saved()[-1]['points'])==1)
 # A V-shaped coalesced eraser path reaches a dot missed by the direct parent chord.
 btn('지우개').click();page.mouse.move(60,300);page.mouse.down();dispatch(135,300,[[95,260]]);page.mouse.up();page.wait_for_timeout(70)
 check('coalesced eraser reaches intermediate dot',all(q['id']!=dot for q in saved()))
 if all(q['id']!=dot for q in saved()):
  btn('취소').click();check('eraser undo restores dot',any(q['id']==dot for q in saved()))
 else:check('eraser undo restores dot',False)
 btn('펜').click();btn('굵기 8 px').click();cdp=page.context.new_cdp_session(page)
 def pen(t,x,y,buttons,force):cdp.send('Input.dispatchMouseEvent',dict(type=t,x=x,y=y,button='left' if t!='mouseMoved' else 'none',buttons=buttons,clickCount=1,pointerType='pen',force=force))
 pen('mousePressed',65,380,1,.15);pen('mouseMoved',100,380,1,.3);pen('mouseMoved',140,380,1,.85);pen('mouseReleased',180,380,0,0);page.wait_for_timeout(100)
 q=saved()[-1];press=[v[2] for v in q['points']];check('pen pressure increases within stroke',min(press)<.25 and max(press)>.75);check('release zero preserves final pressure',press[-1]>.75)
 n=len(saved());pen('mousePressed',65,440,1,.5);pen('mouseMoved',100,440,1,.5);dispatch(120,440,[],typ='pen',buttons=0);pen('mouseReleased',140,440,0,0);page.wait_for_timeout(80);check('orphan pen hover cancels uncommitted stroke',len(saved())==n)
 draw(65,500,165,505);check('mouse resumes immediately after pen input',len(saved())==n+1 and all(v[2]==1 for v in saved()[-1]['points'])) if len(saved())==n+1 else check('mouse resumes immediately after pen input',False)
 # Cancel restores any temporarily hidden ink.
 btn('지우개').click();n=len(saved());page.mouse.move(110,502);page.mouse.down();dispatch(110,502,[],kind='pointercancel',buttons=0);page.mouse.up();page.wait_for_timeout(80);check('cancelled erase preserves data and visibility',len(saved())==n and not page.locator('[data-stroke][style*="visibility: hidden"]').count())
 btn('형광펜').click();page.mouse.click(75,575);page.wait_for_timeout(80);q=saved()[-1];check('single highlight dot visible',q['tool']=='highlight' and page.locator('[data-stroke="'+q['id']+'"] circle').count()==1)
 check('no browser exceptions',not errors)
 if all(results):page.screenshot(path=str(Path(__file__).resolve().parent.parent/'input_preview_v27.png'))
 browser.close()
 print(f'{sum(results)}/{len(results)} input browser checks passed');sys.exit(0 if all(results) else 1)
