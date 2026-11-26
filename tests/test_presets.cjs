const assert=require('node:assert/strict');
const {defaultPresets,validatePresets}=require('../yja-annotation-pilot/lesson/annotation/annotation.js');
let n=0;const test=(name,f)=>{f();console.log('PASS '+name);n++};
test('default slots valid and independent',()=>{const a=defaultPresets(),b=defaultPresets();assert.deepEqual(validatePresets(a),a);a.slots[0].width=12;assert.equal(b.slots[0].width,2);assert.equal(a.slots[1].width,3)});
test('settings reject malformed schema and indexes',()=>{for(const v of [null,{}, {...defaultPresets(),schema:2},{...defaultPresets(),pen:3},{...defaultPresets(),highlight:0},{...defaultPresets(),slots:[]}])assert.throws(()=>validatePresets(v));});
test('settings reject unsafe color and width values',()=>{for(const patch of [{color:'url(javascript:bad)'},{width:0},{width:13},{width:2.5},{width:NaN}]){const a=defaultPresets();Object.assign(a.slots[0],patch);assert.throws(()=>validatePresets(a));}});
test('validated data copies fields only',()=>{const a=defaultPresets();a.slots[0].extra='not copied';const b=validatePresets(a);assert.equal(b.slots[0].extra,undefined);a.slots[0].width=12;assert.equal(b.slots[0].width,2);});
console.log(`${n} preset core tests passed.`);
