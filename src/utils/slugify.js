export function generateSlug(text) {
  if (!text) return "";

  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")      // spaces → -
    .replace(/[^\w\-]+/g, "")  // remove non-word chars
    .replace(/\-\-+/g, "-");   // collapse multiple -
}