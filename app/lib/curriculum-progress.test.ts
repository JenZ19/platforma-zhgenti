import { describe,it,expect } from "vitest";
import { loadProgress,saveProgress,completeStep,progressKey } from "./progress";
import { importLearningBackup } from "./learning-backup";

describe("curriculum revision preserves old evidence",()=>{
  it.each(["family-expenses","family-budget:service","mobile:family-budget:service"])("never mistakes old first 8 of 18 for finished %s",slug=>{
    localStorage.clear(); const key=progressKey(slug);
    const raw=JSON.stringify({version:1,activeStep:9,completed:[1,2,3,4,5,6,7,8],score:80});
    localStorage.setItem(key,raw);
    const p=loadProgress(slug,localStorage,8);
    expect(p.completed.length).toBeLessThan(8);
    expect(localStorage.getItem(key)).toBe(raw);
    saveProgress(slug,completeStep(p,p.activeStep,8),localStorage,()=>new Date(),8);
    expect(localStorage.getItem(`${key}:legacy-20260908`)).toBe(raw);
    expect(loadProgress(slug,localStorage,8).completed.length).toBe(p.completed.length+1);
  });
  it("keeps a fully completed old course completed",()=>{
    localStorage.clear();const key=progressKey("family-expenses");
    localStorage.setItem(key,JSON.stringify({version:1,activeStep:18,completed:Array.from({length:18},(_,i)=>i+1),score:180}));
    expect(loadProgress("family-expenses",localStorage,8).completed).toHaveLength(8);
  });
  it("archives original evidence on import too",()=>{
    localStorage.clear();const key=progressKey("family-expenses");
    const raw=JSON.stringify({version:1,activeStep:5,completed:[1,2,3,4],score:40});
    localStorage.setItem(key,raw);
    importLearningBackup(JSON.stringify({type:"neiroprofi-learning-backup",version:1,entries:{[key]:JSON.stringify({version:1,journeyRevision:"curriculum-20260908",activeStep:2,completed:[1],score:10})}}),localStorage);
    expect(localStorage.getItem(`${key}:legacy-20260908`)).toBe(raw);
    expect(loadProgress("family-expenses",localStorage,8).completed).toEqual([1]);
  });
});
