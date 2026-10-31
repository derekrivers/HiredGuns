import {expect,it} from 'vitest';
import {equalInventorySelectionData as equal} from '../src/sim/inventory-selection-equality';
import {wetSnapshot} from '../src/sim/training-wet';

// Independent canonical oracle for the admitted JSON domain, outside the hot path.
function canonical(v:unknown):string{
 if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';
 if(v!==null&&typeof v==='object')return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical((v as Record<string,unknown>)[k])).join(',')+'}';
 return JSON.stringify(v);
}
function reverse(v:unknown):unknown{
 if(Array.isArray(v))return v.map(reverse);
 return v!==null&&typeof v==='object'?Object.fromEntries(Object.entries(v).reverse().map(([k,x])=>[k,reverse(x)])):v;
}
it('compares complete JSON trees independently of object key insertion order',()=>{
 let seed=132;const next=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
 function tree(depth:number):unknown{
  if(!depth)return [null,false,true,'',String(next()),next()%65536][next()%6];
  return next()%2?Array.from({length:next()%5},()=>tree(depth-1)):Object.fromEntries(Array.from({length:next()%5},(_,i)=>['field'+i,tree(depth-1)]));
 }
 const values:unknown[]=[null,false,0,1,'1',[],{},[0],{'0':0},...Array.from({length:80},()=>tree(3))];
 for(const a of values)for(const b of values){
  const capturedA=wetSnapshot(a),capturedB=wetSnapshot(reverse(b));
  expect(equal(capturedA,capturedB)).toBe(canonical(a)===canonical(b));
 }
});
it('checks late geometry entries, nested opaque fields, types, extra/missing keys and array shape',()=>{
 const original={layers:[Array.from({length:16384},(_,i)=>i),[0,1]],catalog:[{rawHex:'abcdef',text:{info:['one','two']},extensionHex:'ff'}]};
 for(const change of [
  (v:typeof original)=>{v.layers[0]![16383]=v.layers[0]![16383]!^1;},
  (v:typeof original)=>{v.catalog[0]!.extensionHex='00';},
  (v:typeof original)=>{v.catalog[0]!.text.info[1]='changed';},
  (v:typeof original)=>{Object.assign(v.catalog[0]!,{extra:0});},
  (v:typeof original)=>{Reflect.deleteProperty(v.catalog[0]!,'rawHex');},
  (v:typeof original)=>{v.layers[1]!.push(0);},
  (v:typeof original)=>{Object.assign(v.layers[1]!,{extra:0});},
 ]){const changed=structuredClone(original);change(changed);expect(equal(original,changed)).toBe(false);expect(equal(changed,original)).toBe(false);}
 for(const [a,b]of [[[],{}],[[1],{'0':1}],[[1],['1']],[null,{}],[false,0],[[],new Array(1)]])expect(equal(a,b)).toBe(false);
 const a=Object.fromEntries([['__proto__',{opaque:1}],['constructor',2]]),b=reverse(a);
 expect(equal(a,b)).toBe(true);expect(equal(a,{constructor:2})).toBe(false);
});
it('retains descriptor-only capture as the malformed input boundary',()=>{
 let reads=0;const getter={get entry(){reads++;return 1;}};
 const extra=[1];Object.assign(extra,{extra:0});
 for(const malformed of [getter,new Array(2),extra,Object.create({field:1}),new Uint8Array([1]),{value:undefined}])expect(()=>wetSnapshot(malformed)).toThrow();
 expect(reads).toBe(0);
});
