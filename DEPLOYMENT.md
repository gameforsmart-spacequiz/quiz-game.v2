# Deployment Guide

## Environment Variables Required

Untuk deployment di Coolify, Anda perlu mengatur environment variables berikut:

### Supabase Configuration
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
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
   - `NEXT_PUBLIC_SUPABASE_URL` = URL Supabase Anda
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Anon key Supabase Anda

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
