import {describe,it,expect} from 'vitest';
import {readFile} from 'node:fs/promises';
import {deriveSignCue,importSignMap,readTrainingSignCue,signData} from '../src/sim/training-sign';
import {TRAINING_43_SHA256} from '../src/sim/mission-profile';
import {createDemoLevel} from '../src/demo';

function input(facing=0) {
  const position={x:6,y:6,z:4,facing};
  const index=(4*23+6+(facing===0?-1:facing===2?1:0))*23+6+(facing===1?1:facing===3?-1:0);
  return {admitted:true,sourceHash:TRAINING_43_SHA256,levelId:'synthetic-projection',worldLevelId:'synthetic-projection',size:{width:23,depth:23,height:20},position,index,word:8,actor:0,loading:false,exited:false,runtimeDeadWord:0,statsDeadWord:0,windowType:0,controlMethod:1};
}
describe('pure sign view predicate; projected caller authority only',()=>{
  for(const facing of [0,1,2,3])it(`requires the exact facing slot ${facing}, without input writes`,()=>{
    const a=input(facing),before=structuredClone(a);Object.freeze(a.position);Object.freeze(a.size);Object.freeze(a);
    expect(deriveSignCue(a)).toEqual({index:a.index,variant:0});expect(a).toEqual(before);
    expect(deriveSignCue({...a,index:a.index+1})).toBeNull();
    expect(deriveSignCue({...a,position:{...a.position,facing:(facing+1)%4}})).toBeNull();
  });
  it('retains all five variant bits and ignores unrelated opaque word bits',()=>{
    for(let variant=0;variant<32;variant++)expect(deriveSignCue({...input(),word:(8|(variant<<23)|0x80000043)>>>0})).toEqual({index:input().index,variant});
    for(const word of [0,1,8|0x80000,8|0x100000,8|0x180000,8|256,8|128,-1,2**32,NaN,8.5,'8'])expect(deriveSignCue({...input(),word})).toBeNull();
  });
  it('refuses each admission, actor, viewport, lifecycle, source and bounds failure',()=>{
    const bad:Record<string,unknown[]>={admitted:[false,undefined],sourceHash:['forged',null],levelId:['',3],worldLevelId:['another'],loading:[true,0],exited:[true,0],runtimeDeadWord:[1,0xff00],statsDeadWord:[1],windowType:[1,5,7],controlMethod:[0,2],actor:[-1,4,0.5],size:[{width:24,depth:23,height:20},{width:23,depth:22,height:20},{width:23,depth:23,height:19},null]};
    for(const [key,values] of Object.entries(bad))for(const value of values)expect(deriveSignCue({...input(),[key]:value}),key).toBeNull();
    for(const key of ['x','y','z','facing'])for(const value of [-1,0.5,NaN,Infinity,'0',undefined,24])expect(deriveSignCue({...input(),position:{...input().position,[key]:value}})).toBeNull();
    for(const [facing,x,y] of [[0,6,0],[1,22,6],[2,6,22],[3,0,6]])expect(deriveSignCue({...input(),position:{x,y,z:0,facing}})).toBeNull();
    for(const value of [null,undefined,[],{},42])expect(deriveSignCue(value)).toBeNull();
  });
  it('does not read inherited, hidden or accessor data, nor capture callbacks',()=>{
    let reads=0;const a=input();
    for(const key of Object.keys(a)){
      const accessor={...a};Object.defineProperty(accessor,key,{enumerable:true,get(){reads++;throw Error('getter');}});expect(deriveSignCue(accessor)).toBeNull();
      const inherited={...a};Reflect.deleteProperty(inherited,key);Object.setPrototypeOf(inherited,{[key]:(a as unknown as Record<string,unknown>)[key]});expect(deriveSignCue(inherited)).toBeNull();
      const hidden={...a};Object.defineProperty(hidden,key,{enumerable:false});expect(deriveSignCue(hidden)).toBeNull();
    }
    expect(deriveSignCue({...a,callback(){reads++;}})).not.toBeNull();expect(reads).toBe(0);
    expect(signData(Object.create({wetParty:{}}),'wetParty')).toBeUndefined();
  });
  it('never authenticates parsed metadata, a forged token or a synthetic raw import',async()=>{
    const level=createDemoLevel();expect(readTrainingSignCue({sha256:TRAINING_43_SHA256},level,input())).toBeNull();
    const bytes=new Uint8Array(157738);const result=await importSignMap(bytes);expect(result.signSource).toBeNull();expect(bytes.every(n=>n===0)).toBe(true);
  });
});

it.skipIf(!process.env.HIRED_GUNS_T43_CASE_INPUTS)('private raw admission binds exact map object and refuses modified sign words',async()=>{
  const path=process.env.HIRED_GUNS_T43_CASE_INPUTS!;
  const manifest=JSON.parse(await readFile(path,'utf8'));
  const {level,signSource}=await importSignMap(await readFile(manifest.inputs.map));expect(signSource).not.toBeNull();
  const before=JSON.stringify(level);let seen=0;
  for(let i=0;i<level.layers[0].length;i++){
    const word=level.layers[0][i]!;if(!(word&8)||(word&0x180000)||(word&256))continue;
    const x=i%23,y=Math.floor(i/23)%23,z=Math.floor(i/(23*23));
    const p={...input(1),position:{x:x-1,y,z,facing:1},worldLevelId:level.id};
    expect(readTrainingSignCue(signSource,level,p)).toEqual({index:i,variant:(word>>>23)&31});
    expect(readTrainingSignCue(signSource,structuredClone(level),p)).toBeNull();
    level.layers[0][i]=word^8;expect(readTrainingSignCue(signSource,level,p)).toBeNull();level.layers[0][i]=word;seen++;
  }
  expect(seen).toBe(2);expect(JSON.stringify(level)).toBe(before);
});
