/* Simulated DOM/resource lifecycle. Actual browser network/SRI is a separate test. */
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname,'..');
const loader = fs.readFileSync(path.join(root,'annotation-loader.js'),'utf8');
const names = ['annotation.css','annotation-config.js','annotation.js'];
let passed=0;
function check(name,condition){assert.ok(condition,name);console.log('PASS '+name);passed++;}
async function boot(options={}) {
  const source={src:options.src??'https://assets.example.test/engine/annotation-loader.js?rev=32',dataset:{yjaRelease:options.release},nonce:'test-nonce'};
  const cfg={textContent:options.json??JSON.stringify({external:true,pageInk:true,course:'demo',chapter:'ch1',revision:'r1'})};
  const original={dataset:{},hasAttribute:()=>!!options.rootError};
  const nodes=[], requests=[], listeners=new Map(); let toolbars=options.existing?1:0;
  class ErrorEvent {}
  const doc={currentScript:source,readyState:options.loading?'loading':'complete',documentElement:original,
    addEventListener:(name,fn)=>listeners.set(name,fn),
    querySelectorAll:s=>s.startsWith('script')?(options.multiple?[cfg,cfg]:options.noConfig?[]:[cfg]):Array(toolbars).fill({}),
    querySelector:s=>s==='.yja-ui'?(toolbars?{}:null):options.existing?{}:null,
    createElement:tag=>({tag,dataset:{},events:{},addEventListener(k,fn){this.events[k]=fn;},remove(){this.removed=true;}}),
    head:{append(n){nodes.push(n);const url=n.src||n.href;requests.push(url);queueMicrotask(()=>{
      const name=n.dataset.yjaLoaderAsset;
      if(options.reject===name){n.events.error();return;}
      const bytes=fs.readFileSync(path.join(root,'releases',options.release??'v32',name));
      const hash='sha384-'+crypto.createHash('sha384').update(bytes).digest('base64');
      if(hash!==n.integrity||options.tamper===name){n.events.error();return;}
      if(name==='annotation-config.js'){if(options.invalid)original.dataset.yjaConfigError='true';else cfg.yjaExternalConfig={};}
      if(name==='annotation.js'&&!options.decline){cfg.yjaExternalActive=true;toolbars=options.partial?0:1;}
      if(name==='annotation.js'&&options.runtimeError)listeners.get('error')?.(new ErrorEvent());
      n.events.load();
    });}}};
  const window={addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name)};
  const context=vm.createContext({window,document:doc,location:{protocol:options.protocol??'https:'},URL,ErrorEvent,console:{warn(){}}});
  vm.runInContext(loader,context);if(options.duplicate)vm.runInContext(loader,context);
  if(options.loading){assert.equal(requests.length,0);doc.readyState='interactive';listeners.get('DOMContentLoaded')();}
  for(let i=0;i<8;i++)await new Promise(r=>setImmediate(r));
  return {state:window.YJA_LOADER.state,release:window.YJA_LOADER.release,reason:window.YJA_LOADER.reason,requests,nodes,cfg,original,toolbars};
}
(async()=>{
  let x=await boot({duplicate:true,loading:true});
  check('default release v32',x.release==='v32');check('CSS → configuration → engine sequence',x.requests.map(u=>u.split('/').pop()).join()===names.join());
  check('one toolbar despite duplicate loader',x.toolbars===1&&x.state==='ready');
  check('relative version path resolved independently of document URL',x.requests.every(u=>u.startsWith('https://assets.example.test/engine/releases/v32/')));
  check('all resources pinned and anonymous CORS',x.nodes.every(n=>n.integrity.startsWith('sha384-')&&n.crossOrigin==='anonymous'));
  check('CSP nonce forwarded',x.nodes.every(n=>n.nonce==='test-nonce'));
  x=await boot({release:'v31'});check('explicit rollback release v31',x.state==='ready'&&x.requests.every(u=>u.includes('/v31/')));
  for(const name of names){x=await boot({reject:name});check(name+' resource rejection disables and removes owned nodes',x.state==='disabled'&&x.nodes.every(n=>n.removed)&&!x.cfg.yjaExternalConfig&&!x.toolbars);}
  for(const name of names){x=await boot({tamper:name});check(name+' altered bytes rejected in simulated SRI',x.state==='disabled'&&!x.toolbars);}
  x=await boot({invalid:true});check('invalid adapter config cleans diagnostic and assets',x.state==='disabled'&&!x.original.dataset.yjaConfigError&&x.nodes.every(n=>n.removed));
  x=await boot({decline:true});check('engine decline cleans own resources',x.state==='disabled'&&x.nodes.every(n=>n.removed));
  x=await boot({partial:true});check('partial activation requires reload, no hot fallback',x.state==='reload-required'&&x.nodes.every(n=>!n.removed));
  x=await boot({runtimeError:true});check('runtime error after activation not reported ready',x.state==='reload-required');
  for(const [label,options] of [['unknown version',{release:'v99'}],['prototype name',{release:'__proto__'}],['missing config',{noConfig:true}],['multiple configs',{multiple:true}],['existing engine',{existing:true}],['existing error marker',{rootError:true}],['invalid JSON',{json:'{'}],['legacy mode',{json:'{"external":false,"pageInk":true}'}],['file scheme',{protocol:'file:'}],['invalid asset scheme',{src:'file:///x/annotation-loader.js'}]]){x=await boot(options);check(label+' fails before asset requests',x.state==='disabled'&&!x.requests.length);}
  for(const name of names)check(name+' same bytes across v31/v32 and original core',fs.readFileSync(path.join(root,'releases/v31',name)).equals(fs.readFileSync(path.join(root,'releases/v32',name)))&&fs.readFileSync(path.join(root,'releases/v32',name)).equals(fs.readFileSync(path.join(root,'yja-annotation-pilot/lesson/annotation',name))));
  console.log(`${passed}/${passed} simulated loader checks passed`);
})().catch(e=>{console.error(e);process.exitCode=1;});
