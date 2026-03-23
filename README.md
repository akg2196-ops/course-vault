<<<<<<< HEAD
# Course Vault — One-Stop Study OS

A production-ready web app to **store, organize, and study** all course material across semesters.

## Features

- **Course Map**: Hierarchy of **Course → Subject → Chapter → Topic → Concept**. Each concept has summary, vocabulary, examples, tags, difficulty, and optional source links.
- **Content types**: Readings (PDF, DOCX), presentations (PPTX, PDF), notes (images, PDF, AI-generated markdown). Attach any file to any node.
- **Screens**: Dashboard, Course page (tree + content + attachments), Library (all files with filters), global Search.
- **MVP**: Full CRUD for the map, file upload + attach/detach, AI notes (stub + placeholder generator), JSON bulk import.

## Tech Stack

- **Next.js** (App Router) + **TypeScript**
- **Tailwind** + **shadcn-style** UI (CVA, Tailwind, custom components)
- **SQLite** + **Prisma**
- **Local file storage** for uploads (abstracted for future S3)
- **Simple mock auth** (dev user; ready for real auth later)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment

Create a `.env` in the project root (or copy from `.env.example`):

```
DATABASE_URL="file:./dev.db"
```

### 3. Database

```bash
npx prisma generate
npx prisma db push
```

Or use migrations:

```bash
npx prisma migrate dev --name init
```

### 4. Seed (optional)

```bash
npm run db:seed
```

This creates a dev user (`dev@coursevault.local` / `dev123`) and an example **Introduction to Psychology** course with subjects, chapters, topics, and concepts.

### 5. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Uploads (local)

- Files are stored under **`/uploads`** (created automatically) in the project root.
- Each file is saved as `{uuid}.{ext}`. The path is stored in the DB; the app serves them via **`/api/files/[filename]`**.
- To switch to S3 later, replace the implementation in `src/lib/storage.ts` and keep the same interface.

## Prisma + Dev Server

- **Generate client**: `npx prisma generate` (also runs on `npm install` via `postinstall`).
- **Apply schema**: `npx prisma db push` or `npx prisma migrate dev`.
- **Seed**: `npm run db:seed`.
- **Studio**: `npm run db:studio` to inspect data.

## Acceptance criteria

You can:

1. Create a course map with subjects, chapters, topics, and concepts.
2. Add a concept with summary, vocabulary, and examples.
3. Upload a PDF and attach it to a concept.
4. Upload a PPTX and attach it to a chapter.
5. Upload an image note and attach it to a topic.
6. Generate AI notes for a concept (placeholder if no API key).
7. Search for a term and see matching concepts and files.

## Project structure

```
src/
├── app/
│   ├── api/          # Auth, courses, nodes, upload, attachments, search, library, notes, AI
│   ├── courses/      # Course page, new course, [courseId]
│   ├── library/
│   ├── search/
│   ├── globals.css
│   └── layout.tsx
├── components/       # Nav, CourseTree, NodeContent, AttachmentsPanel, modals, UI
└── lib/              # db, storage, auth, utils, types
prisma/
├── schema.prisma
└── seed.ts
uploads/              # Local file storage (gitignored)
```

## License

MIT.
=======
# course-vault
>>>>>>> 58fc9ad76ca78aaba74943b83b05120c75334d98
