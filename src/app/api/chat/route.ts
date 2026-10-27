import { NextResponse } from "next/server";
import { streamText, createTextStreamResponse } from "ai";
import { google } from "@ai-sdk/google";
import { embedQuery } from "@/lib/embed";
import { supabaseAdmin } from "@/lib/supabase";

type Match = {
  content: string;
  page_number: number | null;
  filename: string;
  similarity: number;
};

export async function POST(req: Request) {
  const { question } = await req.json();

  if (!question || typeof question !== "string") {
    return NextResponse.json({ error: "question gerekli" }, { status: 400 });
  }

  const queryEmbedding = await embedQuery(question);

  const { data, error } = await supabaseAdmin.rpc("match_chunks", {
    query_embedding: queryEmbedding,
    match_count: 5,
    match_threshold: 0.3,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const matches = (data ?? []) as Match[];

  if (matches.length === 0) {
    return new Response("Belirtilen dokümanlarda bu bilgi yer almıyor.");
  }

  const context = matches
    .slice(0, 3)
    .map(
      (m, i) =>
        `[Kaynak ${i + 1}] ${m.filename}, sayfa ${m.page_number}\n${m.content}`
    )
    .join("\n\n");

  // Header'lar sadece ASCII taşıyabildiği için content base64'e çevriliyor.
  const sources = matches.slice(0, 3).map((m) => ({
    filename: m.filename,
    page_number: m.page_number,
    similarity: m.similarity,
    content: Buffer.from(m.content, "utf-8").toString("base64"),
  }));

  const result = streamText({
    model: google("gemini-3.5-flash"),
    system: `Sadece aşağıdaki kaynaklara göre cevap ver.
Kaynakta yoksa uydurma; "Belirtilen dokümanlarda bu bilgi yer almıyor" de.
Kullandığın her iddiada dosya adı ve sayfa numarası yaz.
Kullanıcının dilinde cevapla.`,
    prompt: `Kaynaklar:\n\n${context}\n\nSoru: ${question}`,
  });

  return createTextStreamResponse({
    stream: result.textStream,
    headers: { "X-Sources": JSON.stringify(sources) },
  });
}