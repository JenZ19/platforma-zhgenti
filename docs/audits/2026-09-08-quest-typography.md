# Quest header typography repair

Reported: entry headers mix typefaces and sizes; family budget hero too tall, reset control dominates. Live server lesson additionally retained a 60px Cormorant promo heading in a two-column landing-page layout with tiny body copy.

Fix is scoped to `[data-track-layout="comfortable"]` in the existing shared stylesheet. One system sans family, 700-weight headings, 28–36px main titles, 20px section titles. Hero content is a vertical stack; metadata stays 14px, descriptions 17px. Reset is secondary, still retains its confirmation dialog. Progress is light on the dark hero. The server offer uses one column, 22–26px title, 14–16px supporting text, unrotated complete image.

No lesson text, saved progress, project order, covers, promo code, or original learning kit changed.

Regression: `scripts/verify-quest-heading-type.mjs` failed on live server lesson with a Cormorant heading vs system sans; after the fix all 49 quest entry/first-step routes passed at 390px and 1440px. Tests wait for preparation to finish, avoiding a false pass on the loading screen. Setup-only routes use the desktop format at both widths. Seven samples saved for visual inspection; actual entry and server lesson reviewed. Unit suite: 628 tests passed; lint and production build passed.

Publication target: `https://ezhgenti.ru/kurs1/`, isolated release `20260908-quest-typography`; previous release `20260908-kit-result-previews` retained for rollback.
