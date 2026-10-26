import { expect, test } from 'vitest';
import type { LevelData } from '../src/contracts';
import type { EditorRecord } from '../src/import/editor-map';
import { actionTarget, auditTraining43, cellReference, itemPresent, panelReference, positionAt, slotClassification } from '../tools/audit-training43';
const grid = { size:{width:23,depth:23,height:20} } as LevelData;
const row = (fields:Record<string,number>):EditorRecord => ({ index:0,offset:0,rawHex:'',nonzero:true,fields });

test('source cell reference units and origin are explicit; safety nets are rejected',()=>{
  expect(cellReference(grid,27936,'map')).toEqual({x:0,y:0,z:0});
  expect(cellReference(grid,4*10579,'data1')).toEqual({x:22,y:22,z:19});
  for (const offset of [-4,1,4*10580,NaN,Infinity]) expect(cellReference(grid,offset,'data1')).toBeNull();
  expect(cellReference(grid,27932,'map')).toBeNull();
  expect(cellReference(grid,27937,'map')).toBeNull();
  for (const index of [-1,0.5,10580,NaN]) expect(()=>positionAt(grid,index)).toThrow('outside grid');
});
test('panel no-op types do not execute editor-valid action records',()=>{
  const valid=row({used:255,actionIn:5,dataIn:27936});
  expect(panelReference(8,[valid]).classification).toBe('inactive');
  expect(panelReference(8|(3<<19),[valid]).classification).toBe('inactive');
  expect(panelReference(1<<19,[valid]).classification).toBe('inactive');
});
test('functional panel reference remains live evidence even when used is stale',()=>{
  expect(panelReference(8|(1<<19),[row({used:0})]).classification).toBe('unknown');
  expect(panelReference(8|(2<<19),[row({used:0})]).target).toEqual({type:2,editorUsed:0});
  expect(panelReference(8|(1<<19),[]).blocker).toMatch(/Missing referenced/);
});
test('zero active sentinels defeat other nonzero slot bytes',()=>{
  for(const kind of ['lifts','doors'] as const){
    expect(slotClassification(kind,row({position:0,direction:3,height:9}))).toBe('inactive');
    expect(slotClassification(kind,row({position:4,direction:0}))).toBe('unknown');
    expect(slotClassification(kind,row({direction:0}))).toBe('unknown');
  }
  expect(slotClassification('monsters',row({type:0,health:100,memory:44}))).toBe('inactive');
  expect(slotClassification('monsters',row({type:1,health:0}))).toBe('unknown');
});
test('action directions have distinct address domains and nothing has no target',()=>{
  expect(actionTarget(grid,0,0)).toEqual({target:null,blocker:null});
  expect(actionTarget(grid,5,27936).target).toEqual({x:0,y:0,z:0});
  expect(actionTarget(grid,5,27935).blocker).toMatch(/Malformed/);
  expect(actionTarget(grid,12,9294).target).toEqual({table:'lifts',index:0});
  for(const value of [9293,9295,9614]) expect(actionTarget(grid,12,value).blocker).toMatch(/Malformed/);
  expect(actionTarget(grid,255,0).blocker).toMatch(/outside this bounded audit/);
});
test('whole-map audit rejects a structurally valid source with the wrong digest',async()=>{
  await expect(auditTraining43(new Uint8Array(157738))).rejects.toThrow('digest mismatch');
});

test('item presence excludes stale high source bits',()=>{
  expect(itemPresent(0x89000000)).toBe(false);
  expect(itemPresent(0x80000001)).toBe(true);
});
