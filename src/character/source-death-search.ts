import { cellIndex, inBounds, type LevelData, type Position } from '../contracts';

export interface DeathSearchStep { index:number; branch:'find-floor'|'south'|'west'|'north'|'east' }
export interface DeathSearch { target:number|null; trace:DeathSearchStep[]; outcome:'corpse'|'blocked-no-skeleton' }
const BLOCK=0x1f802;
const fail=(why:string):never=>{throw Error(`Source death search refused: ${why}`);};
const solid=(w:number)=>(w&BLOCK)!==0&&((w&BLOCK)>>>11)<=6;
/** Main.s:1173–1317. Logical coordinates replace source pointers; no actor relocation.
 * Door fallback, pads, auxiliary replacement and unbounded searches remain refused.
 * The supplied map must be the complete caller-owned three-plane candidate.
 */
export function sourceDeathSearch(level:LevelData,start:Position):DeathSearch {
 const trace:DeathSearchStep[]=[],visited=new Set<number>();let p={...start};
 const read=(at:Position)=>{if(!inBounds(level,at))return fail('bounds');const i=cellIndex(level,at),w=level.layers[0][i];if(!Number.isInteger(w)||w!<0||w!>0xffffffff)fail('map word');return w!;};
 const redirect=(direction:number):DeathSearch|null=>{
  const d=[{x:0,y:1},{x:-1,y:0},{x:0,y:-1},{x:1,y:0}][direction]!;
  p={...p,x:p.x+d.x,y:p.y+d.y};const w=read(p);
  trace.push({index:cellIndex(level,p),branch:(['south','west','north','east'] as const)[direction]!});
  return solid(w)?{target:null,trace,outcome:'blocked-no-skeleton'}:null;
 };
 for(let steps=0;steps<64;steps++){
  const w=read(p),i=cellIndex(level,p);if(visited.has(i))fail('cycle');visited.add(i);trace.push({index:i,branch:'find-floor'});
  const below=read({...p,z:p.z-1})&BLOCK,type=below>>>11;
  if(below&&type>=16&&type<=19){const result=redirect(type-16);if(result)return result;continue;}
  if(!solid(below)&&!(w&1)){p={...p,z:p.z-1};continue;}
  if((w&1)&&((w>>>9)&3)!==0)fail('pad/unknown floor');
  if(w&32){const aux=w>>>28;if(aux===12||aux===13)fail('door fallback uncomposed');if(aux>=8&&aux<=11){const result=redirect(aux-8);if(result)return result;continue;}fail('auxiliary/corpse replacement');}
  if(w&(2|64|16|256))fail('occupied/unknown corpse target');
  return {target:i,trace,outcome:'corpse'};
 }
 return fail('step budget');
}
