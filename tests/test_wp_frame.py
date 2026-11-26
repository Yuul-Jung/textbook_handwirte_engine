"""PHP-rendered mock settings UI + actual Chromium iframe; no WordPress or HTTP."""
from pathlib import Path
import os,re,json
from playwright.sync_api import sync_playwright
r=Path(__file__).resolve().parent
lesson=r.parent/'yja-annotation-pilot'/'lesson'
html=(lesson/'index.html').read_text()
css=(lesson/'annotation/annotation.css').read_text()
config=(lesson/'annotation/annotation-config.js').read_text()
engine=(lesson/'annotation/annotation.js').read_text()
raw=re.sub(r'<script src="annotation/[^\"]+" defer></script>','',html).replace('<link rel="stylesheet" href="annotation/annotation.css">','')
mock="""const m=new Map();Object.defineProperty(window,'localStorage',{value:{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)}});"""
inner=raw.replace('</head>','<style>'+css+'</style></head>').replace('</body>','<script>'+mock+'</script><script>'+config+'</script><script>'+engine+'</script></body>')
# Retain exact sandbox and sizing emitted by PHP; replace network src with srcdoc for offline test.
outer=re.sub(r'(<iframe\b[^>]*?) src="[^"]*"',r'\1',(r/'admin_fixture.html').read_text())
count=0
def check(name,ok):
    global count
    assert ok,name
    count+=1;print('PASS',name,flush=True)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1920,'height':1080});page.set_default_timeout(5000)
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content(outer)
    frame_el=page.locator('iframe');frame_el.evaluate('(e,s)=>e.srcdoc=s',inner)
    frame=frame_el.content_frame
    read=frame.get_by_role('button',name='읽기',exact=True);read.wait_for()
    check('PHP-generated frame loads engine',frame.locator('.yja-ui').count()==1 and page.locator('.yja-ui').count()==0)
    check('sandbox attributes retained',frame_el.get_attribute('sandbox')=='allow-scripts allow-same-origin allow-downloads allow-modals')
    check('settings fields remain usable',page.locator('#yja-registry').is_editable())
    page.locator('#yja-registry').focus();page.keyboard.press('p');check('parent typing does not switch tool',read.get_attribute('aria-pressed')=='true')
    frame_el.scroll_into_view_if_needed();page.wait_for_timeout(100)
    frame.get_by_role('button',name='펜',exact=True).click()
    loc=frame.locator('#diagram');loc.scroll_into_view_if_needed();page.wait_for_timeout(150)
    b=loc.bounding_box();x=b['x']+80;y=b['y']+80
    page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+120,y+20,steps=10);page.mouse.up();page.wait_for_timeout(180)
    check('actual mouse stroke in sandboxed child',frame.locator('.yja-layer>[data-stroke]').count()==1)
    check('parent has no stroke layer',page.locator('.yja-layer').count()==0)
    key='yja:'+json.dumps(['amd-soc-rtl-pilot','part02-01','v15-fixture'],separators=(',',':'))
    check('child mock storage receives stroke',frame.locator('body').evaluate('(e,k)=>JSON.parse(localStorage.getItem(k)).strokes.length',key)==1)
    page.screenshot(path=str(r.parent/'wp_frame_preview.png'))
    check('fallback new-tab link present',page.get_by_role('link',name='새 탭에서 열기').get_attribute('rel')=='noopener noreferrer')
    check('no uncaught JS errors',not errors)
    browser.close()
print(f'{count} iframe checks passed (srcdoc + mock storage).')
