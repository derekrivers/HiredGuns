import { expect, it } from 'vitest';
import { createDemoLevel } from '../src/demo';
import { cellIndex } from '../src/contracts';
import { sourceDeathSearch } from '../src/character/source-death-search';
const p={x:5,y:6,z:1};
it.each([[8,0,1],[9,-1,0],[10,0,-1],[11,1,0]])('aux %i redirects the search without relocating the body', (aux,dx,dy)=>{
 const level=createDemoLevel(),i=cellIndex(level,p),target=cellIndex(level,{...p,x:p.x+dx,y:p.y+dy});
 level.layers[0][i]=((aux<<28)|32|4|(2<<17))>>>0;level.layers[1].fill(0x89abcdef);const before=structuredClone(level);
 const r=sourceDeathSearch(level,p);expect(r.target).toBe(target);expect(r.trace.map(s=>s.index)).toEqual([i,target,target]);expect(r.outcome).toBe('corpse');expect(level).toEqual(before);
});
it.each([16,17,18,19])('below stair %i takes precedence over the current floor',type=>{
 const level=createDemoLevel(),i=cellIndex(level,p);level.layers[0][i]=1;level.layers[0][cellIndex(level,{...p,z:0})]=(type<<11)|2;
 const delta=[{x:0,y:1},{x:-1,y:0},{x:0,y:-1},{x:1,y:0}][type-16]!;
 expect(sourceDeathSearch(level,p).target).toBe(cellIndex(level,{...p,x:p.x+delta.x,y:p.y+delta.y}));
});
it.each([0,1,2,3,4,5,6])('support block %i finds the current cell',type=>{
 const level=createDemoLevel();level.layers[0][cellIndex(level,{...p,z:0})]=(type<<11)|2;expect(sourceDeathSearch(level,p).target).toBe(cellIndex(level,p));
});
it('no support descends; a blocked redirected cell produces no skeleton',()=>{
 const level=createDemoLevel();expect(sourceDeathSearch(level,{...p,z:2}).target).toBe(cellIndex(level,p));
 level.layers[0][cellIndex(level,p)]=(10<<28|32)>>>0;level.layers[0][cellIndex(level,{...p,y:p.y-1})]=2;
 expect(sourceDeathSearch(level,p)).toMatchObject({target:null,outcome:'blocked-no-skeleton'});
});
it.each([7,12,13,14])('uncomposed aux %i refuses with unchanged complete planes',aux=>{
 const level=createDemoLevel();level.layers[0][cellIndex(level,p)]=((aux<<28)|32)>>>0;const before=structuredClone(level);expect(()=>sourceDeathSearch(level,p)).toThrow();expect(level).toEqual(before);
});
it('cycles, pads, occupied targets, bounds and exhausted search reject',()=>{
 const level=createDemoLevel(),i=cellIndex(level,p),n=cellIndex(level,{...p,y:p.y-1});
 level.layers[0][i]=(10<<28|32)>>>0;level.layers[0][n]=(8<<28|32)>>>0;expect(()=>sourceDeathSearch(level,p)).toThrow('cycle');
 level.layers[0][i]=1|(1<<9);expect(()=>sourceDeathSearch(level,p)).toThrow('floor');
 level.layers[0][i]=(32<<11)|2;expect(()=>sourceDeathSearch(level,p)).toThrow('occupied');
 expect(()=>sourceDeathSearch(level,{...p,z:0})).toThrow('bounds');
 const tall={...level,size:{width:1,depth:1,height:70},layers:[Array(70).fill(0),Array(70).fill(0),Array(70).fill(0)] as typeof level.layers};
 expect(()=>sourceDeathSearch(tall,{x:0,y:0,z:69})).toThrow('step budget');
});
