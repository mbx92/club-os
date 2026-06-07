#!/usr/bin/env node
'use strict';

/**
 * Script untuk update CFIT test dengan instruksi per subtest
 * 
 * Usage:
 *   node scripts/updateCfitWithInstructions.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env.development'), override: true });

console.log('='.repeat(60));
console.log('UPDATE CFIT TEST WITH INSTRUCTIONS');
console.log('='.repeat(60));
console.log(`Database: ${process.env.DB_NAME || 'not set'}`);
console.log('='.repeat(60));

async function main() {
  const db = require('../src/models');
  const { PsychologyTestType } = db;

  try {
    await db.sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Find CFIT test
    const cfitTest = await PsychologyTestType.findOne({
      where: { code: 'CFIT' }
    });

    if (!cfitTest) {
      console.log('❌ CFIT test not found');
      process.exit(1);
    }

    console.log(`Found CFIT test: ${cfitTest.name} (${cfitTest.id})\n`);

    // Parse existing questions
    let questions = cfitTest.questions;
    if (typeof questions === 'string') {
      questions = JSON.parse(questions);
    }

    console.log(`Current questions count: ${questions.length}\n`);

    // Prepare new questions with instructions
    const newQuestions = [];

    // ============ SUBTEST 1: SERIES ============
    newQuestions.push({
      id: 'series_instruction',
      type: 'instruction',
      subtest: 'series',
      title: 'PETUNJUK UNTUK TES 1',
      subtitle: 'SERIES - 12 Soal, 3 Menit',
      content: {
        intro: 'Pada tes ini, kamu akan melihat pola yang berkelanjutan. Tugasmu adalah memilih gambar yang melanjutkan pola tersebut.',
        examples: [
          {
            number: 1,
            description: 'Garis hitam tebal ini makin lama makin memanjang. Dapatkah kamu memilih salah satu dari 5 kotak sebelah kanan ini, sebagai lanjutan dari garis hitam tebal itu?',
            answer: '1',
            explanation: 'Jawabannya adalah kotak nomor 1, karena garis terus memanjang.',
            imagePath: '/psychology/cfit/examples/series_example_1.png'
          },
          {
            number: 2,
            description: 'Lihatlah antenna ini. Mula-mula melengkung ke kiri kemudian melengkung ke kanan, kemudian melengkung ke kiri lagi. Bagaimana selanjutnya?',
            answer: '3',
            explanation: 'Jawabannya adalah nomor 3, karena pola berulang: kiri-kanan-kiri-kanan.',
            imagePath: '/psychology/cfit/examples/series_example_2.png'
          },
          {
            number: 3,
            description: 'Lihatlah bagian yang hitam dalam lingkaran itu gerakannya seperti arah jarum jam. Mula-mula ada dipuncak, kemudian bergerak ke kanan. Bagaimana selanjutnya?',
            answer: '1',
            explanation: 'Jawabannya adalah nomor 1, karena bagian hitam bergerak searah jarum jam.',
            imagePath: '/psychology/cfit/examples/series_example_3.png'
          }
        ],
        rules: [
          'Setiap soal hanya ada satu jawaban yang benar',
          'Mulailah dari soal nomor 1 terus sampai nomor 12',
          'Bekerjalah dengan teliti dan secepat-cepatnya',
          'Perhatikan pola yang berulang atau berkembang'
        ],
        timeLimit: 180
      }
    });

    // Add series questions (existing)
    const seriesQuestions = questions.filter(q => q.subtest === 'series' && q.type === 'question');
    newQuestions.push(...seriesQuestions);

    // ============ SUBTEST 2: CLASSIFICATION ============
    newQuestions.push({
      id: 'classification_instruction',
      type: 'instruction',
      subtest: 'classification',
      title: 'PETUNJUK UNTUK TES 2',
      subtitle: 'KLASIFIKASI - 14 Soal, 4 Menit',
      content: {
        intro: 'Pada tes ini, kamu akan melihat 5 buah kotak bergambar. 4 buah gambar mengandung hal yang sama dan 1 gambar yang berbeda. Tugasmu adalah mencari gambar yang berbeda.',
        examples: [
          {
            number: 1,
            description: 'Kamu lihat ada 5 buah kotak bergambar. 4 buah gambar mengandung hal yang sama dan 1 gambar yang berbeda. Yang manakah gambar yang berbeda itu?',
            answer: '4',
            explanation: 'Kotak nomor 4. Yang satu ini gambarnya tegak, sedangkan 4 lainnya melintang.',
            imagePath: '/psychology/cfit/examples/classification_example_1.png'
          },
          {
            number: 2,
            description: 'Yang manakah kotak yang berbeda diantara kotak lainnya?',
            answer: '1',
            explanation: 'Nomor 1. Gambar lingkaran itu berwarna hitam, sedangkan yang lain berwarna putih. Walaupun lingkaran putih berbeda-beda besarnya, tetapi tetap sama berwarna putih.',
            imagePath: '/psychology/cfit/examples/classification_example_2.png'
          }
        ],
        rules: [
          'Selalu ada satu kotak yang berisi gambar berbeda',
          'Carilah perbedaan mendasar: bentuk, warna, orientasi, ukuran',
          'Fokus pada karakteristik yang membedakan satu gambar dari yang lain',
          'Jangan terburu-buru, perhatikan detail dengan teliti'
        ],
        timeLimit: 240
      }
    });

    // Add classification questions
    const classificationQuestions = questions.filter(q => q.subtest === 'classification' && q.type === 'question');
    newQuestions.push(...classificationQuestions);

    // ============ SUBTEST 3: MATRICES ============
    newQuestions.push({
      id: 'matrices_instruction',
      type: 'instruction',
      subtest: 'matrices',
      title: 'PETUNJUK UNTUK TES 3',
      subtitle: 'MATRIKS - 12 Soal, 3 Menit',
      content: {
        intro: 'Pada tes ini, kamu akan melihat sebuah kotak besar berisi pola. Ada satu kotak kecil yang masih kosong. Tugasmu adalah memilih gambar yang tepat untuk mengisi kotak kosong tersebut.',
        examples: [
          {
            number: 1,
            description: 'Ada sebuah kotak besar dengan 3 kotak kecil bergambar titik-titik. Ada 1 kotak kecil yang masih kosong. Yang mana diantara 5 kotak di sebelah kanan yang tepat untuk mengisi kotak kosong?',
            answer: '3',
            explanation: 'Kotak nomor 3, karena melengkapi pola dengan benar.',
            imagePath: '/psychology/cfit/examples/matrices_example_1.png'
          },
          {
            number: 2,
            description: 'Yang manakah yang tepat untuk mengisi kotak kecil yang masih kosong itu?',
            answer: '1',
            explanation: 'Nomor 1 adalah jawaban yang benar.',
            imagePath: '/psychology/cfit/examples/matrices_example_2.png'
          },
          {
            number: 3,
            description: 'Kamu dapat memilih jawaban yang benar. Yang manakah?',
            answer: '4',
            explanation: 'Nomor 4 adalah jawaban yang tepat.',
            imagePath: '/psychology/cfit/examples/matrices_example_3.png'
          }
        ],
        rules: [
          'Pilihlah satu kotak yang tepat untuk mengisi kotak kosong',
          'Perhatikan pola horizontal (baris) dan vertikal (kolom)',
          'Pola biasanya berulang atau berkembang secara konsisten',
          'Bekerjalah dari nomor 1 sampai dengan nomor 12'
        ],
        timeLimit: 180
      }
    });

    // Add matrices questions
    const matricesQuestions = questions.filter(q => q.subtest === 'matrices' && q.type === 'question');
    newQuestions.push(...matricesQuestions);

    // ============ SUBTEST 4: TOPOLOGY ============
    newQuestions.push({
      id: 'topology_instruction',
      type: 'instruction',
      subtest: 'topology',
      title: 'PETUNJUK UNTUK TES 4',
      subtitle: 'KONDISI/TOPOLOGI - 8 Soal, 2½ Menit',
      content: {
        intro: 'Pada tes ini, kamu harus MEMBAYANGKAN penempatan titik sesuai dengan kondisi yang ditentukan. JANGAN membuat titik di layar atau kertas.',
        examples: [
          {
            number: 1,
            description: 'Di dalam kotak ada lingkaran, titik, dan segiempat. Titik terletak di dalam lingkaran tetapi di luar segiempat. Carilah gambar yang memungkinkan penempatan titik dengan kondisi yang sama.',
            answer: '3',
            explanation: 'Nomor 3. Pada gambar ini, titik bisa ditempatkan di dalam lingkaran tetapi di luar segiempat.',
            imagePath: '/psychology/cfit/examples/topology_example_1.png'
          },
          {
            number: 2,
            description: 'Titik terletak di dalam bulat telur tetapi di bawah garis. BAYANGKAN, pada kotak mana titik bisa ditempatkan dengan kondisi yang sama?',
            answer: '2',
            explanation: 'Nomor 2. Gambar ini memungkinkan titik ditempatkan di dalam bulat telur tetapi di bawah garis.',
            imagePath: '/psychology/cfit/examples/topology_example_2.png'
          },
          {
            number: 3,
            description: 'Titik terletak di pertemuan antara dua segiempat tetapi di luar lingkaran.',
            answer: '3',
            explanation: 'Nomor 3 adalah satu-satunya kemungkinan di mana titik dapat ditempatkan di pertemuan dua segiempat tetapi di luar lingkaran.',
            imagePath: '/psychology/cfit/examples/topology_example_3.png'
          }
        ],
        rules: [
          'Lihatlah letak titik pada kotak di sebelah kiri',
          'Bayangkan penempatan titik yang sama di salah satu pilihan',
          'Gunakan imajinasi visual, jangan membuat tanda apapun',
          'Perhatikan hubungan spasial antara titik dan bentuk-bentuk lain'
        ],
        warnings: [
          '⚠️ PENTING: Jangan membuat tanda apapun di layar!',
          '⚠️ Bayangkan saja posisi titik secara mental.'
        ],
        timeLimit: 150
      }
    });

    // Add topology questions
    const topologyQuestions = questions.filter(q => q.subtest === 'topology' && q.type === 'question');
    newQuestions.push(...topologyQuestions);

    console.log('New structure:');
    console.log('- Series: 1 instruction + ' + seriesQuestions.length + ' questions');
    console.log('- Classification: 1 instruction + ' + classificationQuestions.length + ' questions');
    console.log('- Matrices: 1 instruction + ' + matricesQuestions.length + ' questions');
    console.log('- Topology: 1 instruction + ' + topologyQuestions.length + ' questions');
    console.log(`Total items: ${newQuestions.length}\n`);

    // Update test
    cfitTest.questions = newQuestions;
    await cfitTest.save();

    console.log('✅ CFIT test updated successfully!\n');
    console.log('='.repeat(60));
    console.log('Instructions added for all 4 subtests');
    console.log('Frontend can now render instruction pages before each subtest');
    console.log('='.repeat(60));

    process.exit(0);

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

main();
