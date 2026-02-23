# Leaderboard Holder Emiten (BBCA)

Web app leaderboard holder untuk 1 emiten dengan stack:
- Next.js (App Router) + TypeScript
- TailwindCSS
- Prisma ORM + PostgreSQL
- Validasi input Zod

## Fitur Utama
- Summary statistik: total holders, total lots, mean avg price, total nominal.
- Top 10 leaderboard dengan aturan ranking:
  - lots desc
  - totalNominal desc
  - usernameKey asc
- Tab `Top 10 Loser` berdasarkan perbandingan avg user vs harga sekarang.
- Harga terakhir emiten ditarik server-side dari Google Finance (tanpa API key).
- Submit entry holder (username unik case-insensitive, max 200 karakter).
- Opsi checkbox `blur` untuk menyamarkan row user di leaderboard.
- Tab kanan dipisah: `Submit Entry` dan `Check My Rank`.
- Total nominal dihitung otomatis dari rumus `lots * 100 * avgPrice` saat submit.
- Kartu "Posisimu" setelah submit berhasil.
- Holder selain Top 10 disembunyikan, namun tetap dihitung dalam statistik.

## Data Model (Prisma)
Model `HoldingEntry`:
- `id` (uuid)
- `usernameDisplay`
- `usernameKey` (unique, lowercase + trim)
- `isBlurred` (boolean, default false)
- `lots` (int >= 1)
- `avgPrice` (decimal >= 0)
- `totalNominal` (decimal >= 0)
- `createdAt`
- `updatedAt`

## Setup Local
1. Install dependencies:

```bash
npm install
```

2. Set environment variable `DATABASE_URL` dan `DIRECT_URL` ke PostgreSQL lokal/Neon/Supabase:

```bash
cp .env.example .env
# DATABASE_URL: pooled URL (runtime/serverless)
# DIRECT_URL: direct URL (migrations)
```

3. Jalankan migration:

```bash
npx prisma migrate dev
```

4. Kosongkan data leaderboard (opsional, useful untuk reset):

```bash
npx prisma db seed
```

5. Jalankan dev server:

```bash
npm run dev
```

Akses: `http://localhost:3000`

## Deploy ke Vercel (Serverless)
1. Buat database PostgreSQL (Vercel Postgres / Neon / Supabase).
2. Set `DATABASE_URL` dan `DIRECT_URL` di Vercel Project Environment Variables.
3. Pastikan Prisma client ter-generate saat build:
   - Sudah ada script `postinstall: prisma generate`.
4. Jalankan migration production dengan:

```bash
npx prisma migrate deploy
```

### Opsi menjalankan `prisma migrate deploy`
- Opsi A (direkomendasikan): jalankan sebagai langkah terpisah di CI/CD sebelum/bersamaan deploy.
- Opsi B: ubah Build Command Vercel menjadi:

```bash
prisma migrate deploy && npm run build
```

Dengan ini deployment tidak bergantung pada filesystem persisten dan tetap aman untuk serverless.

## Scripts
- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run db:seed`
- `npm run migrate:deploy`

## Catatan Validasi
- Regex username: `/^[A-Za-z0-9_]{1,200}$/`
- Batas ekstrem:
  - `lots <= 10_000_000`
  - `avgPrice <= 9_999_999_999_999.99`
  - hasil hitung `lots * 100 * avgPrice <= 9_999_999_999_999.99`
- Error duplicate username: `Username sudah digunakan, pilih username lain.`
