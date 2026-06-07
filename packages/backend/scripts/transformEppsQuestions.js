'use strict';

/**
 * Transform EPPS questions from legacy format to API format
 * 
 * Usage:
 *   node scripts/transformEppsQuestions.js
 * 
 * Input: docs/soalPsikolog/epps.json
 * Output: docs/soalPsikolog/epps-transformed.json
 * 
 * CATATAN PENTING:
 * - needA dan needB di-include karena data asli memiliki row_idx dan col_idx 
 *   yang merepresentasikan posisi dalam matriks EPPS
 * - EPPS Matrix: baris = needA, kolom = needB
 * - Frontend bisa menggunakan data ini untuk display/preview
 * - Backend scoringService akan melakukan validasi dan recalculate
 */

const fs = require('fs');
const path = require('path');

// EPPS 15 needs mapping (index to need code)
// Index dalam matriks EPPS adalah 1-15 untuk setiap need
const EPPS_NEEDS = [
  'ach', // 1. Achievement
  'def', // 2. Deference
  'ord', // 3. Order
  'exh', // 4. Exhibition
  'aut', // 5. Autonomy
  'aff', // 6. Affiliation
  'int', // 7. Intraception
  'suc', // 8. Succorance
  'dom', // 9. Dominance
  'aba', // 10. Abasement
  'nur', // 11. Nurturance
  'chg', // 12. Change
  'end', // 13. Endurance
  'het', // 14. Heterosexuality
  'agg'  // 15. Aggression
];

/**
 * Fix broken text - data asli memiliki spasi yang terpotong di tengah kata
 * Contoh: "merek a" -> "mereka", "jabat an" -> "jabatan"
 * 
 * Pola yang ditemukan: ada spasi di tengah kata, biasanya sebelum 1-2 huruf terakhir
 */
