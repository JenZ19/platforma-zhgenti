import type { BeginnerTerm, QuestStep } from "./types";

const dictionary: Array<{ pattern: RegExp; term: string; meaning: string }> = [
  { pattern: /API[-‑ ]?ключ/iu, term: "API-ключ", meaning: "секретный платёжный пароль, по которому проект обращается к ИИ-провайдеру" },
  { pattern: /переменн(?:ая|ой) окружения/iu, term: "переменная окружения", meaning: "закрытое место на сервере или компьютере, где программа читает секрет, но не показывает его посетителю" },
  { pattern: /SSH[-‑ ]?ключ/iu, term: "SSH-ключ", meaning: "пара электронных ключей для безопасного входа на сервер без пересылки пароля" },
  { pattern: /приватн(?:ый|ого) ключ/iu, term: "приватный ключ", meaning: "секретная часть SSH-ключа; она остаётся только на вашем компьютере" },
  { pattern: /публичн(?:ый|ого) ключ/iu, term: "публичный ключ", meaning: "часть SSH-ключа, которую можно добавить в кабинет сервера" },
  { pattern: /предпросмотр/iu, term: "предпросмотр", meaning: "временная ссылка, где можно увидеть и проверить проект до публикации" },
  { pattern: /клиентск(?:ая|ую|ой) копи/iu, term: "клиентская копия", meaning: "отдельная версия проекта для заказчика; личная версия при этом не меняется" },
  { pattern: /мастер[-‑ ](?:команд|инструкц)/iu, term: "мастер-команда", meaning: "полная готовая команда, по которой Codex сам собирает нужную часть проекта" },
  { pattern: /Codex/iu, term: "Codex", meaning: "раздел ChatGPT, который создаёт, проверяет и исправляет файлы проекта вместо вас" },
  { pattern: /VPS/iu, term: "VPS", meaning: "отдельный виртуальный компьютер в интернете, на котором работает опубликованный проект" },
  { pattern: /firewall/iu, term: "firewall", meaning: "защитный фильтр сервера, который оставляет открытыми только нужные входы" },
  { pattern: /\bIP\b/iu, term: "IP", meaning: "числовой адрес сервера в интернете" },
  { pattern: /\bAPI\b/iu, term: "API", meaning: "способ, которым две программы обмениваются запросами и ответами" },
  { pattern: /\bсервер/iu, term: "сервер", meaning: "компьютер в интернете, который хранит проект и отвечает пользователям" },
  { pattern: /\bдомен/iu, term: "домен", meaning: "понятный адрес сайта, например example.ru" },
  { pattern: /\bтокен/iu, term: "токен", meaning: "секретный код доступа программы к сервису" },
  { pattern: /\bбэкап|резервн(?:ая|ую|ой) копи/iu, term: "резервная копия", meaning: "отдельная сохранённая версия, из которой можно восстановить данные после ошибки" },
  { pattern: /\bJSON\b/iu, term: "JSON", meaning: "файл с данными проекта, который удобно восстановить в программе" },
  { pattern: /\bCSV\b/iu, term: "CSV", meaning: "простая таблица, которую можно открыть в Excel или Google Таблицах" },
  { pattern: /\bLovable\b/iu, term: "Lovable", meaning: "мобильный конструктор, который собирает сайт по готовому текстовому заданию" },
  { pattern: /\bЧатиум/iu, term: "Чатиум", meaning: "конструктор, в котором можно открыть и проверить ИИ-агента с телефона" },
  { pattern: /\bTelegram/iu, term: "Telegram", meaning: "приложение, через которое в мобильном квесте приходят задания, ссылки и ответы" },
  { pattern: /\bбриф/iu, term: "бриф", meaning: "короткий разговор с заказчиком о задаче, аудитории, материалах и ограничениях" },
  { pattern: /\bпортфолио/iu, term: "портфолио", meaning: "подборка работ с честным описанием задачи, вашей роли, ссылки и результата" },
];

function searchable(step: QuestStep): string {
  return [step.title, step.why, step.action, step.prompt, ...step.expected, step.help.body]
    .filter(Boolean)
    .join(" ");
}

export function addBeginnerLanguage<T extends QuestStep>(steps: T[]): T[] {
  const explained = new Set<string>();
  return steps.map((step) => {
    const text = searchable(step);
    const beginnerTerms: BeginnerTerm[] = [];
    for (const entry of dictionary) {
      if (explained.has(entry.term) || !entry.pattern.test(text)) continue;
      explained.add(entry.term);
      beginnerTerms.push({ term: entry.term, meaning: entry.meaning });
    }
    return {
      ...step,
      screenshotKind: step.screenshotKind ?? "prototype",
      beginnerTerms,
    } as T;
  });
}
