import {expect,it} from 'vitest';
import {transitionInventoryWindow,emptyInventoryTemp,type InventoryWindowInput} from '../../src/items/inventory-window';
const slot=(n:number)=>({itemId:n%3,damage:n+1,ammo:n+2,fourthByte:n+100,rawHex:[n%3,n+1,n+2,n+100].map(x=>x.toString(16).padStart(2,'0')).join('')});
function fixture():InventoryWindowInput{return {actor:{statsDeadWord:0,windowType:0,controlMethod:1,race:0,physique:100,fitness:65535,spellWater:0,spellWings:0,underwaterCount:9,drowningIndicator:8,inventory:{equipped:slot(1),carried:Array.from({length:30},(_,i)=>slot(i+2)),actions:Array.from({length:10},(_,i)=>slot(i+32))},weight:{totalWeight:999,quotient:7,tooHeavy:false,usingGrenade:0}},runtimeDeadWord:0,temp:slot(0),redraw:0};}
it('open preserves every entry; close clears exactly32 fourth bytes including temp and empty tails',()=>{
 const input=fixture(),before=structuredClone(input),opened=transitionInventoryWindow(input,'open');
 expect(input).toEqual(before);expect(opened.state).toEqual({...before,actor:{...before.actor,windowType:1},redraw:255});
 const r=transitionInventoryWindow(opened.state,'close'),expected=structuredClone(before);expected.redraw=255;
 for(const s of [expected.actor.inventory.equipped,expected.temp,...expected.actor.inventory.carried]){s.fourthByte=0;s.rawHex=s.rawHex.slice(0,6)+'00';}
 expect(r.state).toEqual(expected);expect(r.state.actor.inventory.actions).toEqual(before.actor.inventory.actions);
});
it('close outside prior window1 has no clear and direct store never cycles to VDU',()=>{
 const s=fixture();expect(transitionInventoryWindow(s,'close').state).toEqual({...s,redraw:255});const a=transitionInventoryWindow(s,'open');expect(transitionInventoryWindow(a.state,'open').state).toEqual(a.state);expect(emptyInventoryTemp().rawHex).toBe('00000000');
});
it.each(['dead','window7','control0'])('native caller guard %s preserves complete candidate',kind=>{const s=fixture();if(kind==='dead')s.runtimeDeadWord=0xff00;if(kind==='window7')s.actor.windowType=7;if(kind==='control0')s.actor.controlMethod=0;for(const op of ['open','close']as const)expect(transitionInventoryWindow(s,op)).toEqual({state:s,outcome:'caller-guard'});});
it.each(['raw','width','unknown','temp','accessor','hidden','alias-cycle'])('malformed %s refuses before getter',kind=>{const s=fixture();let reads=0;if(kind==='raw')s.actor.inventory.carried[29]!.rawHex='bad';if(kind==='width')s.actor.inventory.actions.pop();if(kind==='unknown')s.actor.inventory.equipped.itemId=255;if(kind==='temp')s.temp.ammo=256;if(kind==='accessor')Object.defineProperty(s,'temp',{enumerable:true,get(){reads++;throw Error('GETTER');}});if(kind==='hidden')Object.defineProperty(s,'redraw',{value:0,enumerable:false});if(kind==='alias-cycle')Object.assign(s,{cycle:s});expect(()=>transitionInventoryWindow(s,'close')).toThrow();expect(reads).toBe(0);});