function fixBrokenText(text) {
  if (!text) return '';
  
  // Normalize multiple spaces to single space first
  let fixed = text.replace(/\s+/g, ' ').trim();
  
  // Specific word replacements found in data (case insensitive where needed)
  const wordReplacements = {
    // Format: 'broken pattern': 'correct word'
    // Q100, Q150, Q200 fixes
    'dibandin gkan': 'dibandingkan',
    'bilabe rbeda': 'bila berbeda',
    'inginra sanya': 'ingin rasanya',
    'menur ut': 'menurut',
    
    // General fixes
    'merek a': 'mereka',
    'mere ka': 'mereka',
    'm ereka': 'mereka',
    'jabat an': 'jabatan',
    'jabatan a tau': 'jabatan atau',
    'jabatan, a tau': 'jabatan, atau',
    'a tau': 'atau',
    'd an': 'dan',
    'te liti': 'teliti',
    't eliti': 'teliti',
    'wakt u': 'waktu',
    'wak tu': 'waktu',
    'pe rubahan': 'perubahan',
    'perub ahan': 'perubahan',
    'pi kiran': 'pikiran',
    'detai l': 'detail',
    'deta il': 'detail',
    'berkomenta r': 'berkomentar',
    'berkoment ar': 'berkomentar',
    'besa r': 'besar',
    'bes ar': 'besar',
    'direncana kan': 'direncanakan',
    'direncanaka n': 'direncanakan',
    'persoala n': 'persoalan',
    'kag umi': 'kagumi',
    't ertentu': 'tertentu',
    'terte ntu': 'tertentu',
    'keduduk an': 'kedudukan',
    'ked udukan': 'kedudukan',
    'y ang': 'yang',
    'sedemikia n': 'sedemikian',
    'sedemiki an': 'sedemikian',
    'memula i': 'memulai',
    't eman': 'teman',
    'tem an': 'teman',
    'ditunju k': 'ditunjuk',
    'tindakan-ti ndakan': 'tindakan-tindakan',
    'o ganisasi': 'organisasi',
    'kertas-k ertas': 'kertas-kertas',
    'kertas- kertas': 'kertas-kertas',
    'mungk in': 'mungkin',
    'pekejaan': 'pekerjaan',
    'maknany a': 'maknanya',
    'menghi ndarkan': 'menghindarkan',
    'berkisa r': 'berkisar',
    'berki sar': 'berkisar',
    'segal a': 'segala',
    'se lesai': 'selesai',
    'pemipin': 'pemimpin',
    'pedalam an': 'pedalaman',
    'b erbagai': 'berbagai',
    'kelo mpok': 'kelompok',
    'kelom pok': 'kelompok',
    'la ku': 'laku',
    'kepentinga n': 'kepentingan',
    'kepenting an': 'kepentingan',
    'melakkan': 'melakukan',
    'kewa jiban': 'kewajiban',
    'kewajib an': 'kewajiban',
    'sehinga': 'sehingga',
    'leb ih': 'lebih',
    's aya': 'saya',
    'say a': 'saya',
    'rasasayang': 'rasa sayang',
    'terh adap': 'terhadap',
    'memakasakan': 'memaksakan',
    'mem punyai': 'mempunyai',
    'diangga p': 'dianggap',
    'oang': 'orang',
    'seseorag': 'seseorang',
    'dimuka': 'di muka',
    'barang- barang': 'barang-barang',
    'untk': 'untuk',
    'selasai': 'selesai',
    'tesusun': 'tersusun',
    'tersu sun': 'tersusun',
    'hal-ha l': 'hal-hal',
    'banar': 'benar',
    'law an': 'lawan',
    'sesu atunya': 'sesuatunya',
    'hor mati': 'hormati',
    'k adang': 'kadang',
    'lai n': 'lain',
    'he bat': 'hebat',
    'men yelesaikan': 'menyelesaikan',
    'melaku kan': 'melakukan',
    'kewajib an': 'kewajiban',
    'direncana kan': 'direncanakan',
    'segal a': 'segala',
    'tent ang': 'tentang',
    'tersusun rapi': 'tersusun rapi',
    'sandiwara-s andiwara': 'sandiwara-sandiwara',
    'persoalan-persoalan sampai': 'persoalan-persoalan sampai',
    'teka-teki atau': 'teka-teki atau',
    'mungkain': 'mungkin',
    'b erwenang': 'berwenang',
    'tanggungjawab': 'tanggung jawab',
    'oganisasi': 'organisasi',
    'rencana-rencana sa ya': 'rencana-rencana saya',
    'keadaan y ang': 'keadaan yang',
    'semata -mata': 'semata-mata',
    'deta il-detail': 'detail-detail',
    'orang-orang bes ar': 'orang-orang besar',
    'orang-orang besa r': 'orang-orang besar',
    'teman-teman say a': 'teman-teman saya',
    'rencana-rencana sa ya': 'rencana-rencana saya',
    // More patterns found
    'ingin ra sanya': 'ingin rasanya',
    'ra sanya': 'rasanya',
    'bila be rbeda': 'bila berbeda',
    'be rbeda': 'berbeda',
    'dibandin g': 'dibanding',
    'menur ut': 'menurut',
    'simp ati': 'simpati',
    'sim pati': 'simpati',
    'tertentu.': 'tertentu.',
    'org anisasi': 'organisasi',
    'sesua tu': 'sesuatu',
    'sesuatu nya': 'sesuatunya',
    'mem bujuk': 'membujuk',
    'menen tukan': 'menentukan',
    'kegagal an': 'kegagalan',
    'kepemim pinan': 'kepemimpinan',
    'perse lisihan': 'perselisihan',
    'pers elisihan': 'perselisihan',
    // New patterns found in Q15, Q20, Q26
    'saatme nentukan': 'saat menentukan',
    'saat me nentukan': 'saat menentukan',
    'me nentukan': 'menentukan',
    'maknanya se ring': 'maknanya sering',
    'yangsa ya': 'yang saya',
    'yang sa ya': 'yang saya',
    'sa ya': 'saya',
    'se ring': 'sering',
    'hal yangsa': 'hal yang sa',
    // Q27 and Q41 patterns
    'dan me lakukan': 'dan melakukan',
    'me lakukan': 'melakukan',
    'yangkua t': 'yang kuat',
    'yang kua t': 'yang kuat',
    'kua t': 'kuat',
    'sandiwarayan g': 'sandiwara yang',
    'sandiwara yan g': 'sandiwara yang',
    'yan g': 'yang',
    // General patterns
    'menuru t': 'menurut',
    // Q60, Q64, Q69, Q90, Q110, Q115, Q140 patterns
    'berbeda dar i': 'berbeda dari',
    'dar i': 'dari',
    'pekerjaan at au': 'pekerjaan atau',
    'at au': 'atau',
    'yang tel ah': 'yang telah',
    'tel ah': 'telah',
    'sedemikian ru pa': 'sedemikian rupa',
    'ru pa': 'rupa',
    'dan al asan': 'dan alasan',
    'al asan': 'alasan',
    'tidak ba ik': 'tidak baik',
    'ba ik': 'baik',
    'hal-hal se mata': 'hal-hal semata',
    'se mata': 'semata',
    'sejumla h': 'sejumlah',
    'lebi h': 'lebih',
    // Q210
    'lainbi la': 'lain bila',
    'bi la': 'bila',
  };
  
  // Apply specific word replacements (sort by length desc to replace longer patterns first)
  const sortedReplacements = Object.entries(wordReplacements)
    .sort((a, b) => b[0].length - a[0].length);
  
  for (const [broken, correct] of sortedReplacements) {
    fixed = fixed.split(broken).join(correct);
  }
  
  // Pattern-based fixes for remaining broken words
  // Fix pattern: word ending with space + single letter that should be connected
  // e.g., "melaku kan" -> "melakukan"
  fixed = fixed.replace(/(\w{3,}) ([a-z]{1,3})(?=\s|[.,!?]|$)/g, (match, p1, p2) => {
    // Don't fix if p2 is a valid Indonesian word or common prefix
    const validShortWords = ['di', 'ke', 'se', 'ya', 'ku', 'mu', 'ia', 'dan', 'ada', 'ini', 'itu', 'tak', 'hal', 'juga'];
    if (validShortWords.includes(p2.toLowerCase())) {
      return match;
    }
    // Connect them
    return p1 + p2;
  });
  
  // Fix hyphenated words that got broken: "sandiwara-s andiwara" -> "sandiwara-sandiwara"
  fixed = fixed.replace(/(\w+)-(\w) (\w+)/g, '$1-$2$3');
  
  // Normalize spaces again
  fixed = fixed.replace(/\s+/g, ' ').trim();
  
  return fixed;
}

