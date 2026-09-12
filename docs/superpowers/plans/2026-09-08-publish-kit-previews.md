# Publish approved kit previews

Approved by user: publish the four preview assets in their matching quests. Preserve the distinction between actual product output and offline report sheets.

- Add a shared LearningKitPreview component in the first desktop/mobile lesson only. Link the full image, preserve its aspect ratio, include readable HTML caption and alt text. No progress changes.
- Test four matching assets/captions, no unrelated quest preview, and first-step-only rendering.
- Copy only the four reviewed PNGs to public/materials/learning-kit-previews; do not publish SQLite files or technical PDF-viewer capture.
- Run focused tests, full unit tests, lint and production build. Stage with existing stage-kurs1.mjs into a new isolated release, keep the previous release for rollback, then verify all four routes on desktop/mobile and live image hashes.
- Telegram/live AI setup remains separate: never reuse production bot credentials or connect real webinar rooms to obtain screenshots.
