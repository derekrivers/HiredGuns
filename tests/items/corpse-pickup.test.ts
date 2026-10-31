import {expect,it} from 'vitest';
import {pickupCorpseEquipment,type CorpsePickupInput} from '../../src/items/corpse-pickup';
import type {ItemCatalog} from '../../src/import/items';
import type {InventorySlot} from '../../src/import/characters';
export const entry=(itemId=0,damage=17,ammo=3,fourthByte=173):InventorySlot=>({itemId,damage,ammo,fourthByte,rawHex:[itemId,damage,ammo,fourthByte].map(n=>n.toString(16).padStart(2,'0')).join('')});
export function fixture(){
 const items={records:Array.from({length:114},(_,j)=>({itemId:j+1,category:j===0?21:0,weight:140}))} as ItemCatalog;
 const s:CorpsePickupInput={actors:Array.from({length:4},(_,j)=>({statsDeadWord:j===3?0xff00:0,windowType:0,controlMethod:1,race:0,physique:100,fitness:1234,spellWater:0,spellWings:0,underwaterCount:19,drowningIndicator:20,inventory:{equipped:entry(j===3?1:0,21+j,3,170+j),carried:Array.from({length:30},(_,n)=>entry(n<3?2:0,n,4,100+n)),actions:Array.from({length:10},(_,n)=>entry(2,n,9,240+n))},weight:{totalWeight:0,quotient:0,tooHeavy:false,usingGrenade:0}})),deadWords:[0,0,0,0xff00],players:Array.from({length:4},()=>({selection:0,lastPosition:0,noRoom:0,heavyCount:0})),recipient:2,cell:{first:0x70000020,second:3<<12,third:0xfedcba98},redraw:0};
 return {s,items};
}
it('native using-first copies three bytes, retains outline/actions/tails and only clears source ID',()=>{
 const {s,items}=fixture(),before=structuredClone(s),r=pickupCorpseEquipment(s,items);
 expect(s).toEqual(before);expect(r.outcome).toBe('transferred');
 expect(r.state.actors[2]!.inventory.equipped.rawHex).toBe('011803ac');
 expect(r.state.actors[3]!.inventory.equipped.rawHex).toBe('001803ad');
 expect(r.state.actors[2]!.weight).toEqual({totalWeight:840,quotient:6,tooHeavy:false,usingGrenade:2});
 expect(r.state.actors[3]!.weight).toEqual({totalWeight:420,quotient:3,tooHeavy:false,usingGrenade:0});
 for(let i=0;i<4;i++)expect(r.state.actors[i]!.inventory.actions).toEqual(before.actors[i]!.inventory.actions);
 expect(r.state.cell).toEqual(s.cell);expect(r.state.deadWords).toEqual(s.deadWords);expect(r.state.players).toEqual(s.players);
 expect(r.state.actors.slice(0,2)).toEqual(s.actors.slice(0,2));
});
it('native first store shifts full contiguous prefix and clears only last occupied ID',()=>{
 const {s,items}=fixture();s.actors[3]!.inventory.equipped=entry();
 const before=structuredClone(s),r=pickupCorpseEquipment(s,items),source=r.state.actors[3]!.inventory;
 expect(source.carried.slice(0,2)).toEqual(before.actors[3]!.inventory.carried.slice(1,3));
 expect(source.carried[2]!.rawHex).toBe('00020466');expect(source.carried.slice(3)).toEqual(s.actors[3]!.inventory.carried.slice(3));
 expect(r.state.actors[2]!.inventory.equipped.rawHex).toBe('020004ac');expect(s).toEqual(before);
});
it('occupied insertion copies all four old equipment bytes and entire opaque tail',()=>{
 const {s,items}=fixture();s.actors[2]!.inventory.equipped=entry(2,99,8,222);s.players[2]!.selection=2;
 const old=structuredClone(s),r=pickupCorpseEquipment(s,items);
 expect(r.state.actors[2]!.inventory.carried[2]!.rawHex).toBe('026308de');
 expect(r.state.actors[2]!.inventory.carried.slice(3)).toEqual(old.actors[2]!.inventory.carried.slice(2,29));
 expect(r.state.actors[2]!.inventory.equipped.rawHex).toBe('011803de');expect(r.state.players[2]!.lastPosition).toBe(2);
});
it('native full-store failure writes lastPosition/noRoom, balanced12-byte branch has no inventory/weight write',()=>{
 const {s,items}=fixture();s.actors[2]!.inventory.equipped=entry(2);s.actors[2]!.inventory.carried[29]=entry(2);s.players[2]!.selection=2;
 const r=pickupCorpseEquipment(s,items),expected=structuredClone(s);expected.players[2]!.lastPosition=2;expected.players[2]!.noRoom=150;
 expect(r.outcome).toBe('no-room');expect(r.state).toEqual(expected);
 s.actors[2]!.inventory.equipped=entry();expect(pickupCorpseEquipment(s,items).outcome).toBe('transferred');
});
it('first store only, native source selection double decrement and no gap search',()=>{
 const {s,items}=fixture();s.actors[3]!.inventory.equipped=entry();s.actors[3]!.inventory.carried=s.actors[3]!.inventory.carried.map(()=>entry());
 s.actors[3]!.inventory.carried[0]=entry(2);s.players[3]!.selection=2;
 expect(pickupCorpseEquipment(s,items).state.players[3]!.selection).toBe(0);
 s.actors[3]!.inventory.carried[0]=entry();s.actors[3]!.inventory.carried[2]=entry(2);expect(pickupCorpseEquipment(s,items).outcome).toBe('empty-corpse');
});
it.each(['dead','window7','control0','heavy','no-aux','living-owner','window1'])('native guard/domain distinction %s',kind=>{
 const {s,items}=fixture();if(kind==='dead')s.deadWords[2]=0xff00;if(kind==='window7')s.actors[2]!.windowType=7;if(kind==='control0')s.actors[2]!.controlMethod=0;if(kind==='heavy')s.actors[2]!.weight.tooHeavy=true;if(kind==='no-aux')s.cell.first=0;if(kind==='living-owner')s.deadWords[3]=0;if(kind==='window1')s.actors[2]!.windowType=1;
 expect(pickupCorpseEquipment(s,items).outcome).toBe(['dead','window7','control0'].includes(kind)?'caller-guard':kind==='heavy'?'already-too-heavy':kind==='no-aux'?'outside-corpse':'transferred');
});
it('weight uses unsigned ammo categories, spell24, source-first recompute and overflow refusal',()=>{
 const {s,items}=fixture();s.actors[2]!.physique=0;const r=pickupCorpseEquipment(s,items);expect(r.state.players[2]!.heavyCount).toBe(50);expect(r.state.actors[2]!.weight.tooHeavy).toBe(true);
 s.actors[2]!.spellWings=24;expect(pickupCorpseEquipment(s,items).state.actors[2]!.weight.totalWeight).toBe(0);
 s.actors[2]!.spellWings=0;items.records[0]!.weight=65535;s.actors[3]!.inventory.equipped.ammo=255;s.actors[3]!.inventory.equipped.rawHex='0118ffad';expect(()=>pickupCorpseEquipment(s,items)).toThrow('overflow');
});
it.each(['accessor','hidden','prototype','sparse','unknown','raw','extra','owner','cycle'])('refuses malformed data %s without mutation/getters',kind=>{
 const {s,items}=fixture();let reads=0;
 if(kind==='accessor')Object.defineProperty(s.actors[2]!.inventory,'equipped',{enumerable:true,get(){reads++;throw Error('CANARY');}});
 if(kind==='hidden')Object.defineProperty(s,'redraw',{value:0,enumerable:false});if(kind==='prototype')Object.setPrototypeOf(s,{});if(kind==='sparse')delete s.actors[0]!.inventory.carried[1];if(kind==='unknown')s.actors[0]!.inventory.actions[0]=entry(255);if(kind==='raw')s.actors[0]!.inventory.carried[0]!.rawHex='bad';if(kind==='extra')Object.assign(s,{extra:0});if(kind==='owner')s.cell.second=255<<12;if(kind==='cycle')Object.assign(s,{extra:s});
 const descriptors=Object.getOwnPropertyDescriptors(s);expect(()=>pickupCorpseEquipment(s,items)).toThrow();expect(reads).toBe(0);expect(Object.getOwnPropertyDescriptors(s)).toEqual(descriptors);
});
it.each(['category','weight','identity','sparse','getter'])('parsed table domain refuses %s before native no-op branches',kind=>{
 const {s,items}=fixture();s.actors[2]!.weight.tooHeavy=true;let reads=0;
 if(kind==='category')items.records[113]!.category=256;if(kind==='weight')items.records[113]!.weight=-1;if(kind==='identity')items.records[113]!.itemId=113;if(kind==='sparse')delete items.records[113];if(kind==='getter')Object.defineProperty(items.records[113],'weight',{enumerable:true,get(){reads++;throw Error('CATALOG');}});
 expect(()=>pickupCorpseEquipment(s,items)).toThrow();expect(reads).toBe(0);
});
