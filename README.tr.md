# Askfolio

[English](./README.md)

PDF yükleyip içeriği hakkında soru sorabildiğin küçük bir uygulama. Cevaplar sadece yüklenen dokümanlardan geliyor ve her cevabın altında hangi dosyanın hangi sayfasından alındığı görünüyor.

RAG'in nasıl çalıştığını bir framework'ün arkasına saklamadan anlamak için yaptım: parse, chunk, embedding, vector search ve cevap üretme kısmı birkaç küçük dosyadan ibaret.

## Stack

Next.js (App Router), Supabase + pgvector, Vercel AI SDK üzerinden Gemini (embedding için `gemini-embedding-001`, cevap için `gemini-3.5-flash`) ve sayfa sayfa PDF okumak için `unpdf`.

## Nasıl çalışıyor

**Yükleme** (`POST /api/documents/parse`): PDF sayfalara, her sayfa 100 karakter overlap'li ~600 karakterlik chunk'lara bölünüyor, her chunk için 768 boyutlu embedding üretilip `document_chunks` tablosuna yazılıyor. Aynı isimle tekrar yüklenen dosya eskisinin yerine geçiyor.

**Chat** (`POST /api/chat`): soru embed ediliyor, `match_chunks` en yakın chunk'ları dönüyor, ilk 3 tanesi prompt'a ekleniyor ve cevap stream ediliyor. Kaynaklar `X-Sources` header'ı ile gönderiliyor, arayüz bunları cevabın altında gösteriyor.

Sayfa numaraları baştan korunuyor, böylece kaynak "PDF'in bir yerinde" değil gerçek bir sayfayı gösteriyor.

## Kurulum

```bash
npm install
```

Örnek env dosyasını kopyalayıp kendi key'lerini yaz:

```bash
cp .env.example .env.local
```

Service role key sadece API route'larında kullanılıyor, tarayıcıya hiç gitmiyor.

Supabase SQL editor'de şunu çalıştır:

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

Sonra:

```bash
npm run dev
```

- `/`: chat
- `/upload`: doküman yükleme ve yönetim

## Kod

- `src/lib/pdf.ts`, `chunk.ts`, `embed.ts`, `ingest.ts`: yükleme hattı
- `src/app/api/documents`: yükleme, listeleme, silme
- `src/app/api/chat/route.ts`: retrieval + stream edilen cevap
- `src/app/page.tsx`, `src/app/upload/page.tsx`: arayüz

## Eksikler

- Auth yok, URL'i bilen herkes yükleyip silebilir
- Büyük PDF'ler request içinde işleniyor, arka plan kuyruğu yok
- Duplicate kontrolü dosya adına göre, hash'e göre değil
- Chunking karakter bazlı, cümle veya token farkında değil
