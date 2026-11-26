from pathlib import Path
from playwright.sync_api import sync_playwright
import json, re, time, statistics, sys
root=Path(__file__).resolve().parent.parent;lesson=root/'yja-annotation-pilot'/'lesson';assets=lesson/'annotation'
html=(lesson/'index.html').read_text(); css=(assets/'annotation.css').read_text(); conf=(assets/'annotation-config.js').read_text(); js=(assets/'annotation.js').read_text()
html=re.sub(r'<script src="annotation/[^\"]+" defer></script>','',html).replace('<link rel="stylesheet" href="annotation/annotation.css">','')
html=html.replace('</head>','<style>'+css+'</style></head>').replace('</body>','<script>const m=new Map();Object.defineProperty(window,"localStorage",{value:{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)}});</script><script>'+conf+'</script><script>'+js+'</script></body>')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page(viewport={'width':1640,'height':900}); errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.set_content(html)
 page.get_by_role('button',name='펜',exact=True).click();page.locator('#io').evaluate('(e)=>e.scrollIntoView()');page.wait_for_timeout(200);cdp=page.context.new_cdp_session(page)
 times=[];page.evaluate("window.trace=[];for(const t of ['pointerdown','pointerup','pointercancel','lostpointercapture'])window.addEventListener(t,e=>trace.push([t,e.pointerType,e.pointerId,e.buttons,e.clientX,e.clientY,e.target.tagName]),true)")
 for i in range(100):
  x=55+(i%10)*15;y=175+(i//10)*38;typ='mouse' if i%2==0 else 'pen';t0=time.perf_counter()
  for t,dx,dy,buttons,force in [('mousePressed',0,0,1,.25),('mouseMoved',4,4,1,.65),('mouseReleased',9,0,0,0)]:
   cdp.send('Input.dispatchMouseEvent',dict(type=t,x=x+dx,y=y+dy,button='left' if t!='mouseMoved' else 'none',buttons=buttons,clickCount=1,pointerType=typ,force=force))
  times.append((time.perf_counter()-t0)*1000)
 page.wait_for_timeout(250);key='yja:'+json.dumps(['amd-soc-rtl-pilot','part02-01','v15-fixture'],separators=(',',':'));data=page.evaluate('(k)=>JSON.parse(localStorage.getItem(k)).strokes',key)
 if len(data)!=100:
  print("TRACE",json.dumps(page.evaluate("trace")),flush=True);print("STROKES",[(round(s['points'][0][0]*s['layout'][0]),round(s['points'][0][1]*s['layout'][1])) for s in data],flush=True)
 assert len(data)==100, len(data);print('PASS 100 alternating CDP pen/mouse gestures committed exactly once')
 assert len({s['id'] for s in data})==100;print('PASS unique stroke IDs')
 assert all(s['tool']=='pen' and len(s['points'])>=2 for s in data);print('PASS short strokes retain multiple positions')
 assert all(all(v[2]==1 for v in s['points']) if i%2==0 else min(v[2] for v in s['points'])<.4 and max(v[2] for v in s['points'])>.5 for i,s in enumerate(data));print('PASS pressure remains device-specific through 100 switches')
 assert page.locator('.yja-layer>[data-stroke]').count()==100;print('PASS all 100 ink nodes visible')
 page.get_by_role('button',name='취소',exact=True).click();assert page.evaluate('(k)=>JSON.parse(localStorage.getItem(k)).strokes.length',key)==99;page.get_by_role('button',name='복원',exact=True).click();assert page.evaluate('(k)=>JSON.parse(localStorage.getItem(k)).strokes.length',key)==100;print('PASS undo/redo after repeated mixed input')
 assert not errors,errors;print('PASS no browser exceptions')
 metrics={'gestures':100,'mouse':50,'simulated_pen':50,'dispatch_wall_ms_median':round(statistics.median(times),2),'dispatch_wall_ms_p95':round(sorted(times)[94],2),'dispatch_wall_ms_max':round(max(times),2),'note':'Python/CDP round-trip wall time for three events, includes automation overhead; not physical input-to-display latency.'}
 (root/'tests'/'v28'/('stress_metrics_'+(sys.argv[1] if len(sys.argv)>1 else 'run')+'.json')).write_text(json.dumps(metrics,indent=2));print(json.dumps(metrics,ensure_ascii=False));b.close()
print('7/7 stress checks passed')
