import type { InventorySlot } from '../import/characters';
import type { ItemCatalog } from '../import/items';
import { computeSourceWeight, type SelectionInventory } from '../import/inventory';

const uint = (n: number, max: number) => Number.isInteger(n) && n >= 0 && n <= max;
function entry(slot: InventorySlot): void {
  if (!slot || ![slot.itemId,slot.damage,slot.ammo,slot.fourthByte].every(n=>uint(n,255)) || slot.rawHex !== [slot.itemId,slot.damage,slot.ammo,slot.fourthByte].map(n=>n.toString(16).padStart(2,'0')).join('')) throw new Error('Malformed four-byte item entry.');
}
/** Numeric source deduction, not source authentication. Complete raw records win over labels. */
export function useConsumable(items: ItemCatalog, inventory: SelectionInventory, race: number, physique: number, fitness: number) {
  if (!uint(race,255) || !uint(physique,65535) || !uint(fitness,65535) || inventory.carried.length!==30 || inventory.actions.length!==10) throw new Error('Malformed consumable actor/storage.');
  for (const slot of [inventory.equipped,...inventory.carried,...inventory.actions]) {
    entry(slot);
    if (!slot.itemId) continue;
    const r=items.records[slot.itemId-1];
    if (!r || r.itemId!==slot.itemId || r.index!==slot.itemId-1 || r.offset!==r.index*286 || !/^[0-9a-f]{572}$/.test(r.rawHex)) throw new Error('Invalid full raw item reference.');
    const byte=(o:number)=>parseInt(r.rawHex.slice(o*2,o*2+2),16);
    if (r.category!==byte(254) || r.weight!==byte(260)*256+byte(261) || r.extensionHex!==r.rawHex.slice(548)) throw new Error('Item fields disagree with raw record.');
  }
  const itemId=inventory.equipped.itemId;
  if (!itemId) throw new Error('Empty equipment: equip food or repair first.');
  const r=items.records[itemId-1]!;
  if (r.category!==5 && r.category!==19) throw new Error('Unsupported category: only ordinary food and repair are available.');
  if ((r.category===5 && (race===1 || race===4)) || (r.category===19 && race!==1 && race!==4)) throw new Error('Race cannot use this item: food excludes races 1/4; repair requires race 1/4.');
  if (itemId===64) throw new Error('Medical pack 64 unsupported: poison status and cure are not modeled.');
  const boost=parseInt(r.rawHex.slice(548,552),16), next=structuredClone(inventory);
  next.equipped={...next.equipped,itemId:0,rawHex:`00${next.equipped.rawHex.slice(2)}`};
  const before=computeSourceWeight(items,inventory,physique), after=computeSourceWeight(items,next,physique);
  if (before.status!=='computed' || after.status!=='computed') throw new Error('Unsupported source weight.');
  return {inventory:next,weight:{status:'verified' as const,totalWeight:after.totalWeight,quotient:after.quotient,tooHeavy:after.tooHeavy,usingGrenade:after.usingGrenade},fitness:fitness+Math.min(boost,65535-fitness),receipt:{itemId,category:r.category,boost,fitnessBefore:fitness,fitnessAfter:fitness+Math.min(boost,65535-fitness),weightBefore:before.totalWeight,weightAfter:after.totalWeight}};
}
