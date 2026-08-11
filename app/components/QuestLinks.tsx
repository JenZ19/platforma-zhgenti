import type { QuestLink } from "../content/types";

export function QuestLinks({ links }: { links?: QuestLink[] }) {
  if (!links?.length) return null;
  return (
    <section className="quest-links" aria-label="Полезные ссылки уровня">
      <p>Открыть по этому шагу</p>
      <div>
        {links.map((link) => (
          <a key={`${link.href}-${link.label}`} href={link.href} target={link.external ? "_blank" : undefined} rel={link.external ? "noreferrer" : undefined}>
            <span><b>{link.label}</b>{link.note && <small>{link.note}</small>}</span><i>{link.external ? "↗" : "→"}</i>
          </a>
        ))}
      </div>
    </section>
  );
}
