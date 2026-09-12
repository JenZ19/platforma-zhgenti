"use client";
import { useMemo } from "react";
import type { DashboardSnapshot } from "../lib/academy-dashboard";
import { collectRewards, sparksLabel, stepsLabel } from "../lib/rewards";

/** Полка наград: куда уходят искры и что откроется следующим. */
export function RewardShelf({ snapshot }: { snapshot: DashboardSnapshot }) {
  const { sparks, earned, next } = useMemo(() => collectRewards(snapshot), [snapshot]);
  if (!sparks && !earned.length) return null;

  return <section className="reward-shelf" aria-labelledby="reward-shelf-title">
    <header>
      <p className="academy-kicker">Мои награды</p>
      <h2 id="reward-shelf-title"><i aria-hidden="true">✦</i> {sparks} {sparksLabel(sparks)}</h2>
      <p>По десять искр за каждый отмеченный шаг. Феи открываются на узловых шагах квеста — там, где проект начинает работать.</p>
    </header>

    {earned.length > 0 && <ul className="reward-shelf-list">
      {earned.map((item) => <li key={`${item.slug}-${item.step}`}>
        <i aria-hidden="true">✦</i>
        <strong>{item.reward}</strong>
        <small>{item.project} · шаг {item.step}</small>
      </li>)}
    </ul>}

    {next && <p className="reward-shelf-next">
      Следующая — <strong>{next.reward}</strong>: {next.stepsLeft === 1 ? "остался один шаг" : `осталось ${next.stepsLeft} ${stepsLabel(next.stepsLeft)}`} в проекте «{next.project}».
    </p>}
  </section>;
}
