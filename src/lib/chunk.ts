export type TextChunk = {
  content: string;
  pageNumber: number;
};

export function chunkText(
  text: string,
  pageNumber: number,
  chunkSize = 600,
  overlap = 100
): TextChunk[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];
  if (cleaned.length <= chunkSize) {
    return [{ content: cleaned, pageNumber }];
  }
  const chunks: TextChunk[] = [];
  let start = 0;
  while (start < cleaned.length) {
    const end = Math.min(start + chunkSize, cleaned.length);
    chunks.push({
      content: cleaned.slice(start, end),
      pageNumber,
    });
    if (end >= cleaned.length) break;
    start = end - overlap;
  }
  return chunks;
}
export function chunkPages(pages: { pageNumber: number; content: string }[]) {
  return pages.flatMap((p) => chunkText(p.content, p.pageNumber));
}