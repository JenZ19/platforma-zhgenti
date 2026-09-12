// Only authored course materials. No user projects, localStorage, credentials or chat notes.
import { createServer } from 'vite';
import { writeFile } from 'node:fs/promises';
const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom' });
try {
  const { questProjects } = await server.ssrLoadModule('/app/content/projects.ts');
  const { buildQuest } = await server.ssrLoadModule('/app/content/quests.ts');
  const { buildMobileQuest } = await server.ssrLoadModule('/app/content/mobile.ts');
  const docs = [];
  for (const format of ['mobile', 'desktop']) for (const os of ['mac', 'windows']) docs.push({
    slug: 'academy', step: 1, format, os, title: 'С чего начать · маршрут курса',
    href: `/kurs1/?format=${format}&section=weeks`,
    text: `Платформа НЕЙРОПРОФИ, закрытая мастерская VIP-учениц. Главная → Маршрут и библиотека: выбираем один проект на неделю, необязательно проходить все варианты. ${format === 'mobile' ? 'Первое действие: сохранить адрес своей личной Феечки в форме «Адрес вашей Феечки» на главной странице. Подходит @имя_bot или https://t.me/имя_bot. Это не Фея-крёстная. Ссылка сохраняется в аккаунте, повторно вводить не нужно; изменить можно в настройках помощника. Кнопки «Открыть Феечку» ведут в личного бота. Затем выбрать проект, скопировать команду из урока и отправить Феечке. Продолжать тот же чат проекта; результат открывать по выданной ссылке. Codex на телефон не устанавливаем.' : 'Первое действие: пройти установку Codex, выбрав Mac или Windows, затем выбрать первый проект и следовать уроку.'} Сервер и API заранее не покупаем. Искра объясняет урок; Феечка выполняет работу над проектом. Если личного бота ещё нет или он не отвечает, обратиться к куратору в учебном чате. Портфолио хранит ссылки на результаты. Прогресс уроков пока в браузере: перенос через экспорт/импорт, не обещать синхронизацию прогресса. Нажать «Я сделала» после проверки результата, это сохраняет пройденный шаг.`,
  });
  for (const project of questProjects) for (const format of ['desktop', 'mobile']) for (const os of ['mac', 'windows']) {
    const steps = (format === 'mobile' ? buildMobileQuest : buildQuest)(project, 'demo', undefined, os);
    for (const step of steps) docs.push({
      slug: project.slug, step: step.id, format, os,
      title: `${project.title} · шаг ${step.id}: ${step.title}`,
      href: `/kurs1/?format=${format}&quest=${project.slug}`,
      text: [project.outcome, step.why, step.action, ...step.expected, step.help.body,
        ...(step.beginnerTerms ?? []).map(t => `${t.term}: ${t.meaning}`),
        ...(step.links ?? []).map(l => `${l.label}: ${l.href}`)].join('\n').slice(0, 5500),
    });
  }
  await writeFile('services/neiroprofi-access/iskra-knowledge.json', JSON.stringify(docs));
  console.log(`Exported ${docs.length} lessons across ${questProjects.length} tracks.`);
} finally { await server.close(); }
