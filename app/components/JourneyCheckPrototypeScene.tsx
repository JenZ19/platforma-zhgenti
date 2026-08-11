import type { ProjectDefinition, QuestStep } from "../content/types";

export function JourneyCheckPrototypeScene({
  project,
  step,
  mobile = false,
}: {
  project: ProjectDefinition;
  step: QuestStep;
  mobile?: boolean;
}) {
  return (
    <div
      className={`journey-check-prototype ${mobile ? "mobile" : ""}`}
      data-journey-check={step.journeyCheck}
    >
      <header>
        <span>ФИНАЛЬНАЯ ПРОВЕРКА</span>
        <b>ПРОТОТИП</b>
      </header>
      <main>
        <small>{project.title}</small>
        <h3>{step.title}</h3>
        <div>
          {step.expected.map((item, index) => (
            <section key={item}>
              <i>{index + 1}</i>
              <b>{item}</b>
              <span>проверено ✓</span>
            </section>
          ))}
        </div>
      </main>
      <footer>
        <span>Личная версия</span>
        <span>Клиентская версия</span>
        <b>Обе проверены</b>
      </footer>
    </div>
  );
}
