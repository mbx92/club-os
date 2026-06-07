const XLSX = require('xlsx');

const filePath = 'docs/Dynasty_Menu_2026_FULL.xlsx';
const wb = XLSX.readFile(filePath);
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws);

console.log('📊 Total rows:', data.length);
console.log('\n📋 Column names:');
console.log(Object.keys(data[0]));

console.log('\n🔍 First 10 rows:');
data.slice(0, 10).forEach((row, idx) => {
  console.log(`\n[${idx + 1}]`, JSON.stringify(row, null, 2));
});

console.log('\n🔍 Looking for products with variants (searching for "/", "hot", "ice", "regular", "large"):');
const productsWithVariants = data.filter(row => {
  const name = (row['Item Name'] || row['Name'] || '').toLowerCase();
  const price = String(row['Price (K)'] || row['Price'] || '');
  const notes = (row['Notes'] || '').toLowerCase();
  const desc = (row['Description'] || '').toLowerCase();
  
  return price.includes('/') || 
         notes.includes('hot') || notes.includes('ice') || 
         notes.includes('regular') || notes.includes('large') ||
         desc.includes('hot') || desc.includes('ice') ||
         desc.includes('regular') || desc.includes('large');
});

console.log(`\n✅ Found ${productsWithVariants.length} products with variants:`);
productsWithVariants.slice(0, 5).forEach((row, idx) => {
  console.log(`\n[${idx + 1}]`, JSON.stringify(row, null, 2));
});
