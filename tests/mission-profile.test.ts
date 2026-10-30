import {describe,it,expect} from 'vitest';
import {extractionProfile,missionRulesForLevel} from '../src/sim/mission-profile';
import {createPatrolMissionLevel,createTrainingGateLevel,initialTrainingGate} from '../src/world/training-gate';
import {effectivePatrolLevel} from '../src/world/training-patrol';
import {createTrainingEncounter} from '../src/combat/training-encounter';
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
