import { NextResponse } from "next/server";
import { extractPdfPages } from "@/lib/pdf";
import { chunkPages } from "@/lib/chunk";
import { embedChunks } from "@/lib/embed";
import { saveDocument } from "@/lib/ingest";

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file alanı gerekli" }, { status: 400 });
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "sadece PDF" }, { status: 400 });
  }

  const result = await extractPdfPages(file);
  const chunks = chunkPages(result.pages);
  const embedded = await embedChunks(chunks);
  const saved = await saveDocument(result.filename, embedded);

  return NextResponse.json({
    filename: result.filename,
    totalPages: result.totalPages,
    ...saved,
    embeddingDimension: embedded[0]?.embedding.length ?? 0,
  });
}