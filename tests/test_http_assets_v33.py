"""Real HTTP transport and static asset verification (not browser execution)."""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
from urllib.request import urlopen
from urllib.error import HTTPError
from functools import partial
import hashlib,base64,re
root=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(root)))
Thread(target=server.serve_forever,daemon=True).start()
base=f'http://127.0.0.1:{server.server_port}/pages-test-v33/'
count=0
def check(label,ok):
    global count
    assert ok,label
    count+=1;print('PASS',label)
try:
    for name in ['index.html','rollback.html','annotation-loader.js']:
        with urlopen(base+name,timeout=5) as r:
            check(name+' HTTP 200 and exact bytes',r.status==200 and r.read()==(root/'pages-test-v33'/name).read_bytes())
    loader=(root/'pages-test-v33/annotation-loader.js').read_text()
    for version in ('v31','v32'):
        for name in ('annotation.css','annotation-config.js','annotation.js'):
            expected=re.search(r"'"+re.escape(name)+r"': '([^']+)'",loader)[1]
            with urlopen(base+'releases/'+version+'/'+name,timeout=5) as r:
                body=r.read(); actual='sha384-'+base64.b64encode(hashlib.sha384(body).digest()).decode()
                check(version+'/'+name+' HTTP 200 / exact bytes / SRI hash / MIME',r.status==200 and body==(root/'releases'/version/name).read_bytes() and actual==expected and ('css' if name.endswith('.css') else 'javascript') in r.headers.get_content_type())
    try: urlopen(base+'releases/v99/annotation.js',timeout=5)
    except HTTPError as e: check('missing version returns 404',e.code==404)
    else: raise AssertionError('missing version not rejected')
finally: server.shutdown();server.server_close()
print(f'{count}/{count} real HTTP asset checks passed')
