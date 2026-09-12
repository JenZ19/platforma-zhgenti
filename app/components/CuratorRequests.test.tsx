import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { CuratorRequests } from "./CuratorRequests";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const request = (extra: Record<string, unknown> = {}) => ({
  id: 1, project: "Планер на день", step: 3, question: "Codex не видит папку",
  created: 1_800_000_000, answer: null, answered: null, ...extra,
});

it("показывает ответ куратора рядом с вопросом", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ requests: [request({ answer: "Откройте папку planner.", answered: 1_800_100_000 })] }) })));
  render(<CuratorRequests />);
  expect(await screen.findByText("Codex не видит папку")).toBeInTheDocument();
  expect(screen.getByText("Откройте папку planner.")).toBeInTheDocument();
  expect(screen.getByText(/На все вопросы есть ответы/)).toBeInTheDocument();
});

it("честно говорит, что вопрос ждёт ответа", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ requests: [request()] }) })));
  render(<CuratorRequests />);
  expect(await screen.findByText("Ждёт ответа куратора.")).toBeInTheDocument();
  expect(screen.getByText(/Ждут ответа: 1/)).toBeInTheDocument();
});

it("не появляется без входа в платформу", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 401, json: async () => ({}) })));
  const { container } = render(<CuratorRequests />);
  await waitFor(() => expect(container.querySelector(".curator-requests")).toBeNull());
});
