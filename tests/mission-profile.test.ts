import {describe,it,expect} from 'vitest';
import {extractionProfile,missionRulesForLevel} from '../src/sim/mission-profile';
import {createPatrolMissionLevel,createTrainingGateLevel,initialTrainingGate} from '../src/world/training-gate';
import {effectivePatrolLevel} from '../src/world/training-patrol';
import {createTrainingEncounter} from '../src/combat/training-encounter';
import {createPressurePadLevel,effectiveGateLevel} from '../src/world/training-gate';

it('v13 canonical raw and standing pad projections keep the fixed mission, arbitrary descriptor/floor edits do not',()=>{
 const map=createPressurePadLevel(),gate=initialTrainingGate(true,true);
 expect(extractionProfile(map)?.timeLimit).toBe(10);expect(extractionProfile(effectiveGateLevel(map,gate))?.timeLimit).toBe(10);
 for(const [index,word] of [[648,0x80000401],[119,0x81000042],[119,0x81800002]]){const bad=structuredClone(map);bad.layers[0][index!]=word!;expect(extractionProfile(bad)).toBeNull();}
});
describe('canonical authored patrol mission profile',()=>{
 it('fixes ten source counts and cooperative rules without enabling practice or fake geometry',()=>{
  const map=createPatrolMissionLevel();expect(extractionProfile(map)).toEqual({title:'Authored patrol extraction',timeLimit:10});expect(missionRulesForLevel(map)).toEqual({mode:'cooperative-extraction',timeLimit:10});
  for(const mode of ['navigation','first-exit'] as const)expect(()=>missionRulesForLevel(map,mode)).toThrow('fixed');
  expect(missionRulesForLevel(createTrainingGateLevel())).toEqual({mode:'navigation',timeLimit:null});
  for(const mutate of [(m:typeof map)=>{m.layers[0][0]=1;},(m:typeof map)=>{m.source.sha256='0'.repeat(64);},(m:typeof map)=>{m.name='forged';},(m:typeof map)=>{m.starts[0]!.x++;}]){const fake=structuredClone(map);mutate(fake);expect(extractionProfile(fake)).toBeNull();expect(()=>missionRulesForLevel(fake,'cooperative-extraction')).toThrow();}
 });
 it('accepts only reachable gate and exit overlays, keeping original Training43 profile untouched',()=>{
  const map=createPatrolMissionLevel(),gate=initialTrainingGate(),row=new Uint8Array(286);row[265]=8;row[284]=24;row[285]=255;
  const target=createTrainingEncounter({itemId:25,rawHex:Buffer.from(row).toString('hex')},[0,1,2,3],0,'full');
  for(const phase of [0,1,2])for(const hp of [0,100000]){
   const g={...gate,panelWord:phase===1?0x8010004b:0x8008004b,overlay:{...gate.overlay,word:phase===1?0x80000001:0x80000043,discoveryWord:phase?0x80000400:0x80000000}};
   expect(extractionProfile(effectivePatrolLevel(map,g,{...target,fitness:hp}))?.timeLimit).toBe(10);
  }
 });
});

it('v12 permits only canonical timed-door word overlays and exit transitions',async()=>{
 const {createMovingDoorLevel,initialTrainingGate}=await import('../src/world/training-gate');
 const {advanceMovingDoor}=await import('../src/world/training-moving-door');
 const map=createMovingDoorLevel();let gate=initialTrainingGate(true);
 for(let t=0;t<150;t++){
  gate={...gate,moving:advanceMovingDoor(gate.moving!,t===0?14:t===70?15:0,[])};
  gate.overlay={...gate.overlay,word:gate.moving!.word};
  expect(extractionProfile(effectivePatrolLevel(map,gate,null))?.timeLimit).toBe(10);
 }
 for(const mutate of [(m:typeof map)=>{m.layers[0][649]!^=64;},(m:typeof map)=>{m.layers[0][649]=0x8580a003;},(m:typeof map)=>{m.layers[0][650]=66;},(m:typeof map)=>{m.starts[0]!.x++;}]){const bad=structuredClone(map);mutate(bad);expect(extractionProfile(bad)).toBeNull();}
});