function getNeedFromIndex(idx) {
  // idx is 1-based, maps to EPPS_NEEDS array (0-based)
  if (idx >= 1 && idx <= 15) {
    return EPPS_NEEDS[idx - 1];
  }
  return null;
}

function transformQuestion(q) {
  return {
    id: q.number,
    textA: fixBrokenText(q.statement_a),
    textB: fixBrokenText(q.statement_b),
    // Metadata untuk referensi (TIDAK digunakan untuk scoring di frontend)
    // Scoring akan dilakukan oleh backend scoringService menggunakan EPPS matrix lookup
    rowIdx: parseInt(q.row_idx, 10),
    colIdx: parseInt(q.col_idx, 10),
    matrixGroup: parseInt(q.mtrx_group, 10)
  };
}

function main() {
  const inputPath = path.join(__dirname, '../docs/soalPsikolog/epps.json');
  const outputPath = path.join(__dirname, '../docs/soalPsikolog/epps-transformed.json');
  
  console.log('Reading EPPS questions from:', inputPath);
  
  const rawData = fs.readFileSync(inputPath, 'utf8');
  const json = JSON.parse(rawData);
  
  const questions = json.data || json;
  
  console.log(`Found ${questions.length} questions`);
  
  const transformed = questions.map(transformQuestion);
  
  // Validate - check for missing required fields
  const invalid = transformed.filter(q => !q.textA || !q.textB);
  if (invalid.length > 0) {
    console.warn(`Warning: ${invalid.length} questions have missing text`);
    invalid.slice(0, 5).forEach(q => {
      console.warn(`  Question ${q.id}: textA=${q.textA ? 'OK' : 'MISSING'}, textB=${q.textB ? 'OK' : 'MISSING'}`);
    });
  } else {
    console.log('All questions have valid text content');
  }
  
  // Create output
  const output = {
    testType: 'EPPS',
    description: 'Edwards Personal Preference Schedule - 225 questions, 15 needs',
    totalQuestions: transformed.length,
    needs: EPPS_NEEDS,
    scoringNote: 'Scoring menggunakan EPPS Matrix berdasarkan rowIdx dan colIdx. Backend scoringService akan handle perhitungan.',
    questions: transformed
  };
  
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log('Transformed questions saved to:', outputPath);
  
  // Also print sample for Postman
  console.log('\n--- Sample API Request Body ---\n');
  console.log(JSON.stringify({
    code: 'EPPS',
    name: 'Edwards Personal Preference Schedule',
    description: 'Measures 15 psychological needs based on Henry Murray theory',
    category: 'personality',
    estimatedMinutes: 45,
    questions: transformed.slice(0, 3),
    scoringConfig: {
      needs: EPPS_NEEDS,
      consistency: ['BD', 'BH', 'S'],
      matrixBased: true,
      scoringNote: 'Backend scoringService uses EPPS matrix lookup with rowIdx/colIdx'
    },
    isActive: true
  }, null, 2));
}

main();
