# Gym Membership Frontend

Framework frontend untuk sistem manajemen gym membership menggunakan Vue.js 3, Pinia, Vue Router, Vite, Tailwind CSS, dan DaisyUI.

## Fitur

- ✅ Vue.js 3 dengan Composition API
- ✅ Pinia untuk state management
- ✅ Vue Router untuk routing
- ✅ Vite untuk build tool
- ✅ Tailwind CSS + DaisyUI untuk styling
- ✅ Auto-import components dan composables
- ✅ File-based routing
- ✅ Layout system
- ✅ Icon support dengan Tabler Icons
- ✅ Date utilities dengan dayjs
- ✅ HTTP client dengan ofetch
- ✅ CASL untuk authorization
- ✅ QR Code generation
- ✅ Markdown support

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment file:
```bash
copy .env.example .env
```

3. Run development server:
```bash
npm run dev
```

4. Build untuk production:
```bash
npm run build
```

5. Preview production build:
```bash
npm run preview
```

## Struktur Project

```
src/
├── assets/           # Static assets
├── components/       # Vue components (auto-imported)
├── composables/      # Composable functions (auto-imported)
├── layouts/          # Layout components
│   ├── default.vue   # Default layout dengan navbar & footer
│   └── auth.vue      # Auth layout untuk login/register
├── pages/            # File-based routes
│   ├── index.vue     # Dashboard
│   ├── members/      # Member pages
│   ├── memberships/  # Membership pages
│   └── classes/      # Class pages
├── stores/           # Pinia stores (auto-imported)
├── App.vue           # Root component
├── main.js           # Application entry point
└── style.css         # Global styles
```

## Fitur yang Sudah Dibuat

### 1. Dashboard (/)
- Statistik gym (total members, memberships, classes)
- Quick actions
- Recent activities
- Hero section

### 2. Members (/members)
- Daftar member dengan pencarian dan filter
- Tabel member dengan informasi lengkap
- Status membership
- Actions (view, edit, delete)

### 3. Memberships (/memberships)
- Paket membership dalam bentuk cards
- Harga dan fitur paket
- Jumlah member aktif per paket
- Badge untuk paket popular

### 4. Classes (/classes)
- Jadwal kelas dengan date selector
- Informasi kelas lengkap (waktu, durasi, kapasitas)
- Progress bar untuk enrollment
- Tags untuk kategori kelas

## Teknologi

- **Vue 3** - Progressive JavaScript framework
- **Pinia** - State management
- **Vue Router** - Routing
- **Vite** - Build tool & dev server
- **Tailwind CSS** - Utility-first CSS framework
- **DaisyUI** - Component library untuk Tailwind
- **Tabler Icons** - Icon library
- **dayjs** - Date manipulation
- **ofetch** - HTTP client
- **CASL** - Authorization library
- **VueUse** - Vue composition utilities

## Auto-Import

Project ini menggunakan unplugin-auto-import dan unplugin-vue-components untuk auto-import:

- Vue APIs (ref, computed, watch, dll)
- Vue Router APIs
- Pinia APIs
- VueUse composables
- Components dari folder `src/components`
- Composables dari folder `src/composables`
- Stores dari folder `src/stores`
- Icons dari Tabler Icons

## Theme

Project ini memakai DaisyUI themes dengan preset tenant-based, termasuk custom brand theme:
- `dynasty-club` untuk mode terang
- `dynasty-club-night` untuk mode gelap

Selain custom theme di atas, DaisyUI built-in themes tetap tersedia untuk preset lain seperti `corporate`, `business`, `autumn`, `coffee`, `emerald`, `forest`, `lofi`, `synthwave`, `luxury`, dan lainnya.

Theme aktif diterapkan lewat atribut `data-theme` dan bisa dipreview dari halaman Settings maupun route test `/_test/theme-test`.

## Development

Untuk menambah halaman baru, cukup buat file `.vue` di folder `src/pages/`. Routing akan dibuat otomatis berdasarkan struktur folder.

Untuk menambah component, buat file di `src/components/`. Component akan auto-imported dan bisa langsung digunakan tanpa import manual.

## License

MIT
