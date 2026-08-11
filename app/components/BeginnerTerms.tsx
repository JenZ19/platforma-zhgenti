import type { BeginnerTerm } from "../content/types";

export function BeginnerTerms({ terms }: { terms?: BeginnerTerm[] }) {
  if (!terms?.length) return null;
  return (
    <section className="beginner-terms" aria-label="Новые слова перед началом">
      <b>Сначала — новые слова</b>
      <dl>
        {terms.map((item) => (
          <div key={item.term}>
            <dt>{item.term}</dt>
            <dd>{item.meaning}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
