"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Doc = {
  id: string;
  filename: string;
  status: string;
  created_at: string;
  chunkCount: number;
};

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [uploadMessage, setUploadMessage] = useState("");

  const [docs, setDocs] = useState<Doc[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);

  async function fetchDocs() {
    const res = await fetch("/api/documents");
    const data = await res.json();
    setDocs(data.documents ?? []);
    setDocsLoading(false);
  }

  useEffect(() => {
    fetch("/api/documents")
      .then((res) => res.json())
      .then((data) => {
        setDocs(data.documents ?? []);
        setDocsLoading(false);
      });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setUploadStatus("loading");
    setUploadMessage("");

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/documents/parse", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();

    if (!res.ok) {
      setUploadStatus("error");
      setUploadMessage(data.error ?? "Yükleme başarısız");
      return;
    }

    setUploadStatus("ok");
    setUploadMessage(
      `${data.filename} kaydedildi · ${data.totalPages} sayfa · ${data.chunkCount} chunk`
    );
    setFile(null);
    (e.target as HTMLFormElement).reset();
    fetchDocs();
  }

  async function onDelete(id: string, filename: string) {
    if (!confirm(`"${filename}" silinsin mi?`)) return;

    const res = await fetch("/api/documents", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (res.ok) {
      fetchDocs();
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <Link href="/" className="text-sm text-zinc-500">
        ← Chat
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">PDF yükle</h1>
      <p className="mt-2 text-zinc-500 text-sm">
        Aynı dosyayı tekrar yüklersen eski kayıt silinip yeniden işlenir.
      </p>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3">
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <button
          type="submit"
          disabled={!file || uploadStatus === "loading"}
          className="w-fit rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {uploadStatus === "loading" ? "İşleniyor…" : "Yükle"}
        </button>
      </form>

      {uploadMessage && (
        <p className={`mt-3 text-sm ${uploadStatus === "error" ? "text-red-600" : "text-green-700"}`}>
          {uploadMessage}
        </p>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-medium">Yüklenen dokümanlar</h2>

        {docsLoading ? (
          <p className="mt-4 text-sm text-zinc-500">Yükleniyor…</p>
        ) : docs.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">Henüz doküman yok.</p>
        ) : (
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b text-left text-zinc-500">
                <th className="pb-2 font-medium">Dosya</th>
                <th className="pb-2 font-medium">Durum</th>
                <th className="pb-2 font-medium">Chunk</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {docs.map((doc) => (
                <tr key={doc.id} className="border-b last:border-0">
                  <td className="py-2 pr-4 max-w-xs truncate">{doc.filename}</td>
                  <td className="py-2 pr-4">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        doc.status === "completed"
                          ? "bg-green-100 text-green-700"
                          : doc.status === "failed"
                          ? "bg-red-100 text-red-600"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {doc.status}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-zinc-600">{doc.chunkCount}</td>
                  <td className="py-2">
                    <button
                      onClick={() => onDelete(doc.id, doc.filename)}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
