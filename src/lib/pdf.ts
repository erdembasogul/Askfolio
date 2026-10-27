export type PdfPage = {
  pageNumber: number;
  content: string;
};

export async function extractPdfPages(file: File): Promise<{
  filename: string;
  totalPages: number;
  pages: PdfPage[];
}> {
  const { getDocumentProxy, extractText } = await import("unpdf");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await getDocumentProxy(bytes);
  const { totalPages, text } = await extractText(pdf, { mergePages: false });

  const pages = (Array.isArray(text) ? text : [text]).map((content, i) => ({
    pageNumber: i + 1,
    content: content.trim(),
  }));

  return { filename: file.name, totalPages, pages };
}