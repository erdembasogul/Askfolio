"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Source = {
  filename: string;
  page_number: number | null;
  similarity: number;
  content: string;
};

type Message = {
  role: "user" | "assistant";
  text: string;
  sources?: Source[];
};

export default function ChatPage() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q || loading) return;

    setQuestion("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setLoading(true);
    setMessages((m) => [...m, { role: "assistant", text: "" }]);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: q }),
    });

    if (!res.ok || !res.body) {
      setMessages((m) =>
        m.map((msg, i) =>
          i === m.length - 1 ? { ...msg, text: "Hata oluştu." } : msg
        )
      );
      setLoading(false);
      return;
    }

    const sourcesHeader = res.headers.get("X-Sources");
    const rawSources: Source[] = sourcesHeader ? JSON.parse(sourcesHeader) : [];
    const decoder = new TextDecoder();
    const sources = rawSources.map((s) => ({
      ...s,
      content: decoder.decode(
        Uint8Array.from(atob(s.content), (c) => c.charCodeAt(0))
      ),
    }));

    const reader = res.body.getReader();
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const piece = decoder.decode(value, { stream: true });
      fullText += piece;
      setMessages((m) =>
        m.map((msg, i) =>
          i === m.length - 1 ? { ...msg, text: fullText, sources } : msg
        )
      );
    }

    setLoading(false);
  }

  return (
    <main className="mx-auto flex h-screen max-w-2xl flex-col p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Askfolio</h1>
        <Link href="/upload" className="text-sm text-zinc-500">
          PDF yükle →
        </Link>
      </div>

      <div className="mt-6 flex-1 space-y-4 overflow-y-auto pr-1">
        {messages.map((msg, i) => (
          <div key={i} className={msg.role === "user" ? "text-right" : ""}>
            <p
              className={`inline-block rounded-lg px-3 py-2 whitespace-pre-wrap ${
                msg.role === "user" ? "bg-black text-white" : "bg-zinc-100"
              }`}
            >
              {msg.text || (loading && i === messages.length - 1 ? "▌" : "")}
            </p>
            {msg.sources && msg.sources.length > 0 && (
              <div className="mt-2 space-y-1">
                {msg.sources.map((s, j) => (
                  <details key={j} className="text-left text-sm text-zinc-600">
                    <summary className="cursor-pointer">
                      {s.filename}, sayfa {s.page_number} ·{" "}
                      {s.similarity.toFixed(2)}
                    </summary>
                    <p className="mt-1 rounded bg-zinc-50 p-2">{s.content}</p>
                  </details>
                ))}
              </div>
            )}
          </div>
        ))}
        {loading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="inline-flex items-center gap-2 rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-500">
            <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.3s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.15s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={onSubmit} className="mt-6 flex gap-2 border-t pt-4">
        <input
          className="flex-1 rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Dokümana sor…"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          Gönder
        </button>
      </form>
    </main>
  );
}
