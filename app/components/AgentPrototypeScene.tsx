"use client";

import { agentContracts, getAgentContract } from "../content/agent-contracts";
import type { ProjectDefinition } from "../content/types";

const accents = [
  "#365f8d", "#76548c", "#a94f5d", "#668347", "#477c86", "#b16d3e", "#4d6f52",
  "#9a4d73", "#7455a1", "#397a73", "#b07132", "#4b6594", "#a15145", "#3d706b",
  "#8a5a36", "#4f6f99", "#6c5b8e", "#337467", "#b25974", "#7a6540", "#536e43",
];

const backgrounds = [
  "#eef4fb", "#f6effa", "#fff0f1", "#f2f6e9", "#edf7f8", "#fff3e8", "#eff6ef",
  "#faeff5", "#f3effb", "#ebf7f4", "#fff5e7", "#eef2fa", "#fff0ec", "#eaf6f3",
  "#f8f0e8", "#edf3fb", "#f2eff8", "#eaf6f1", "#fbeef2", "#f5f1e8", "#eff5e9",
];

export function AgentPrototypeScene({ project, step }: { project: ProjectDefinition; step: number }) {
  const contract = getAgentContract(project.slug);
  const themeIndex = Math.max(0, agentContracts.findIndex((item) => item.slug === project.slug));
  const reveal = Math.max(7, step);
  const style = {
    "--agent-accent": accents[themeIndex],
    "--agent-background": backgrounds[themeIndex],
  } as React.CSSProperties;

  return (
    <div
      className={`agent-prototype agent-theme-${contract.theme}`}
      data-agent-prototype={project.slug}
      data-agent-theme={contract.theme}
      style={style}
    >
      <header>
        <span>{project.symbol}</span>
        <div><b>{project.title}</b><small>ИИ-агент · текст и голос</small></div>
        <i>● онлайн</i>
      </header>
      <main>
        <div className="agent-message user"><small>ВЫ</small>{contract.inputExample}</div>
        {reveal >= 8 && <div className="agent-message assistant"><b>Один вопрос</b>{contract.firstQuestion}</div>}
        {reveal >= 9 && <div className="agent-message user voice"><span>▶</span><div><small>ГОЛОСОВОЕ СООБЩЕНИЕ</small>{contract.voiceExample}</div></div>}
        {reveal >= 10 && <section className="agent-result"><small>ГОТОВЫЙ РЕЗУЛЬТАТ</small><h4>{contract.resultTitle}</h4>{contract.resultItems.map((item) => <p key={item}><span>✓</span>{item}</p>)}</section>}
        {reveal >= 12 && <div className="agent-check"><span>✓ Самопроверка пройдена</span><small>{contract.selfCheck[0]}</small></div>}
        {reveal >= 13 && <footer><span>Действие — только после «Да, подтверждаю»</span><b>Рискованный вопрос → человеку</b><small>{contract.handoff}</small></footer>}
      </main>
    </div>
  );
}
