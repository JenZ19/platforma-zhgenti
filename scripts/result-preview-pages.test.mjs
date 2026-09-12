import { test } from 'node:test';
import assert from 'node:assert/strict';

test('draft viewer preserves the actual text and never impersonates Telegram', async () => {
  const { draftPage } = await import('./result-preview-pages.mjs');
  const html = draftPage({text:'Одна задача.\n\n<script>опасно</script>', status:'draft', count:1});
  assert.ok(html.includes('Одна задача.'));
  assert.ok(html.includes('&lt;script&gt;опасно&lt;/script&gt;'));
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('не экран Telegram'));
  assert.ok(html.includes('Вымышленный учебный пример'));
});

test('moderator viewer keeps uncertainty and observed FAQ results', async () => {
  const { moderatorPage } = await import('./result-preview-pages.mjs');
  const html = moderatorPage({mode:'observe', messages:[{author:'Ирина',text:'Будет ли запись?',category:'other',classified_by:'fallback'}],faq_matches:[{question:'Где запись?',matched:true},{question:'Цвет?',matched:false}],live_integrations_started:false});
  assert.ok(html.includes('Нужна проверка человеком'));
  assert.ok(html.includes('Ответ не найден'));
  assert.ok(html.includes('Совпадение найдено'));
  assert.ok(html.includes('не экран Telegram'));
  assert.ok(!html.includes('ИИ ответил'));
});
