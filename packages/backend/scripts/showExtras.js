const XLSX = require('xlsx');

const wb = XLSX.readFile('docs/Dynasty_Menu_2026_FULL.xlsx');
const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

const withExtras = data.filter(r => r['Product Extra']);

console.log('🎯 Produk dengan Product Extra:\n');
withExtras.forEach((r, i) => {
  console.log(`${i + 1}. ${r['Item Name']} (${r.Variant})`);
  console.log(`   Price: Rp ${r['Price (IDR)'].toLocaleString('id-ID')}`);
  console.log(`   Extras: ${r['Product Extra']}`);
  console.log();
});

console.log(`\n✅ Total: ${withExtras.length} produk dengan extras`);
