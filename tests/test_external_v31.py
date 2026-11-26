"""Chromium external-mode fixture: original host DOM, layout, interactions and ink."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import sys,json
root=Path(sys.argv[1]) if len(sys.argv)>1 else Path(__file__).resolve().parent.parent
assets=root/'yja-annotation-pilot/lesson/annotation'
css,conf,js=[(assets/n).read_text() for n in ('annotation.css','annotation-config.js','annotation.js')]
fixture='''<!doctype html><html><head><meta charset=utf-8><style>body{margin:0;font:16px sans-serif}header,footer{padding:16px;background:#ddd}main{margin:20px 220px 20px 40px;display:grid;gap:15px}main>section{min-height:220px;background:#eee;padding:20px}main>section:last-child{border:5px solid green}main>section:nth-last-child(2){background:#cde}main[data-yja-content]{padding:10px}main.yja-host{border:4px solid red}main>section>button{font:inherit}pre{width:300px;overflow:auto;white-space:pre}nav{padding:10px}#note{width:250px}</style></head><body><header id="header">교재 원본</header><nav><a href="#s2" id="jump">목차 이동</a></nav><main id="course"><section id="s1"><h2>첫 절</h2><button id="copy">코드 복사</button><pre id="code">0123456789abcdefghijklmnopqrstuvwxyz0123456789abcdefghijklmnopqrstuvwxyz</pre><input id="note" value="abc"><details id="details"><summary>상세</summary><p>설명</p></details><label><input id="check" type="checkbox">확인</label></section><section id="s2"><h2>둘째 절</h2><p>원본 교재</p></section></main><footer id="footer">끝</footer><script>window.copied='';document.querySelector('#copy').onclick=()=>window.copied=document.querySelector('#code').textContent;window.hostKeys=[];window.addEventListener('keydown',e=>window.hostKeys.push(e.key));const m=new Map();Object.defineProperty(window,'localStorage',{value:{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)}});</script></body></html>'''
base={'course':'external-demo','chapter':'ch01','revision':'r1','host':'#course','anchors':'section','pageInk':True,'external':True}
key='yja:'+json.dumps(['external-demo','ch01','r1'],separators=(',',':'))
checks=[]
def check(name,ok):
 checks.append(bool(ok));print(('PASS ' if ok else 'FAIL ')+name,flush=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page(viewport={'width':1440,'height':900});page.set_default_timeout(2500);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 def boot(config=base,style=True,extra='',dup=False):
  page.goto('about:blank');page.set_content(fixture.replace('</head>',extra+'</head>'));page.evaluate('window.scrollTo(0,0)');page.wait_for_timeout(100)
  before=snapshot()
  if style:page.add_style_tag(content=css)
  page.evaluate('c=>{let s=document.createElement("script");s.type="application/json";s.dataset.yjaConfig="";s.textContent=JSON.stringify(c);document.head.append(s)}',config)
  page.add_script_tag(content=conf);page.add_script_tag(content=js)
  if dup:page.add_script_tag(content=js)
  page.wait_for_timeout(160);return before
 def snapshot():
  return page.evaluate('''()=>({html:document.querySelector('#course').outerHTML,geom:['header','nav','#course','#s1','#s2','#footer'].map(s=>{let e=document.querySelector(s),r=e.getBoundingClientRect(),c=getComputedStyle(e);return [r.x,r.y,r.width,r.height,c.position,c.isolation,c.backgroundColor,c.borderTopWidth]}),height:document.documentElement.scrollHeight})''')
 def btn(name):return page.get_by_role('button',name=name,exact=True)
 def saved():return page.evaluate('(k)=>JSON.parse(localStorage.getItem(k)||\'{"strokes":[]}\').strokes',key)
 before=boot(dup=True);after=snapshot()
 check('exact original host outerHTML in reading mode',before['html']==after['html']);check('host and surrounding layout unchanged',before['geom']==after['geom'] and before['height']==after['height']);check('only one toolbar on duplicate load',page.locator('.yja-ui').count()==1)
 page.keyboard.press('p');check('reading-mode host keyboard does not select pen',btn('펜').get_attribute('aria-pressed')=='false');check('original keyboard handler received p','p' in page.evaluate('hostKeys'))
 page.locator('#copy').click();check('original copy handler retained',page.evaluate('copied')==page.locator('#code').text_content());page.locator('#check').check();check('original checkbox works',page.locator('#check').is_checked());page.locator('summary').click();check('original details toggle works',page.locator('#details').get_attribute('open') is not None);page.locator('#note').fill('변경');check('original input works',page.locator('#note').input_value()=='변경');page.locator('#code').evaluate('e=>e.scrollLeft=150');check('original code horizontal scroll works',page.locator('#code').evaluate('e=>e.scrollLeft')>0);page.locator('#jump').click();check('original navigation works',page.evaluate('location.hash')=='#s2');page.evaluate('window.scrollTo(0,0)');page.wait_for_timeout(120)
 current=page.locator('#course').evaluate('e=>e.outerHTML');btn('펜').click();page.mouse.move(80,180);page.mouse.down();page.mouse.move(120,185,steps=4);page.mouse.up();page.wait_for_timeout(100);check('page ink saves exactly one stroke',len(saved())==1 and saved()[0]['anchor']=='__yja_page__');check('host DOM untouched during active ink',page.locator('#course').evaluate('e=>e.outerHTML')==current)
 btn('전체 판서').click();page.mouse.move(85,190);page.mouse.down();page.mouse.move(120,195,steps=4);page.mouse.up();page.wait_for_timeout(100);check('section ink uses original ID',len(saved())==2 and saved()[-1]['anchor']=='s1')
 btn('백지').click();page.wait_for_timeout(250);check('board is outside original host',page.locator('#course .yja-board').count()==0 and page.locator('.yja-board').is_visible());check('board open preserves original DOM',page.locator('#course').evaluate('e=>e.outerHTML')==current);r=page.locator('.yja-board-grid').bounding_box();page.mouse.click(r['x']+80,r['y']+80);page.wait_for_timeout(100);check('board ink is saved',len(saved())==3 and saved()[-1]['anchor'].startswith('__yja_board__'));btn('백지').click();page.wait_for_timeout(100);check('board close preserves original DOM',page.locator('#course').evaluate('e=>e.outerHTML')==current)
 page.keyboard.press('Escape');check('escape returns to reading',btn('읽기').get_attribute('aria-pressed')=='true' if page.get_by_role('button',name='읽기',exact=True).count() else btn('펜').get_attribute('aria-pressed')=='false')
 for name,config,style,extra in [('missing CSS',base,False,''),('missing ID',{**base,'anchors':'p'},True,''),('ambiguous host',{**base,'host':'section'},True,''),('invalid external scope',{**base,'pageInk':False},True,''),('unsupported body transform',base,True,'<style>body{transform:translateX(10px)}</style>')]:
  prior=boot(config,style,extra);check(name+' fails closed',page.locator('.yja-ui').count()==0 and snapshot()==prior)
 check('no browser exceptions',not errors);b.close()
print(f'{sum(checks)}/{len(checks)} external checks passed');sys.exit(0 if all(checks) else 1)
