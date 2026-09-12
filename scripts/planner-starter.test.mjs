import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
const path = new URL('../learning-kits/planner/index.html', import.meta.url);
function open(search='') {
  const dom = new JSDOM(readFileSync(path,'utf8'), {url:`https://example.test/planner/${search}`,runScripts:'dangerously'});
  return {window:dom.window, document:dom.window.document};
}
function click(d,text) { const button=[...d.querySelectorAll('button')].find(b=>b.textContent===text); assert.ok(button,text); button.click(); }
test('planner starts with two explicitly educational examples; real mode is empty',()=>{
  const demo=open(); assert.equal(demo.document.querySelectorAll('.task').length,2);
  assert.match(demo.document.body.textContent,/Вымышленные примеры/); demo.window.close();
  const real=open('?mode=real'); assert.equal(real.document.querySelectorAll('.task').length,0); real.window.close();
});
test('planner adds once, edits, prioritizes, completes and moves one task to tomorrow',()=>{
  const {window:w,document:d}=open('?mode=real');
  click(d,'Добавить дело'); assert.equal(d.activeElement,d.querySelector('#task-name'));
  d.querySelector('#task-name').value='Полить цветы'; d.querySelector('#add-form').dispatchEvent(new w.Event('submit',{cancelable:true}));
  assert.equal(d.querySelectorAll('.task').length,1);
  click(d,'Сделать главным'); assert.match(d.querySelector('.task').textContent,/Главное дело/);
  click(d,'Готово'); click(d,'Вернуть в работу');
  w.prompt=()=> 'Полить розы'; click(d,'Изменить'); assert.match(d.querySelector('.task').textContent,/Полить розы/);
  click(d,'На завтра'); assert.equal(d.querySelectorAll('.task').length,0);
  click(d,'Завтра'); assert.equal(d.querySelectorAll('.task').length,1);
  const state=JSON.parse(w.localStorage.getItem('neiroprofi-planner-v1-real')); assert.equal(state.length,1); assert.equal(state[0].name,'Полить розы');
  w.close();
});
test('empty tasks are rejected and unsafe import schema is rejected',()=>{
  const {window:w,document:d}=open('?mode=real');
  d.querySelector('#add-form').dispatchEvent(new w.Event('submit',{cancelable:true}));
  assert.equal(d.querySelectorAll('.task').length,0); assert.match(d.querySelector('#status').textContent,/Название/);
  assert.throws(()=>w.validatePlannerBackup({version:1,tasks:[{name:'x'}]})); w.close();
});
