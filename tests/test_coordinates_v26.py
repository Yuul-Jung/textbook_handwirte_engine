from pathlib import Path
from playwright.sync_api import sync_playwright
import sys,re,json,base64,io
from PIL import Image
root=Path(sys.argv[1]) if len(sys.argv)>1 else Path(__file__).resolve().parent.parent
lesson=root/'yja-annotation-pilot'/'lesson'; assets=lesson/'annotation'
html=(lesson/'index.html').read_text(); css=(assets/'annotation.css').read_text(); conf=(assets/'annotation-config.js').read_text(); js=(assets/'annotation.js').read_text()
html=re.sub(r'<script src="annotation/[^\"]+" defer></script>','',html).replace('<link rel="stylesheet" href="annotation/annotation.css">','')
html=html.replace('</head>','<style>'+css+'</style></head>').replace('</body>','<script>const m=new Map();Object.defineProperty(window,"localStorage",{value:{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)}});</script><script>'+conf+'</script><script>'+js+'</script></body>')
key='yja:'+json.dumps(['amd-soc-rtl-pilot','part02-01','v15-fixture'],separators=(',',':'))
results=[]
def check(name,ok):
 results.append(bool(ok));print(('PASS ' if ok else 'FAIL ')+name,flush=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page(viewport={'width':1640,'height':900});page.set_default_timeout(3500);errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.set_content(html);page.wait_for_timeout(200)
 btn=lambda s:page.get_by_role('button',name=s,exact=True)
 saved=lambda:page.evaluate('(k)=>JSON.parse(localStorage.getItem(k)||\'{"strokes":[]}\').strokes',key)
 def go(id):page.locator('#'+id).evaluate('(e)=>e.scrollIntoView()');page.wait_for_timeout(180);return page.locator('#'+id).bounding_box()
 def draw(x,y,x2,y2):
  page.mouse.move(x,y);page.mouse.down();page.mouse.move(x2,y2,steps=8);page.mouse.up();page.wait_for_timeout(100)
 def node(id):return page.locator('.yja-layer>[data-stroke="'+id+'"]')
 def shown(id):return node(id).count()==1
 def bbox(id):return node(id).evaluate('(e)=>{const r=e.getBBox();return [r.x,r.y,r.width,r.height]}') if shown(id) else None
 def near(a,b,t=2):return a is not None and b is not None and all(abs(x-y)<=t for x,y in zip(a,b))
 btn('펜').click();btn('직선').click();r=go('io');draw(r['x']+120,r['y']+65,r['x']+250,r['y']+65);a=saved()[-1]['id'];draw(80,200,160,200);m=saved()[-1]['id'];r=go('code');draw(r['x']+160,r['y']+180,r['x']+280,r['y']+180);c=saved()[-1]['id'];original=saved();check('three strokes saved and visible',len(original)==3 and all(shown(i) for i in [a,m,c]));old={i:bbox(i) for i in [a,m,c]}
 # Inner scroll must affect only ink near the affected section, not the entire chapter.
 page.locator('#code pre').evaluate('(e)=>e.scrollTop=140');page.wait_for_timeout(180);check('unrelated section and margin retained during code scroll',shown(a) and shown(m));check('affected code ink hidden safely',not shown(c));check('unaffected ink coordinate unchanged',near(bbox(a),old[a]));check('no serialized mutation from scroll',saved()==original)
 page.locator('#code pre').evaluate('(e)=>e.scrollTop=0');page.wait_for_timeout(180);check('code ink restores at original position',near(bbox(c),old[c]));
 # The fixed-width textbook shifts horizontally by 140 px without reflow.
 r=go('io');page.set_viewport_size({'width':1920,'height':900});page.wait_for_timeout(240);r2=page.locator('#io').bounding_box();dx=r2['x']-r['x'];check('test actually shifts content without width change',abs(dx)>50 and abs(r2['width']-r['width'])<1);check('all ink survives rigid desktop resize',all(shown(i) for i in [a,m,c]));check('body ink follows exact translation',near(bbox(a),[old[a][0]+dx,*old[a][1:]]));check('margin follows exact translation',near(bbox(m),[old[m][0]+dx,*old[m][1:]]));check('resize never mutates stored data',saved()==original)
 # Editing and erasing must use the same reprojected geometry, including undo.
 if shown(a):
  btn('편집').click();r2=go('io');x=r2['x']+175;y=r2['y']+65;page.mouse.click(x,y);page.wait_for_timeout(100);check('translated stroke can be selected',page.locator('[data-yja-selection]').count()==1);draw(x,y,x+25,y+25);check('edit changes translated stroke only',len(saved())==3 and next(s for s in saved() if s['id']==a)!=original[0] and saved()[1:]==original[1:]);btn('취소').click();check('undo restores original serialized stroke and position',saved()==original and near(bbox(a),[old[a][0]+dx,*old[a][1:]]));btn('지우개').click();draw(x-8,y,x+8,y);check('translated stroke erased at visible position',len(saved())==2 and not shown(a));btn('취소').click();check('erase undo restores translated ink',saved()==original and shown(a));
 else:
  for label in ['translated stroke can be selected','edit changes translated stroke only','undo restores original serialized stroke and position','translated stroke erased at visible position','erase undo restores translated ink']:check(label,False)
 page.set_viewport_size({'width':1640,'height':900});page.wait_for_timeout(180);check('round trip restores exact geometry',all(near(bbox(i),old[i]) for i in [a,m,c]));
 page.set_viewport_size({'width':1000,'height':900});page.wait_for_timeout(180);check('real reflow suppresses affected ink without loss',not shown(a) and saved()==original);page.set_viewport_size({'width':1640,'height':900});page.wait_for_timeout(180);check('reflow reversal restores all ink',all(near(bbox(i),old[i]) for i in [a,m,c]));
 # Move an earlier section only; following unchanged sections should move by matching delta.
 r=go('io');page.locator('#overview').evaluate('(e)=>{e.style.paddingBottom="124px"}');page.wait_for_timeout(220);r3=page.locator('#io').bounding_box();delta=r3['y']-r['y']+0 # viewport scroll anchoring may change; use document position below
 dy=page.locator('#overview').evaluate('(e)=>parseFloat(getComputedStyle(e).paddingBottom)-24');check('earlier expansion translates later ink',near(bbox(a),[old[a][0],old[a][1]+dy,*old[a][2:]]));page.locator('#overview').evaluate('(e)=>e.style.paddingBottom=""');page.wait_for_timeout(180);check('earlier expansion reversal restores ink',near(bbox(a),old[a]));
 # Verify rendered PNG uses the same translated geometry after rigid resize.
 if root.name!='annotation_engine_v25':
  btn('펜').click();btn('직선').click();r=go('io');btn('색상 #d72638').click();draw(r['x']+120,r['y']+105,r['x']+250,r['y']+105);red=saved()[-1]['id'];page.set_viewport_size({'width':1920,'height':900});page.wait_for_timeout(200);r=go('io');check('red export test stroke is displayed',shown(red));
  btn('출력').click();page.get_by_role('combobox',name='출력 범위').select_option('section:io');page.get_by_role('button',name='미리보기 생성').click();page.wait_for_function("document.querySelector('.yja-output-card img')?.complete && document.querySelector('.yja-output-card img')?.naturalWidth>0",timeout=20000)
  url=page.locator('.yja-output-card img').get_attribute('src');im=Image.open(io.BytesIO(base64.b64decode(url.split(',',1)[1]))).convert('RGB');scale=im.width/r['width'];found=[]
  for yy in range(max(0,round(101*scale)),min(im.height,round(109*scale)+1)):
   for xx in range(round(115*scale),round(255*scale)):
    rr,gg,bb=im.getpixel((xx,yy))
    if rr>145 and gg<100 and bb<125 and rr>gg*1.7:found.append((xx,yy))
  check('PNG red ink is aligned within 2 CSS px of expected line',len(found)>40 and abs(sum(y for x,y in found)/len(found)/scale-105)<=2)
  page.get_by_role('button',name='닫기',exact=True).click()
 check('no browser errors',not errors)
 if all(results):page.screenshot(path=str(Path(__file__).resolve().parent.parent/'coordinate_preview_v26.png'))
 b.close()
 print(f'{sum(results)}/{len(results)} coordinate checks passed');sys.exit(0 if all(results) else 1)
