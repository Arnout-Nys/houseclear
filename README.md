# HouseClear MVP

Mobile-first shared inventory for asynchronously clearing a family house.

## MVP features

- Shared family PIN (no individual auth setup yet)
- Select which family member you are
- Floors/rooms
- Add item with phone camera photo
- Photo storage in Supabase Storage
- Want / Maybe / No-interest voting
- Detect multiple people wanting the same object
- Final destination: family / sell / donate / clearance / recycle / trash
- Assign an item to a family member
- Mark physical removal complete
- Decision queues: conflicts, undecided, unclaimed
- Vercel-friendly serverless deployment

## 1. Create Supabase project

Create a free Supabase project.

Open **SQL Editor** and run, in order:

1. `supabase/schema.sql`
2. `supabase/seed.sql`

Edit `seed.sql` first if you want your real family member and room names.

## 2. Environment variables

Copy `.env.example` to `.env.local` for local use.

Values required:

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SECRET_KEY=...
FAMILY_PIN=6384
SESSION_SECRET=a-long-random-secret-at-least-32-characters
```

Find the Supabase URL and service-role key in your project's API settings. **Never put the service-role key in a `NEXT_PUBLIC_...` variable.** It is intentionally used only by server routes.

Generate a session secret, for example:

```bash
openssl rand -hex 32
```

## 3. Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## 4. Deploy to Vercel

1. Put this folder in a private GitHub repository.
2. In Vercel choose **Add New → Project** and import the repository.
3. Add the four environment variables listed above.
4. Deploy.
5. Open the generated `*.vercel.app` URL on each family phone.
6. On iPhone/iPad: Safari → Share → **Add to Home Screen**.

No custom domain is required.

## Security model for MVP

The browser never gets your Supabase service-role key. All database and upload operations go through authenticated Next.js API routes on Vercel. A successful family PIN sets an HttpOnly signed session cookie.

This is appropriate for a small temporary private-family tool, provided the Vercel URL and PIN are not publicly shared. For a longer-lived product, replace the shared PIN with Supabase Auth and row-level security.

## Recommended next sprint

1. Rapid-capture mode (take many photos without leaving camera flow)
2. Multiple photos per item
3. Add/edit family members and rooms in the UI
4. Search and filtering
5. CSV export for house-clearance provider
6. Printable QR labels
7. Client-side image compression before upload
8. AI-assisted naming/category/value-warning
9. Floor-plan view
10. Audit/history log
