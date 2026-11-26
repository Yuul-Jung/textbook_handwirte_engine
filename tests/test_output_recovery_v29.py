from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image
import io,base64,json,sys
root=Path(sys.argv[1]) if len(sys.argv)>1 else Path(__file__).resolve().parent.parent
html=(root/('annotation_course_v29.html' if (root/'annotation_course_v29.html').exists() else 'annotation_course_v28.html')).read_text()
key='yja:'+json.dumps(['amd-soc-rtl-pilot','part02-01','v15-fixture'],separators=(',',':'));results=[]
def check(n,v):
 results.append(bool(v));print(('PASS ' if v else 'FAIL ')+n,flush=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=browser.new_page(viewport={'width':1640,'height':900},accept_downloads=True);page.set_default_timeout(5000);page.on('dialog',lambda d:d.accept());errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 def boot(raw=None,archive=None):
  page.goto('about:blank');data=json.dumps([[k,v] for k,v in [(key,raw),(key+':recovery',archive)] if v is not None]);mock='<script>const m=new Map('+data+');window.failKey=null;Object.defineProperty(window,"localStorage",{value:{getItem:k=>m.get(k)??null,setItem:(k,v)=>{if(k===window.failKey)throw Error("quota");m.set(k,v)}}});</script>';page.set_content(html.replace('</head>',mock+'</head>',1));page.wait_for_timeout(180)
 b=lambda n:page.get_by_role('button',name=n,exact=True)
 raw=lambda k=key:page.evaluate('(k)=>localStorage.getItem(k)',k)
 def draw():
  b('펜').click();page.locator('#io').evaluate('e=>e.scrollIntoView()');page.wait_for_timeout(180);dy=page.evaluate('scrollY');page.mouse.move(80,200);page.mouse.down();page.mouse.move(180,220,steps=8);page.mouse.up();page.wait_for_timeout(100);return 130,dy+210
 def load(data):
  page.locator('.yja-more input[type=file]').set_input_files({'name':'backup.json','mimeType':'application/json','buffer':data.encode()});page.wait_for_timeout(180)
 def snapshot():return page.evaluate('()=>({html:document.querySelector("#io").outerHTML,y:scrollY,h:document.body.scrollHeight})')
 boot();x,y=draw();good=raw();check('margin stroke stored',good is not None and len(json.loads(good)['strokes'])==1);before=snapshot();b('출력').click();scope=page.get_by_role('combobox',name='출력 범위');available=scope.locator('option[value=page]').count()==1;check('full background option',available)
 def output():
  b('미리보기 생성').click();page.wait_for_function("!document.querySelector('.yja-output-settings button').disabled",timeout=30000);print(page.locator('.yja-output-message').text_content(),flush=True);return [Image.open(io.BytesIO(base64.b64decode(u.split(',')[1]))).convert('RGB') for u in page.locator('.yja-output-card img').evaluate_all('es=>es.map(e=>e.src)')]
 def pixel(x,y,ims):
  for im in ims:
   if y<im.height:return im.getpixel((x,y))
   y-=im.height
 if available:
  scope.select_option('page');ims=output();check('multiple tiles',len(ims)>=2)
  if ims:
   print('SIZES',[i.size for i in ims]);check('full height and width',all(i.width==1640 for i in ims) and sum(i.height for i in ims)>=before['h']);check('header background',pixel(500,10,ims)==(36,44,66));page.get_by_role('combobox',name='판서 포함').select_option('no');clean=output();check('margin ink differs from original',bool(clean) and any(pixel(x+dx,y+dy,ims)!=pixel(x+dx,y+dy,clean) for dx in range(-2,3) for dy in range(-2,3)));check('print enabled',b('PDF 저장 / 인쇄').is_enabled());ims[0].save(root/'tests/v29/full_page_tile.png')
  check('storage unchanged',raw()==good)
 b('닫기').click();page.wait_for_timeout(150);check('original markup and scroll preserved',snapshot()==before)
 corrupt='{"broken":';boot(corrupt);check('corrupt raw unchanged',raw()==corrupt);button=b('오류 원본 백업');has=button.count()==1 and button.is_visible();check('raw backup control',has)
 if has:
  with page.expect_download() as dl:button.click()
  check('raw download exact',Path(dl.value.path()).read_text()==corrupt)
 load(good);check('valid import repairs corruption',raw() is not None and json.loads(raw())==json.loads(good));check('corrupt original archived',raw(key+':recovery')==corrupt);boot(raw(),raw(key+':recovery'));check('restored visible after reboot',page.locator('.yja-layer>[data-stroke]').count()==1)
 boot(corrupt);page.evaluate('(k)=>window.failKey=k',key+':recovery');load(good);check('archive failure protects primary',raw()==corrupt)
 boot(corrupt);load('{broken');check('invalid import cannot overwrite corrupt original',raw()==corrupt and raw(key+':recovery') is None)
 boot(corrupt);page.evaluate('(k)=>window.failKey=k',key);load(good);check('primary quota preserves archive and original',raw()==corrupt and raw(key+':recovery')==corrupt);page.evaluate('window.failKey=null');b('저장 재시도').click();check('recovery retry saves validated data',json.loads(raw())==json.loads(good))
 boot(corrupt,'previous corrupt');load(good);check('previous archive protected',raw()==corrupt and raw(key+':recovery')=='previous corrupt')
 boot(corrupt);page.evaluate('([k,v])=>m.set(k,v)',[key,good]);load(good);check('other tab primary not overwritten',raw()==good and raw(key+':recovery') is None)
 boot();page.evaluate('(k)=>window.failKey=k',key);draw();check('quota failure keeps visible ink',raw() is None and page.locator('.yja-layer>[data-stroke]').count()==1);page.evaluate('window.failKey=null');b('저장 재시도').click();check('retry saves ink',raw() is not None and len(json.loads(raw())['strokes'])==1);check('no browser errors',not errors);browser.close()
print(f'{sum(results)}/{len(results)} checks passed');sys.exit(not all(results))
