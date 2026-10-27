import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("documents")
    .select("id, filename, status, created_at, document_chunks(count)")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const documents = (data ?? []).map((d) => ({
    id: d.id,
    filename: d.filename,
    status: d.status,
    created_at: d.created_at,
    chunkCount: (d.document_chunks as unknown as { count: number }[])[0]?.count ?? 0,
  }));

  return NextResponse.json({ documents });
}

export async function DELETE(req: Request) {
  const { id } = await req.json();

  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "id gerekli" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("documents")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
