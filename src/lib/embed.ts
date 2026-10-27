import { embed, embedMany } from "ai";
import { google } from "@ai-sdk/google";
import type { TextChunk } from "@/lib/chunk";

export async function embedChunks(chunks: TextChunk[]) {
  const { embeddings } = await embedMany({
    model: google.embedding("gemini-embedding-001"),
    values: chunks.map((c) => c.content),
    providerOptions: {
      google: {
        outputDimensionality: 768,
        taskType: "RETRIEVAL_DOCUMENT",
      },
    },
  });

  return chunks.map((chunk, i) => ({
    ...chunk,
    embedding: embeddings[i],
  }));
}

export async function embedQuery(text: string) {
  const { embedding } = await embed({
    model: google.embedding("gemini-embedding-001"),
    value: text,
    providerOptions: {
      google: {
        outputDimensionality: 768,
        taskType: "RETRIEVAL_QUERY",
      },
    },
  });
  return embedding;
}