"""Real Chromium browser profile, loopback HTTP fixture. No server integration."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from tempfile import TemporaryDirectory
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parent.parent
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(root)));Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}/annotation_course_v29.html';key='yja:'+json.dumps(['amd-soc-rtl-pilot','part02-01','v15-fixture'],separators=(',',':'))
with TemporaryDirectory() as profile,sync_playwright() as p:
 def ctx():return p.chromium.launch_persistent_context(profile,executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--no-proxy-server'],viewport={'width':1640,'height':900})
 c=ctx();page=c.pages[0];page.goto(url,wait_until='domcontentloaded',timeout=10000);page.locator('.yja-ui').wait_for(timeout=5000)
 assert page.evaluate('localStorage instanceof Storage');print('PASS real browser Storage API',flush=True)
 page.get_by_role('button',name='펜',exact=True).click();page.locator('#io').evaluate('e=>e.scrollIntoView()');page.wait_for_timeout(180);page.mouse.move(80,200);page.mouse.down();page.mouse.move(180,220,steps=8);page.mouse.up();page.wait_for_timeout(120);raw=page.evaluate('(k)=>localStorage.getItem(k)',key);assert len(json.loads(raw)['strokes'])==1;print('PASS real storage write',flush=True)
 page.reload();page.locator('.yja-ui').wait_for();assert page.evaluate('(k)=>localStorage.getItem(k)',key)==raw and page.locator('.yja-layer>[data-stroke]').count()==1;print('PASS browser reload restores exact bytes',flush=True)
 c.close();c=ctx();page=c.pages[0];page.goto(url,wait_until='domcontentloaded');page.locator('.yja-ui').wait_for();assert page.evaluate('(k)=>localStorage.getItem(k)',key)==raw and page.locator('.yja-layer>[data-stroke]').count()==1;print('PASS profile restart restores exact bytes',flush=True)
 c.close()
server.shutdown();print('4/4 real storage checks passed')
