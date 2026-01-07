# Deployment Instructions untuk Vercel

## Struktur Proyek
- Semua file static berada di folder `public/`
- Vercel dikonfigurasi untuk menggunakan `outputDirectory: "public"`

## Langkah-langkah Deploy

1. **Pastikan semua file di folder `public/` ter-commit ke Git:**
   ```bash
   git add public/
   git add vercel.json
   git add package.json
   git commit -m "Fix: Update for Vercel deployment"
   git push
   ```

2. **Verifikasi di Vercel Dashboard:**
   - Pastikan `Output Directory` diatur ke `public`
   - Pastikan `Build Command` kosong atau `null`
   - Pastikan `Install Command` kosong

3. **Setelah Deploy:**
   - Cek apakah semua file ter-load tanpa error 404
   - Verifikasi `/icons/icon-192.png` dapat diakses
   - Verifikasi `/css/style.css` dapat diakses

## Troubleshooting

Jika masih ada error 404:
1. Pastikan semua file di folder `public/` ter-commit ke Git
2. Cek Vercel deployment logs untuk error
3. Pastikan `vercel.json` sudah benar dengan `outputDirectory: "public"`
