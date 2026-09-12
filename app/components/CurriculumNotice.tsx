"use client";

import { useEffect, useState } from "react";
import { journeyRevisionInfo, parseProgress, progressKey } from "../lib/progress";

/** Explain a conservative migration rather than silently reducing a learner's count. */
export function CurriculumNotice({ slug, total }: { slug: string; total: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const info = journeyRevisionInfo(slug, total);
    if (!info) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(false);
      return;
    }
    try {
      const raw = localStorage.getItem(`${progressKey(slug)}:legacy-20260908`) ?? localStorage.getItem(progressKey(slug));
      const previous = parseProgress(raw, info.oldTotal);
      setVisible(previous.journeyRevision !== info.revision && previous.completed.length > 0 && previous.completed.length < info.oldTotal);
    } catch { /* The existing workspace handles unavailable storage. */ }
  }, [slug, total]);
  if (!visible) return null;
  return <aside className="quest-curriculum-notice" role="note"><strong>Маршрут стал короче.</strong> Ваши прежние отметки сохранены. Уже проверенная основа зачтена, а новые проверки нужно пройти отдельно. Сам созданный проект и его данные не изменились.</aside>;
}
