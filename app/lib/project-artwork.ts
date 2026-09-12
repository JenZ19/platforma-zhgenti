// Change the revision when replacing covers so returning learners see the new art.
export const PROJECT_ARTWORK_REVISION = "20260908-mockups";
export function projectArtworkUrl(slug: string) {
  return `/covers/${slug}.webp?v=${PROJECT_ARTWORK_REVISION}`;
}
