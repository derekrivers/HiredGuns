import {describe,it,expect} from 'vitest';
import {importItems,ITEM_FILE_BYTES} from '../src/import/items';
import type {SelectionInventory} from '../src/import/inventory';
import {useConsumable} from '../src/items/consumable-use';
const slot=(id=0)=>({itemId:id,damage:23,ammo:45,fourthByte:67,rawHex:[id,23,45,67].map(n=>n.toString(16).padStart(2,'0')).join('')});
async function fixture(category=5,boost=17000,id=60){const raw=new Uint8Array(ITEM_FILE_BYTES),view=new DataView(raw.buffer);for(let i=0;i<114;i++){raw[i*286+254]=category;view.setUint16(i*286+260,140);view.setUint16(i*286+274,boost);}const items=await importItems(raw);const inventory:SelectionInventory={equipped:slot(id),carried:Array.from({length:30},(_,i)=>slot(i===0?62:0)),actions:Array.from({length:10},()=>slot())};return {items,inventory};}
describe('source food and repair numeric operation (synthetic raw records)',()=>{
 for(const category of [5,19])for(const race of [0,1,2,3,4,5,255])it(`category ${category} race ${race}`,async()=>{
  const {items,inventory}=await fixture(category),before=structuredClone({items,inventory});
  if((category===19)===[1,4].includes(race)){const r=useConsumable(items,inventory,race,100,1000);expect(r.fitness).toBe(18000);expect(r.inventory.equipped).toEqual({...inventory.equipped,itemId:0,rawHex:'00172d43'});expect(r.inventory.carried).toEqual(inventory.carried);expect(r.inventory.actions).toEqual(inventory.actions);expect(r.receipt).toMatchObject({weightBefore:280,weightAfter:140});}
  else expect(()=>useConsumable(items,inventory,race,100,1000)).toThrow('Race');
  expect({items,inventory}).toEqual(before);
 });
 for(const boost of [0,1,17000,65535])for(const fitness of [0,1,65000,65535])it(`boost ${boost} fitness ${fitness} clears even at zero/full`,async()=>{const {items,inventory}=await fixture(5,boost);const result=useConsumable(items,inventory,3,100,fitness);expect(result.fitness).toBe(Math.min(65535,fitness+boost));expect(result.inventory.equipped.itemId).toBe(0);});
 it('medical 64, empty and unsupported category refuse immutably',async()=>{for(const [id,category,message] of [[64,5,'Medical'],[0,5,'Empty'],[60,0,'category']] as const){const f=await fixture(category,60000,id),before=structuredClone(f);expect(()=>useConsumable(f.items,f.inventory,0,100,200)).toThrow(message);expect(f).toEqual(before);}});
 for(const mutate of [(f:Awaited<ReturnType<typeof fixture>>)=>{f.items.records[59]!.rawHex='ff';},(f:Awaited<ReturnType<typeof fixture>>)=>{f.items.records[59]!.category=19;},(f:Awaited<ReturnType<typeof fixture>>)=>{f.items.records[59]!.weight++;},(f:Awaited<ReturnType<typeof fixture>>)=>{f.items.records[59]!.itemId++;},(f:Awaited<ReturnType<typeof fixture>>)=>{f.items.records[59]!.extensionHex='00'.repeat(12);},(f:Awaited<ReturnType<typeof fixture>>)=>{f.inventory.equipped.rawHex='00000000';},(f:Awaited<ReturnType<typeof fixture>>)=>{f.inventory.actions[0]!.itemId=255;}])it('rejects raw/derived/opaque reference tampering',async()=>{const f=await fixture();mutate(f);expect(()=>useConsumable(f.items,f.inventory,3,100,1000)).toThrow();});
 for(const bad of [-1,65536,NaN,1.5])it(`rejects non-word ${bad}`,async()=>{const f=await fixture();expect(()=>useConsumable(f.items,f.inventory,3,100,bad)).toThrow();});
});
