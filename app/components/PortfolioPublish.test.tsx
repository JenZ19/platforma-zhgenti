import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, it, expect, vi } from 'vitest';
import { PortfolioPublish } from './PortfolioPublish';
import { resultsKey } from '../lib/portfolio-results';
import type { DashboardSnapshot } from '../lib/academy-dashboard';
import type { ProjectDefinition } from '../content/types';

afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllGlobals(); });

const project = (title: string, kind = 'service') => ({ title, kind } as unknown as ProjectDefinition);
const works = [
  { id: 'planner', project: project('Планер на день') },
  { id: 'expert-site', project: project('Сайт эксперта', 'site') },
  { id: 'client-care-agent', project: project('Агент поддержки', 'agent') },
];
const snapshot = (complete: number[]) => ({ course: [1, 2, 3, 4, 5, 6].map((week) => ({ week, complete: complete.includes(week) })) } as unknown as DashboardSnapshot);

function cards() {
  localStorage.setItem(resultsKey, JSON.stringify({
    planner: { title: 'Мой планер', url: 'https://planer.example.com', description: 'Для занятой мамы', status: 'personal', updatedAt: '' },
    'expert-site': { title: 'Сайт психолога', url: 'https://site.example.com', description: 'Заявки на консультации', status: 'client', updatedAt: '' },
    'client-care-agent': { title: 'Агент поддержки', url: '', description: 'Отвечает на вопросы клиентов', status: 'study', updatedAt: '' },
  }));
}

const state = (portfolio: Record<string, unknown> = {}) => ({
  course: { started: 1_800_000_000, week: 6, finished: true, dayOfWeek: 7, daysLeft: 0 },
  portfolio: { exists: false, published: false, certificate: null, ...portfolio },
  telegram: { linked: false, muted: false },
  weeks: 6,
});

it('publishes the chosen cards as one page and shows its link', async () => {
  cards();
  const sent: Record<string, unknown>[] = [];
  let current = state();
  vi.stubGlobal('fetch', vi.fn(async (_url: string, options?: { method?: string; body?: string }) => {
    if (options?.method !== 'POST') return { ok: true, json: async () => current };
    const body = JSON.parse(options.body!);
    sent.push(body);
    if (body.action === 'publish') current = state({ exists: true, published: true, slug: body.slug });
    return { ok: true, json: async () => ({ portfolio: current.portfolio }) };
  }));
  render(<PortfolioPublish works={works} snapshot={snapshot([1, 2, 3, 4, 5, 6])} />);
  fireEvent.change(await screen.findByLabelText('Чем я помогаю'), { target: { value: 'Собираю сервисы' } });
  fireEvent.change(screen.getByLabelText('Коротко о себе'), { target: { value: 'Делаю небольшие сервисы.' } });
  fireEvent.change(screen.getByLabelText('Как с вами связаться'), { target: { value: '@anya_neiro' } });
  fireEvent.change(screen.getByLabelText('Адрес страницы'), { target: { value: 'anya-services' } });
  fireEvent.click(screen.getByRole('button', { name: 'Опубликовать портфолио' }));
  await waitFor(() => expect(sent.some((body) => body.action === 'publish')).toBe(true));
  const saved = sent.find((body) => body.action === 'save')!.portfolio as { works: { title: string; status: string }[]; contact: string };
  expect(saved.works.map((work) => work.title)).toEqual(['Мой планер', 'Сайт психолога', 'Агент поддержки']);
  expect(saved.works[1].status).toBe('client');
  expect(saved.contact).toBe('@anya_neiro');
  expect(await screen.findByRole('link', { name: /\/p\/anya-services$/ })).toBeInTheDocument();
});

it('leaves a work out of the page when it is unchecked', async () => {
  cards();
  const sent: Record<string, unknown>[] = [];
  vi.stubGlobal('fetch', vi.fn(async (_url: string, options?: { method?: string; body?: string }) => {
    if (options?.method !== 'POST') return { ok: true, json: async () => state() };
    sent.push(JSON.parse(options.body!));
    return { ok: true, json: async () => ({ portfolio: state().portfolio }) };
  }));
  render(<PortfolioPublish works={works} snapshot={snapshot([1])} />);
  fireEvent.click(await screen.findByRole('checkbox', { name: /Сайт психолога/ }));
  fireEvent.change(screen.getByLabelText('Чем я помогаю'), { target: { value: 'Собираю сервисы' } });
  fireEvent.change(screen.getByLabelText('Коротко о себе'), { target: { value: 'О себе.' } });
  fireEvent.change(screen.getByLabelText('Как с вами связаться'), { target: { value: '@anya_neiro' } });
  fireEvent.click(screen.getByRole('button', { name: 'Сохранить черновик' }));
  await waitFor(() => expect(sent.length).toBe(1));
  const saved = sent[0].portfolio as { works: { title: string }[] };
  expect(saved.works.map((work) => work.title)).toEqual(['Мой планер', 'Агент поддержки']);
});

it('keeps the certificate closed until six weeks and publication are done', async () => {
  cards();
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => state() })));
  render(<PortfolioPublish works={works} snapshot={snapshot([1, 2, 3])} />);
  const button = await screen.findByRole('button', { name: 'Получить сертификат' });
  expect(button).toBeDisabled();
  expect(screen.getByText(/Шесть недель маршрута закрыты \(3 из 6\)/)).toBeInTheDocument();
});

it('issues the certificate and links the verification page', async () => {
  cards();
  let current = state({ exists: true, published: true, slug: 'anya' });
  vi.stubGlobal('fetch', vi.fn(async (_url: string, options?: { method?: string; body?: string }) => {
    if (options?.method !== 'POST') return { ok: true, json: async () => current };
    const body = JSON.parse(options.body!);
    if (body.action === 'certificate') {
      expect(body.weeks).toEqual([1, 2, 3, 4, 5, 6]);
      current = state({ exists: true, published: true, slug: 'anya', certificate: { number: 'NP-2026-0007', issued: 1_800_000_000 } });
    }
    return { ok: true, json: async () => ({ portfolio: current.portfolio }) };
  }));
  render(<PortfolioPublish works={works} snapshot={snapshot([1, 2, 3, 4, 5, 6])} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Получить сертификат' }));
  expect(await screen.findByRole('link', { name: /\/s\/NP-2026-0007$/ })).toBeInTheDocument();
});

it('shows the server complaint instead of pretending it published', async () => {
  cards();
  vi.stubGlobal('fetch', vi.fn(async (_url: string, options?: { method?: string }) => (options?.method === 'POST'
    ? { ok: false, status: 409, json: async () => ({ error: 'Такой адрес уже занят другой ученицей. Выберите другой.' }) }
    : { ok: true, json: async () => state() })));
  render(<PortfolioPublish works={works} snapshot={snapshot([1])} />);
  fireEvent.change(await screen.findByLabelText('Чем я помогаю'), { target: { value: 'Собираю сервисы' } });
  fireEvent.change(screen.getByLabelText('Коротко о себе'), { target: { value: 'О себе.' } });
  fireEvent.change(screen.getByLabelText('Как с вами связаться'), { target: { value: '@anya_neiro' } });
  fireEvent.change(screen.getByLabelText('Адрес страницы'), { target: { value: 'anya' } });
  fireEvent.click(screen.getByRole('button', { name: 'Опубликовать портфолио' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('уже занят'));
  expect(screen.queryByText(/Страница открыта/)).not.toBeInTheDocument();
});
