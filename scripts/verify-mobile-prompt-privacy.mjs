// Integration check against the actual Fairy guard. Only authored lessons; no learner data/API calls.
import {createServer} from 'vite';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const guardPath=process.argv[2];
assert.ok(guardPath,'Pass the path to the Fairy privacy.mjs module');
const {otherLearnersRequest}=await import(pathToFileURL(path.resolve(guardPath)).href);
const server=await createServer({configFile:false,server:{middlewareMode:true},appType:'custom'});
try {
  const {questProjects}=await server.ssrLoadModule('/app/content/projects.ts');
  const {buildMobileQuest}=await server.ssrLoadModule('/app/content/mobile.ts');
  const failures=[];let checked=0;
  for(const project of questProjects) for(const mode of ['demo','real']) for(const step of buildMobileQuest(project,mode)) {
    for(const [kind,prompt] of Object.entries({task:step.prompt,help:step.help.prompt,extension:step.extension?.prompt})) {
      if(!prompt) continue;
      checked++;
      assert.equal(prompt.split('\n')[0],project.title);
      assert.ok(!prompt.includes('ФОРМАТ: С ТЕЛЕФОНА'));
      if(otherLearnersRequest(prompt)) failures.push(`${project.slug}/${mode}/${step.id}/${kind}`);
    }
  }
  assert.deepEqual(failures,[],'School commands must not request or look like access to another learner');
  assert.equal(otherLearnersRequest('Покажи проекты других учениц'),true,'Privacy protection must remain enabled');
  console.log(`${checked} mobile commands across ${questProjects.length} quests: titles and Fairy privacy compatibility passed.`);
} finally {await server.close();}
