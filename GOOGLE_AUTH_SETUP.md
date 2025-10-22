# Google OAuth Setup Guide

## 🚀 Setup Google OAuth untuk Space Quiz

### 1. Google Cloud Console Setup

1. **Buka Google Cloud Console**
   - Kunjungi: https://console.cloud.google.com/
   - Pilih project yang sudah ada atau buat project baru

2. **Enable Google+ API**
   - Go to "APIs & Services" > "Library"
   - Search "Google+ API" dan enable

3. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Application type: "Web application"
   - Name: "Space Quiz App"

4. **Configure Authorized Redirect URIs**
   ```
   http://localhost:3000/auth/callback
   https://yourdomain.com/auth/callback
   ```

5. **Copy Client ID**
   - Copy the generated Client ID
   - Add to your `.env.local` file

### 2. Supabase Dashboard Setup

1. **Buka Supabase Dashboard**
   - Go to your project dashboard
   - Navigate to "Authentication" > "Providers"

2. **Enable Google Provider**
   - Toggle "Enable Google provider"
   - Paste your Google Client ID
   - Paste your Google Client Secret
   - Save configuration

3. **Configure Site URL**
   - Go to "Authentication" > "URL Configuration"
   - Site URL: `http://localhost:3000` (development)
   - Redirect URLs: `http://localhost:3000/auth/callback`

### 3. Environment Variables

Buat file `.env.local` di root project:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google OAuth Configuration
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
```

### 4. Testing

1. **Start Development Server**
   ```bash
   npm run dev
   ```

2. **Test Login Flow**
   - Buka http://localhost:3000
   - Click "Login" button
   - Pilih "Sign in with Google"
   - Complete OAuth flow
   - Verify profile creation

3. **Test Join Game**
   - Login dengan Google
   - Click "JOIN" button
   - Verify nama terisi otomatis
   - Verify avatar Google terpilih default

### 5. Features yang Sudah Diimplementasi

✅ **Google OAuth Login**
- Space-themed login modal
- OAuth redirect handling
- Session management

✅ **Profile Management**
- Auto-create profile dari Google data
- Sync username, email, fullname, avatar
- Profile persistence

✅ **Enhanced Join Game**
- Pre-fill nama dari Google profile
- Google avatar sebagai default
- Fallback ke animal avatars

✅ **Error Handling**
- Network error recovery
- OAuth error handling
- Profile creation error handling

✅ **Multi-language Support**
- English, Indonesian, Chinese
- Consistent theming

### 6. Troubleshooting

**Login tidak berfungsi:**
- Cek Google Client ID di Supabase
- Pastikan redirect URL benar
- Cek browser console untuk error

**Avatar Google tidak muncul:**
- Cek apakah user sudah login
- Cek network request ke Google
- Fallback ke animal avatar akan aktif

**Profile tidak terbuat:**
- Cek Supabase RLS policies
- Cek database connection
- Cek console untuk error messages

### 7. Production Deployment

1. **Update Redirect URLs**
   - Tambahkan production domain ke Google Console
   - Update Supabase Site URL

2. **Environment Variables**
   - Set production environment variables
   - Pastikan semua URL menggunakan HTTPS

3. **Testing**
   - Test full flow di production
   - Verify semua fitur berfungsi
   - Monitor error logs

---

**Fitur login Google sudah siap digunakan!** 🚀

