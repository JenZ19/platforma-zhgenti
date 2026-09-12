import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { IskraChat } from './IskraChat';

function json(data: unknown, status=200) { return new Response(JSON.stringify(data), {status, headers:{'Content-Type':'application/json'}}); }

function Chat() {
  const [draft, setDraft] = useState('');
  return <IskraChat scope="academy" format="mobile" draft={draft} onDraftChange={setDraft} />;
}
afterEach(() => vi.unstubAllGlobals());
it('loads private history and sends a question with CSRF without client identity', async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(json({ available: true, messages: [] }))
    .mockResolvedValueOnce(json({ answer: 'Откройте Феечку.', sources: [] }));
  vi.stubGlobal('fetch', fetcher);
  render(<Chat />);
  await waitFor(() => expect(screen.getByRole('button', {name: 'Спросить Искру'})).not.toBeDisabled());
  fireEvent.change(screen.getByLabelText('Ваш вопрос'), {target: {value: 'С чего начать?'}});
  fireEvent.click(screen.getByRole('button', {name: 'Спросить Искру'}));
  expect(await screen.findByText('Откройте Феечку.')).toBeInTheDocument();
  const options = fetcher.mock.calls[1][1];
  expect(options.headers['X-Neiroprofi-Request']).toBe('1');
  expect(JSON.parse(options.body)).toMatchObject({question: 'С чего начать?', scope: 'academy', format: 'mobile'});
  expect(JSON.parse(options.body)).not.toHaveProperty('uid');
});
it('preserves draft on provider error and renders it without HTML execution', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(json({available:true,messages:[]}))
    .mockResolvedValueOnce(json({error:'Попробуйте позже'},502)));
  render(<Chat />);
  await waitFor(() => expect(screen.getByRole('button', {name:'Спросить Искру'})).not.toBeDisabled());
  fireEvent.change(screen.getByLabelText('Ваш вопрос'), {target:{value:'Мой вопрос'}});
  fireEvent.click(screen.getByRole('button', {name:'Спросить Искру'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('Попробуйте позже');
  expect(screen.getByLabelText('Ваш вопрос')).toHaveValue('Мой вопрос');
});
it('does not enable paid request without a valid server session', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({error:'Войдите в платформу.'},401)));
  render(<Chat />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Войдите');
  expect(screen.getByRole('button', {name:'Спросить Искру'})).toBeDisabled();
});
