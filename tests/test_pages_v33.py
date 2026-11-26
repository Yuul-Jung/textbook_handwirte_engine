"""Actual HTTP browser acceptance test. No simulated storage or successful assets.
Usage: python tests/test_pages_v33.py https://HOST/REPO/
Use a fresh browser context; the last case intentionally tampers with one asset.
"""
import sys, json, os
from urllib.parse import urljoin
from playwright.sync_api import sync_playwright
base = sys.argv[1].rstrip('/')+'/'
key = 'yja:'+json.dumps(['yja-pages-isolated-v33','part02-01','pages-fixture-1'],separators=(',',':'))
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get("CHROMIUM_EXECUTABLE") or None)
    ctx=browser.new_context(viewport={'width':1640,'height':900})
    page=ctx.new_page(); page.set_default_timeout(12000)
    def check(name, condition):
        assert condition, name
        print('PASS', name, flush=True)
    def raw(): return page.evaluate('(key)=>localStorage.getItem(key)',key)
    def host(): return page.locator('#course').evaluate('e=>e.outerHTML'),page.locator('#course').bounding_box()
    def load(path='index.html'):
        resp=page.goto(urljoin(base,path)); assert resp and resp.ok
        page.wait_for_function("window.YJA_LOADER && YJA_LOADER.state!=='loading'")
        return page.evaluate('YJA_LOADER.state')
    # Baseline: deliberately block only the loader, then compare with normal web delivery.
    page.route('**/annotation-loader.js',lambda route:route.abort())
    page.goto(urljoin(base,'index.html')); baseline=host(); page.unroute('**/annotation-loader.js')
    check('v32 native loader ready',load()=='ready')
    check('one toolbar and unchanged original host',page.locator('.yja-ui').count()==1 and host()==baseline)
    page.get_by_role('button',name='펜',exact=True).click()
    page.mouse.move(80,250); page.mouse.down(); page.mouse.move(150,260,steps=5); page.mouse.up()
    page.wait_for_function('(key)=>!!localStorage.getItem(key)',arg=key)
    first=raw(); check('one saved stroke',len(json.loads(first)['strokes'])==1)
    check('reload preserves actual localStorage and rendered stroke',load()=='ready' and raw()==first and page.locator('.yja-layer>[data-stroke]').count()==1)
    check('rollback preserves actual localStorage and rendered stroke',load('rollback.html')=='ready' and raw()==first and page.locator('.yja-layer>[data-stroke]').count()==1)
    # No integrity mocking: change a real HTTP response, retain the original SRI attribute.
    def tamper(route):
        response=route.fetch(); route.fulfill(response=response,body=response.body()+b'\n/* intentionally modified */')
    page.route('**/releases/v32/annotation.js',tamper)
    check('browser SRI rejects modified script without altering original host or data',load()=='disabled' and page.locator('.yja-ui').count()==0 and host()==baseline and raw()==first)
    browser.close()
