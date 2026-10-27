import { supabaseAdmin } from "@/lib/supabase";

type EmbeddedChunk = {
  content: string;
  pageNumber: number;
  embedding: number[];
};

export async function saveDocument(
  filename: string,
  chunks: EmbeddedChunk[]
) {
  const { data: existing } = await supabaseAdmin
    .from("documents")
    .select("id")
    .eq("filename", filename)
    .maybeSingle();

  if (existing) {
    await supabaseAdmin.from("documents").delete().eq("id", existing.id);
  }

  const { data: doc, error: docError } = await supabaseAdmin
    .from("documents")
    .insert({ filename, status: "processing" })
    .select("id")
    .single();

  if (docError || !doc) {
    throw new Error(docError?.message ?? "document insert failed");
  }

  const rows = chunks.map((c) => ({
    document_id: doc.id,
    content: c.content,
    page_number: c.pageNumber,
    embedding: c.embedding,
  }));

  const { error: chunkError } = await supabaseAdmin
    .from("document_chunks")
    .insert(rows);

  if (chunkError) {
    await supabaseAdmin
      .from("documents")
      .update({ status: "failed" })
      .eq("id", doc.id);
    throw new Error(chunkError.message);
  }

  await supabaseAdmin
    .from("documents")
    .update({ status: "completed" })
    .eq("id", doc.id);

  return { documentId: doc.id, chunkCount: rows.length };
}