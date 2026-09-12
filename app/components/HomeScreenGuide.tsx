import guide from "../../services/neiroprofi-access/home-screen-guide.json";

export function HomeScreenGuide() {
  return <details className="home-screen-guide">
    <summary>{guide.title}</summary>
    <p>{guide.intro}</p><p>{guide.before}</p>
    {guide.platforms.map(platform => <details className="home-screen-platform" key={platform.title}>
      <summary>{platform.title}</summary>
      <ol>{platform.steps.map(step => <li key={step.title}>
        <strong>{step.title}</strong><p>{step.text}</p>
        {"image" in step && step.image && <figure>
          <a href={`/home-screen-guide/${step.image}`} target="_blank" rel="noreferrer" aria-label={`Увеличить скриншот: ${step.title}`}>
            {/* The original cropped screenshots, not generated instructions. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/home-screen-guide/${step.image}`} alt={step.title} loading="lazy" />
          </a>
          {"caption" in step && step.caption && <figcaption>{step.caption}</figcaption>}
        </figure>}
      </li>)}</ol>
      <a href={platform.source} target="_blank" rel="noreferrer">Инструкция производителя</a>
    </details>)}
    <p><strong>{guide.done}</strong></p><p>{guide.note}</p>
  </details>;
}
