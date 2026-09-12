import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeDataset,datasetSlugs} from '../data-hub/catalog.mjs';
test('all 49 distinct datasets contain authored records and concrete checks',()=>{
 assert.equal(datasetSlugs.length,49);
 for(const slug of datasetSlugs){
  const d=makeDataset({slug,title:slug});
  assert.equal(d.fictional,true);assert.ok(d.checks[0].expected.length>25);
  assert.ok(Object.keys(d.tables).length>=2);
  for(const t of Object.values(d.tables)){
   assert.ok(t.rows.length>=2);assert.equal(new Set(t.rows.map(r=>r.id)).size,t.rows.length);
   for(const row of t.rows) for(const key of t.columns) assert.ok(Object.hasOwn(row,key));
  }
 }
});
test('fixtures have internally consistent totals and safe placeholder contacts',()=>{
 const budget=makeDataset({slug:'family-expenses',title:'Расходы'});
 assert.equal(budget.tables.expenses.rows.filter(r=>r.status==='confirmed').reduce((a,r)=>a+r.amount_rub,0),8000);
 const tracker=makeDataset({slug:'fitness-tracker',title:'Движение'});
 assert.equal(tracker.tables.habits.rows.reduce((a,r)=>a+r.minutes,0),110);
 const health=makeDataset({slug:'family-health-hub',title:'Хаб'});
 assert.equal(health.tables.labs.rows[0].value,5);
 assert.equal(health.files.length,2);
 for(const slug of datasetSlugs) assert.ok(!/\+7\d{10}|sk-proj-|kyzupic|mbachurina/.test(JSON.stringify(makeDataset({slug,title:slug}))));
});
