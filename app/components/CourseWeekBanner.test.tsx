import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, it, expect, vi } from 'vitest';
import { CourseWeekBanner } from './CourseWeekBanner';
import type { DashboardSnapshot } from '../lib/academy-dashboard';

afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllGlobals(); });

const snapshot = (complete: number[] = []) => ({
  course: [1, 2, 3, 4, 5, 6].map((week) => ({ week, complete: complete.includes(week) })),
} as unknown as DashboardSnapshot);

const account = (course: Record<string, unknown>) => ({
  course: { started: null, week: null, finished: false, dayOfWeek: null, daysLeft: null, ...course },
  portfolio: { exists: false, published: false, certificate: null },
  telegram: { linked: false, muted: false },
  weeks: 6,
});

it('offers to start the six weeks and saves the day in the account', async () => {
  let started = false;
  const fetcher = vi.fn(async (_url: string, options?: { method?: string; body?: string }) => {
    if (options?.method === 'POST') {
      expect(JSON.parse(options.body!).action).toBe('start');
      started = true;
      return { ok: true, json: async () => ({ course: { started: 1_800_000_000, week: 1, finished: false, dayOfWeek: 1, daysLeft: 7 } }) };
    }
    return { ok: true, json: async () => account(started ? { started: 1_800_000_000, week: 1, daysLeft: 7 } : {}) };
  });
  vi.stubGlobal('fetch', fetcher);
  render(<CourseWeekBanner snapshot={snapshot()} format="desktop" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Начинаю сегодня' }));
  expect(await screen.findByRole('heading', { name: /Идёт неделя 1 из 6/ })).toBeInTheDocument();
});

it('names the current week and warns about an unfinished earlier one', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => account({ started: 1_800_000_000, week: 3, daysLeft: 2 }) })));
  render(<CourseWeekBanner snapshot={snapshot([1])} format="desktop" />);
  expect(await screen.findByRole('heading', { name: /Идёт неделя 3 из 6 — «ИИ-агент для заказчика»/ })).toBeInTheDocument();
  expect(screen.getByText(/Неделя 2 ещё не закрыта/)).toBeInTheDocument();
  expect(screen.getByText(/2 дня/)).toBeInTheDocument();
});

it('says nothing about being behind when the week is already closed', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => account({ started: 1_800_000_000, week: 2, daysLeft: 5 }) })));
  render(<CourseWeekBanner snapshot={snapshot([1, 2])} format="desktop" />);
  expect(await screen.findByText(/Результат этой недели уже закрыт/)).toBeInTheDocument();
  expect(screen.queryByText(/не закрыта/)).not.toBeInTheDocument();
});

it('points a finished route to the portfolio', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => account({ started: 1_700_000_000, week: 6, finished: true, daysLeft: 0 }) })));
  render(<CourseWeekBanner snapshot={snapshot([1, 2, 3, 4, 5, 6])} format="mobile" />);
  expect(await screen.findByRole('link', { name: /Открыть портфолио/ })).toHaveAttribute('href', '?format=mobile&section=portfolio');
});

it('stays invisible when the account service is unavailable', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 401, json: async () => ({ error: 'Войдите в платформу.' }) })));
  const { container } = render(<CourseWeekBanner snapshot={snapshot()} format="desktop" />);
  await waitFor(() => expect(container.querySelector('.course-calendar')).toBeNull());
});
