# Deployment Guide

## Environment Variables Required

Untuk deployment di Coolify, Anda perlu mengatur environment variables berikut:

### Supabase Utama (Database 1)
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Supabase B (Database 2 - Game Sessions)
```
NEXT_PUBLIC_SUPABASE_B_URL=https://other-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_B_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Cara Mendapatkan Supabase Credentials:
1. Buka [Supabase Dashboard](https://supabase.com/dashboard)
2. Pilih project Anda
3. Pergi ke Settings > API
4. Copy URL dan anon key

## Setup di Coolify

1. **Buka project di Coolify**
2. **Pergi ke Environment Variables**
3. **Tambahkan variables berikut:**
   - `NEXT_PUBLIC_SUPABASE_URL` = URL Supabase Utama
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Anon key Supabase Utama
   - `NEXT_PUBLIC_SUPABASE_B_URL` = URL Supabase B
   - `NEXT_PUBLIC_SUPABASE_B_ANON_KEY` = Anon key Supabase B

> **PENTING**: Supabase B diperlukan untuk menyimpan data sesi game yang bersifat temporary. Tanpa ini, sistem akan fallback ke Database Utama yang memiliki aturan RLS lebih ketat (khusus untuk user yang login).

## Build Configuration

Aplikasi sudah dikonfigurasi untuk:
- ✅ Build dengan placeholder values jika environment variables tidak tersedia
- ✅ Validasi environment variables saat runtime
- ✅ Docker multi-stage build untuk optimasi
- ✅ Next.js standalone output untuk deployment

## Troubleshooting

### Error: Missing Supabase environment variables
- Pastikan environment variables sudah diatur di Coolify
- Restart deployment setelah menambahkan environment variables

### Build berhasil tapi aplikasi tidak berfungsi
- Periksa apakah environment variables sudah benar
- Pastikan Supabase project sudah aktif
- Cek logs aplikasi untuk error details
