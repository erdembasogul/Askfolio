# Askfolio

[Türkçe](./README.tr.md)

Upload PDFs, then ask questions about them. Answers come only from the uploaded documents and every answer shows which file and page it came from.

I built this to understand how RAG works without hiding everything behind a framework: parsing, chunking, embeddings, vector search and generation are all a few small files you can read in one sitting.

## Stack

Next.js (App Router), Supabase + pgvector, Gemini (`gemini-embedding-001` for embeddings, `gemini-3.5-flash` for answers) via the Vercel AI SDK, and `unpdf` for page-by-page PDF parsing.

## How it works

**Upload** (`POST /api/documents/parse`): the PDF is split into pages, each page into ~600 character chunks with 100 characters of overlap, each chunk is embedded (768 dims) and stored in `document_chunks`. Uploading a file with the same name replaces the old one.

**Chat** (`POST /api/chat`): the question is embedded, `match_chunks` returns the closest chunks, the top 3 go into the prompt and the answer is streamed back. Sources are sent in an `X-Sources` header so the UI can show them under the answer.

Page numbers are kept from the start so citations point to a real page instead of "somewhere in the PDF".

## Setup

```bash
npm install
```

`.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
```

The service role key is only used in API routes, never in the browser.

Run this in the Supabase SQL editor:

```sql
create extension if not exists vector;

create table documents (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  status text not null default 'processing',
  created_at timestamptz default now()
);

create table document_chunks (
  id bigserial primary key,
  document_id uuid references documents(id) on delete cascade,
  content text not null,
  page_number int,
  embedding vector(768),
  created_at timestamptz default now()
);

create or replace function match_chunks(
  query_embedding vector(768),
  match_count int,
  match_threshold float
)
returns table (content text, page_number int, filename text, similarity float)
language sql stable as $$
  select c.content, c.page_number, d.filename,
         1 - (c.embedding <=> query_embedding) as similarity
  from document_chunks c
  join documents d on d.id = c.document_id
  where 1 - (c.embedding <=> query_embedding) > match_threshold
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
```

Then:

```bash
npm run dev
```

- `/`: chat
- `/upload`: upload and manage documents

## Code

- `src/lib/pdf.ts`, `chunk.ts`, `embed.ts`, `ingest.ts`: the ingestion pipeline
- `src/app/api/documents`: upload, list, delete
- `src/app/api/chat/route.ts`: retrieval + streaming answer
- `src/app/page.tsx`, `src/app/upload/page.tsx`: UI

## Known limitations

- No auth, anyone with the URL can upload and delete
- Large PDFs are processed inside the request, no background queue
- Duplicate detection is by filename, not file hash
- Chunking is character based, not sentence or token aware
