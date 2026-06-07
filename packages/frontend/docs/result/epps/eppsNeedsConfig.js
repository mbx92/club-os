/**
 * Konfigurasi 15 Need EPPS (Wanita) dalam 2 bagian (Part 1 & Part 2).
 *
 * Aturan umum (sesuai Excel "Wanita (2)"):
 * - Part dari BARIS  (row)  → hitung jumlah 'A' pada baris tertentu, excludeFirst=true.
 * - Part dari KOLOM (col)  → hitung jumlah 'B' pada kolom tertentu, excludeFirst=true.
 *
 * Catatan:
 * - Part 1 (row) sudah “pasti” sesuai label baris per grup (Ach..Aut / Aff..Aba / Nur..Agg).
 * - Part 2 (col) masih placeholder — isi `colGroupIndex` & `colIndex` sesuai Excel-mu.
 *
 * Indeks:
 * - groupIndex (baris blok): 0 = blok (1–3), 1 = (4–6), 2 = (7–9)
 * - rowIndex: 0..4 (sesuai urutan label di rowGroupLabels)
 * - colGroupIndex (kolom blok): 0 = (1,4,7), 1 = (2,5,8), 2 = (3,6,9)
 * - colIndex: 0..4
 */

export const rowGroupLabels = [
  // Grup atas (blok 1–3)
  ['Ach', 'Def', 'Ord', 'Exh', 'Aut'],
  // Grup tengah (blok 4–6)
  ['Aff', 'Int', 'Suc', 'Dom', 'Aba'],
  // Grup bawah (blok 7–9)
  ['Nur', 'Chg', 'End', 'Het', 'Agg']
];

// Helper daftar need (urutan standar)
export const allNeeds = [
  'Ach','Def','Ord','Exh','Aut',
  'Aff','Int','Suc','Dom','Aba',
  'Nur','Chg','End','Het','Agg'
];

/**
 * Setiap need memiliki 2 part:
 * - Part 1 → dari BARIS (A-count)
 * - Part 2 → dari KOLOM (B-count)  ← ISI mapping sesuai Excel (placeholder “TODO”)
 */
export const needsConfig = {
  // Grup 0 (blok 1–3)
  Ach: [
    { type: 'row', groupIndex: 0, rowIndex: 0, answer: 'A', excludeFirst: true },
    { type: 'col', colGroupIndex: 0, colIndex: 0, answer: 'B', excludeFirst: true } // TODO: sesuaikan Excel
  ],
  Def: [
    { type: 'row', groupIndex: 0, rowIndex: 1, answer: 'A', excludeFirst: true },
    { type: 'col', colGroupIndex: 0, colIndex: 1, answer: 'B', excludeFirst: true } // TODO
  ],
  Ord: [
    { type: 'row', groupIndex: 0, rowIndex: 2, answer: 'A', excludeFirst: true },
    { type: 'col', colGroupIndex: 0, colIndex: 2, answer: 'B', excludeFirst: true } // TODO
  ],
  Exh: [
    { type: 'row', groupIndex: 0, rowIndex: 3, answer: 'A', excludeFirst: true },
    { type: 'col', colGroupIndex: 0, colIndex: 3, answer: 'B', excludeFirst: true } // TODO
  ],
  Aut: [
    { type: 'row', groupIndex: 0, rowIndex: 4, answer: 'A', excludeFirst: true },
    { type: 'col', colGroupIndex: 0, colIndex: 4, answer: 'B', excludeFirst: true } // TODO
  ],

  // Grup 1 (blok 4–6)
  Aff: [
    { type: 'row', groupIndex: 1, rowIndex: 0, answer: 'A', excludeFirst: true },
    { type: 'col', colGroupIndex: 1, colIndex: 0, answer: 'B', excludeFirst: true } // TODO
  ],
  Int: [
    { type: 'row', groupIndex: 1, rowIndex: 1, answer: 'A', excludeFirst: true },
    { type: 'col', colGroupIndex: 1, colIndex: 1, answer: 'B', excludeFirst: true } // TODO
  ],
  Suc: [
    { type: 'row', groupIndex: 1, rowIndex: 2, answer: 'A', excludeFirst: true },
    { type: 'col', colGroupIndex: 1, colIndex: 2, answer: 'B', excludeFirst: true } // TODO
  ],
  Dom: [
    { type: 'row', groupIndex: 1, rowIndex: 3, answer: 'A', excludeFirst: true },
    { type: 'col', colGroupIndex: 1, colIndex: 3, answer: 'B', excludeFirst: true } // TODO
  ],
  Aba: [
    { type: 'row', groupIndex: 1, rowIndex: 4, answer: 'A', excludeFirst: true },
    { type: 'col', colGroupIndex: 1, colIndex: 4, answer: 'B', excludeFirst: true } // TODO
  ],

  // Grup 2 (blok 7–9)
  Nur: [
    { type: 'row', groupIndex: 2, rowIndex: 0, answer: 'A', excludeFirst: true },
    { type: 'col', colGroupIndex: 2, colIndex: 0, answer: 'B', excludeFirst: true } // TODO
  ],
  Chg: [
    { type: 'row', groupIndex: 2, rowIndex: 1, answer: 'A', excludeFirst: true },
    { type: 'col', colGroupIndex: 2, colIndex: 1, answer: 'B', excludeFirst: true } // TODO
  ],
  End: [
    { type: 'row', groupIndex: 2, rowIndex: 2, answer: 'A', excludeFirst: true },
    { type: 'col', colGroupIndex: 2, colIndex: 2, answer: 'B', excludeFirst: true } // TODO
  ],
  Het: [
    { type: 'row', groupIndex: 2, rowIndex: 3, answer: 'A', excludeFirst: true },
    { type: 'col', colGroupIndex: 2, colIndex: 3, answer: 'B', excludeFirst: true } // TODO
  ],
  Agg: [
    { type: 'row', groupIndex: 2, rowIndex: 4, answer: 'A', excludeFirst: true },
    { type: 'col', colGroupIndex: 2, colIndex: 4, answer: 'B', excludeFirst: true } // TODO
  ]
};
