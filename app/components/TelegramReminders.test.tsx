import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, it, expect, vi } from 'vitest';
import { TelegramReminders } from './TelegramReminders';

afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllGlobals(); });

const state = (telegram: Record<string, unknown> = {}, started: number | null = 1_800_000_000) => ({
  course: { started, week: 1, finished: false, dayOfWeek: 1, daysLeft: 7 },
  portfolio: { exists: false, published: false, certificate: null },
  telegram: { linked: false, muted: false, bot: 'feyakrestnayasbm_bot', ...telegram },
  weeks: 6,
});

it('asks for the Telegram id, then for the code sent to that chat', async () => {
  const sent: Record<string, unknown>[] = [];
  let current = state();
  vi.stubGlobal('fetch', vi.fn(async (_url: string, options?: { method?: string; body?: string }) => {
    if (options?.method !== 'POST') return { ok: true, json: async () => current };
    const body = JSON.parse(options.body!);
    sent.push(body);
    if (body.action === 'confirm') current = state({ linked: true });
    return { ok: true, json: async () => (body.action === 'confirm' ? { telegram: current.telegram } : { sent: true }) };
  }));
  render(<TelegramReminders />);
  expect(await screen.findByText(/\/myid/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Ваш Telegram ID'), { target: { value: '862939737' } });
  fireEvent.click(screen.getByRole('button', { name: 'Прислать код' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Код отправлен'));
  expect(sent[0]).toEqual({ action: 'request', telegramId: '862939737' });
  fireEvent.change(screen.getByLabelText('Код из сообщения'), { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: 'Подключить напоминания' }));
  await waitFor(() => expect(screen.getByText(/Подключено\./)).toBeInTheDocument());
  expect(sent[1]).toEqual({ action: 'confirm', code: '123456' });
});

it('keeps only digits in the id field', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => state() })));
  render(<TelegramReminders />);
  const input = await screen.findByLabelText('Ваш Telegram ID');
  fireEvent.change(input, { target: { value: '@anya 862 939' } });
  expect(input).toHaveValue('862939');
});

it('names the school bot instead of the personal fairy', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => state() })));
  render(<TelegramReminders />);
  expect((await screen.findAllByText(/@feyakrestnayasbm_bot/)).length).toBeGreaterThan(0);
  expect(screen.getByText(/не заменяет вашу личную Феечку/)).toBeInTheDocument();
});

it('asks for the start date first when the calendar is empty', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => state({}, null) })));
  render(<TelegramReminders />);
  expect(await screen.findByText(/Сначала отметьте день старта/)).toBeInTheDocument();
});

it('repeats the server answer when the chat cannot be reached', async () => {
  vi.stubGlobal('fetch', vi.fn(async (_url: string, options?: { method?: string }) => (options?.method === 'POST'
    ? { ok: false, status: 400, json: async () => ({ error: 'Не удалось написать в этот Telegram. Откройте бота школы, нажмите «Начать» и повторите.' }) }
    : { ok: true, json: async () => state() })));
  render(<TelegramReminders />);
  fireEvent.change(await screen.findByLabelText('Ваш Telegram ID'), { target: { value: '555' } });
  fireEvent.click(screen.getByRole('button', { name: 'Прислать код' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Не удалось написать'));
  expect(screen.queryByLabelText('Код из сообщения')).not.toBeInTheDocument();
});

it('offers to switch reminders off once connected', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => state({ linked: true }) })));
  render(<TelegramReminders />);
  expect(await screen.findByRole('button', { name: 'Отключить напоминания' })).toBeInTheDocument();
  expect(screen.queryByLabelText('Ваш Telegram ID')).not.toBeInTheDocument();
});
