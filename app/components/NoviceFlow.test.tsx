import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { Quest } from "./Quest";
import { MobileQuest } from "./MobileQuest";
import { getQuestProject } from "../content/projects";
import { preparationKey } from "../lib/preparation";
import { loadProgress } from "../lib/progress";

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });
for (const mobile of [false, true]) {
  const setup = () => {
    localStorage.setItem(preparationKey(`${mobile ? "mobile:" : ""}planner`), JSON.stringify({version:1, mode:"demo", ready:true, checked:[]}));
    const Component = mobile ? MobileQuest : Quest;
    return render(<Component project={getQuestProject("planner")!} onHome={vi.fn()} />);
  };
  it(`${mobile}: copy is available beside the task and full prompt is collapsed`, async () => {
    const {container} = setup();
    const block = await screen.findByRole("region", {name:"Действие этого шага"});
    if (mobile) expect(container.querySelector('[data-result-showcase]')).toBeNull();
    else expect(block.compareDocumentPosition(container.querySelector('[data-result-showcase]')! ) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(block.querySelector('details')).not.toHaveAttribute('open');
    const copy=vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:copy}});
    fireEvent.click(screen.getByRole('button',{name:'Скопировать команду',exact:true}));
    await waitFor(()=>expect(copy).toHaveBeenCalled());
    expect(copy.mock.calls[0][0]).toContain('planner');
  });
  it(`${mobile}: reading ahead does not complete or move saved progress`, async () => {
    setup();if(mobile) fireEvent.click(await screen.findByText('Посмотреть уроки без выполнения'));
    fireEvent.click(await screen.findByRole('button',{name:'Посмотреть следующий шаг без отметки'}));
    expect(screen.getByRole('heading',{level:1,name:'Добавляем одно дело'})).toBeVisible();
    expect(screen.getByText('Режим просмотра — выполнение не отмечается')).toBeVisible();
    expect(loadProgress(`${mobile?'mobile:':''}planner`,localStorage,9).completed).toEqual([]);
    expect(loadProgress(`${mobile?'mobile:':''}planner`,localStorage,9).activeStep).toBe(1);
    expect(screen.queryByRole('button',{name:'Я сделала — продолжить →'})).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'Вернуться к моей работе'}));
    expect(screen.getByRole('heading',{level:1,name:'Создаём первый работающий планер'})).toBeVisible();
  });
  it(`${mobile}: the question really goes to the curator with its lesson attached`, async () => {
    const sent: Record<string, unknown>[] = [];
    const fetcher = vi.fn(async (url: string, options?: { method?: string; body?: string }) => {
      if (!String(url).includes("/support")) return { ok: false, status: 404, json: async () => ({}) };
      if (options?.method === "POST") sent.push(JSON.parse(options.body!));
      return { ok: true, json: async () => ({ requests: sent.map((body, index) => ({ id: index + 1, project: body.project, step: body.step, question: body.question, created: 1_800_000_000, answer: null, answered: null })) }) };
    });
    vi.stubGlobal("fetch", fetcher);
    setup();if(mobile) fireEvent.click(await screen.findByRole('button',{name:'Нужна помощь'}));
    fireEvent.click(await screen.findByText('Спросить куратора об этом шаге'));
    const field=screen.getByRole('textbox',{name:'Что не получается'});
    fireEvent.change(field,{target:{value:'Codex не видит папку'}});
    const context = document.querySelector('.support-request-context')!.textContent!;
    expect(context).toContain('Создаём первый работающий планер');
    expect(context).toContain(mobile?'Телефон':'Компьютер');
    fireEvent.click(screen.getByRole('button',{name:'Отправить куратору'}));
    await waitFor(() => expect(sent.length).toBe(1));
    expect(sent[0]).toMatchObject({action:'ask', question:'Codex не видит папку', step:1, device: mobile?'Телефон':'Компьютер'});
    expect(await screen.findByText(/Вопрос отправлен куратору/)).toBeVisible();
    vi.unstubAllGlobals();
  });
}
