// Love Language Test Configuration
// Based on Gary Chapman's 5 Love Languages

/**
 * Scoring configuration for Love Language Test
 * Maps answer options to love language categories
 */
export const scoringConfig = {
  A: 'Words of Affirmation',
  B: 'Quality Time',
  C: 'Receiving Gifts',
  D: 'Acts of Service',
  E: 'Physical Touch'
}

/**
 * Love Language descriptions and details
 */
export const loveLanguages = {
  A: {
    code: 'A',
    name: 'Words of Affirmation',
    nameId: 'Kata-kata Penegasan',
    description: 'People with this love language value verbal acknowledgments of affection, including frequent "I love you\'s," compliments, words of appreciation, verbal encouragement, and often frequent digital communication like texting and social media engagement.',
    descriptionId: 'Orang dengan bahasa cinta ini menghargai pengakuan verbal atas kasih sayang, termasuk sering mengucapkan "Aku cinta kamu", pujian, kata-kata apresiasi, dorongan verbal, dan sering berkomunikasi digital seperti pesan teks dan interaksi media sosial.',
    characteristics: [
      'Appreciates verbal compliments and praise',
      'Values encouraging words and affirmation',
      'Feels loved when hearing "I love you" and other expressions of love',
      'Enjoys written notes, texts, and love letters',
      'Sensitive to harsh words or criticism'
    ],
    characteristicsId: [
      'Menghargai pujian dan apresiasi verbal',
      'Menghargai kata-kata dorongan dan penegasan',
      'Merasa dicintai saat mendengar "Aku cinta kamu" dan ekspresi cinta lainnya',
      'Menyukai catatan tertulis, pesan teks, dan surat cinta',
      'Sensitif terhadap kata-kata kasar atau kritik'
    ],
    icon: 'message-circle',
    color: '#3B82F6' // blue
  },
  B: {
    code: 'B',
    name: 'Quality Time',
    nameId: 'Waktu Berkualitas',
    description: 'People whose love language is quality time feel most loved when their partner wants to actively spend time with them and gives them undivided attention. They value togetherness, eye contact, active listening, and quality conversation.',
    descriptionId: 'Orang yang bahasa cintanya waktu berkualitas merasa paling dicintai ketika pasangan mereka ingin secara aktif menghabiskan waktu bersama dan memberi mereka perhatian penuh. Mereka menghargai kebersamaan, kontak mata, mendengarkan aktif, dan percakapan berkualitas.',
    characteristics: [
      'Values undivided attention from their partner',
      'Enjoys activities done together',
      'Feels loved through quality conversations',
      'Appreciates being prioritized over distractions',
      'Hurt by cancelled plans or distracted partners'
    ],
    characteristicsId: [
      'Menghargai perhatian penuh dari pasangan',
      'Menikmati aktivitas yang dilakukan bersama',
      'Merasa dicintai melalui percakapan berkualitas',
      'Menghargai diprioritaskan di atas gangguan',
      'Terluka oleh rencana yang dibatalkan atau pasangan yang tidak fokus'
    ],
    icon: 'clock',
    color: '#10B981' // green
  },
  C: {
    code: 'C',
    name: 'Receiving Gifts',
    nameId: 'Menerima Hadiah',
    description: 'People who speak this love language thrive on the thoughtfulness behind a gift. It\'s not about the monetary value but about the symbolic thought behind the item. They treasure not only the gift itself but also the time and effort the giver put into it.',
    descriptionId: 'Orang yang berbicara bahasa cinta ini berkembang karena pemikiran di balik hadiah. Ini bukan tentang nilai moneter tetapi tentang pemikiran simbolis di balik barang tersebut. Mereka menghargai tidak hanya hadiah itu sendiri tetapi juga waktu dan usaha yang dikeluarkan pemberi.',
    characteristics: [
      'Values thoughtful gifts regardless of price',
      'Appreciates the effort and thought behind presents',
      'Treasures symbols of love and remembrance',
      'Feels loved through tangible expressions of affection',
      'Hurt when gifts are forgotten or thoughtless'
    ],
    characteristicsId: [
      'Menghargai hadiah yang penuh perhatian tanpa memandang harga',
      'Menghargai usaha dan pemikiran di balik hadiah',
      'Menghargai simbol cinta dan kenangan',
      'Merasa dicintai melalui ekspresi kasih sayang yang nyata',
      'Terluka ketika hadiah dilupakan atau tidak dipikirkan'
    ],
    icon: 'gift',
    color: '#F59E0B' // amber
  },
  D: {
    code: 'D',
    name: 'Acts of Service',
    nameId: 'Tindakan Pelayanan',
    description: 'For people whose love language is acts of service, actions speak louder than words. They feel most loved when partners do helpful things for them, like cooking a meal, doing laundry, or running errands. These actions show that you care and want to make their life easier.',
    descriptionId: 'Bagi orang yang bahasa cintanya adalah tindakan pelayanan, tindakan lebih bermakna daripada kata-kata. Mereka merasa paling dicintai ketika pasangan melakukan hal-hal yang membantu untuk mereka, seperti memasak makanan, mencuci pakaian, atau menjalankan tugas. Tindakan ini menunjukkan bahwa Anda peduli dan ingin membuat hidup mereka lebih mudah.',
    characteristics: [
      'Values when partners help with tasks and chores',
      'Feels loved through helpful actions',
      'Appreciates when someone eases their workload',
      'Actions speak louder than words for them',
      'Hurt by laziness or broken commitments'
    ],
    characteristicsId: [
      'Menghargai ketika pasangan membantu tugas dan pekerjaan rumah',
      'Merasa dicintai melalui tindakan yang membantu',
      'Menghargai ketika seseorang meringankan beban kerja mereka',
      'Tindakan lebih bermakna daripada kata-kata bagi mereka',
      'Terluka oleh kemalasan atau komitmen yang dilanggar'
    ],
    icon: 'heart-handshake',
    color: '#8B5CF6' // purple
  },
  E: {
    code: 'E',
    name: 'Physical Touch',
    nameId: 'Sentuhan Fisik',
    description: 'People with physical touch as their love language feel most loved when they receive physical signs of affection, including kissing, holding hands, cuddling on the couch, and sex. Physical presence and accessibility are crucial for them.',
    descriptionId: 'Orang dengan sentuhan fisik sebagai bahasa cinta mereka merasa paling dicintai ketika mereka menerima tanda-tanda kasih sayang fisik, termasuk ciuman, berpegangan tangan, berpelukan di sofa, dan hubungan intim. Kehadiran fisik dan aksesibilitas sangat penting bagi mereka.',
    characteristics: [
      'Values physical closeness and touch',
      'Feels loved through hugs, kisses, and holding hands',
      'Appreciates physical presence and proximity',
      'Touch communicates love, security, and belonging',
      'Hurt by physical neglect or long periods without touch'
    ],
    characteristicsId: [
      'Menghargai kedekatan fisik dan sentuhan',
      'Merasa dicintai melalui pelukan, ciuman, dan berpegangan tangan',
      'Menghargai kehadiran fisik dan kedekatan',
      'Sentuhan mengkomunikasikan cinta, keamanan, dan rasa memiliki',
      'Terluka oleh pengabaian fisik atau periode panjang tanpa sentuhan'
    ],
    icon: 'hand-heart',
    color: '#EF4444' // red
  }
}

/**
 * Test configuration
 */
export const testConfig = {
  code: 'LOVE_LANGUAGE',
  name: '5 Love Languages Test',
  nameId: '5 Bahasa Cinta',
  totalQuestions: 30,
  category: 'personality',
  description: 'The Love Language Test helps you discover your primary love language based on Gary Chapman\'s theory of the Five Love Languages.',
  descriptionId: 'Tes 5 Bahasa Cinta digunakan untuk mengetahui cara seseorang paling merasa dicintai dalam sebuah hubungan. Tes ini terdiri dari 30 pasang pernyataan dengan format forced choice.'
}

/**
 * Question scale mapping for forced choice format
 * Each question has scaleA (for answer A) and scaleB (for answer B)
 */
export const questionScaleMapping = {
  1: { scaleA: 'A', scaleB: 'E' },
  2: { scaleA: 'B', scaleB: 'D' },
  3: { scaleA: 'E', scaleB: 'B' },
  4: { scaleA: 'D', scaleB: 'E' },
  5: { scaleA: 'E', scaleB: 'C' },
  6: { scaleA: 'B', scaleB: 'E' },
  7: { scaleA: 'C', scaleB: 'A' },
  8: { scaleA: 'E', scaleB: 'A' },
  9: { scaleA: 'B', scaleB: 'C' },
  10: { scaleA: 'A', scaleB: 'D' },
  11: { scaleA: 'B', scaleB: 'A' },
  12: { scaleA: 'D', scaleB: 'E' },
  13: { scaleA: 'A', scaleB: 'C' },
  14: { scaleA: 'B', scaleB: 'E' },
  15: { scaleA: 'A', scaleB: 'D' },
  16: { scaleA: 'E', scaleB: 'B' },
  17: { scaleA: 'D', scaleB: 'C' },
  18: { scaleA: 'A', scaleB: 'B' },
  19: { scaleA: 'E', scaleB: 'D' },
  20: { scaleA: 'D', scaleB: 'C' },
  21: { scaleA: 'B', scaleB: 'D' },
  22: { scaleA: 'C', scaleB: 'A' },
  23: { scaleA: 'C', scaleB: 'D' },
  24: { scaleA: 'B', scaleB: 'C' },
  25: { scaleA: 'D', scaleB: 'B' },
  26: { scaleA: 'E', scaleB: 'C' },
  27: { scaleA: 'A', scaleB: 'B' },
  28: { scaleA: 'C', scaleB: 'E' },
  29: { scaleA: 'D', scaleB: 'A' },
  30: { scaleA: 'E', scaleB: 'A' }
}

/**
 * Calculate Love Language scores from answers
 * Uses forced choice format where answer A/B maps to different scales per question
 * @param {Object} answers - Answer object with question number as key and answer data as value
 * @param {Object} questions - Optional questions array with scaleA/scaleB mapping (from test type config)
 * @returns {Object} Calculated scores and percentages
 */
export function calculateLoveLanguageScores(answers, questions = null) {
  // Initialize counters for each love language scale
  const scaleCount = {
    A: 0, // Words of Affirmation
    B: 0, // Quality Time
    C: 0, // Receiving Gifts
    D: 0, // Acts of Service
    E: 0  // Physical Touch
  }

  // Build scale mapping from questions if provided, otherwise use default
  let scaleMapping = questionScaleMapping
  if (questions && Array.isArray(questions)) {
    scaleMapping = {}
    questions.forEach(q => {
      scaleMapping[q.id] = { scaleA: q.scaleA, scaleB: q.scaleB }
    })
  }

  // Count occurrences based on answer choice and question scale mapping
  Object.entries(answers).forEach(([questionId, item]) => {
    const answer = item?.answer || item
    const qId = parseInt(questionId)
    const mapping = scaleMapping[qId]
    
    if (mapping) {
      // Map answer A/B to the actual scale based on question configuration
      let scale = null
      if (answer === 'A') {
        scale = mapping.scaleA
      } else if (answer === 'B') {
        scale = mapping.scaleB
      }
      
      // Increment the appropriate scale counter
      if (scale && ['A', 'B', 'C', 'D', 'E'].includes(scale)) {
        scaleCount[scale]++
      }
    }
  })

  // Calculate total answered questions
  const totalAnswered = Object.values(scaleCount).reduce((sum, count) => sum + count, 0)
  const totalQuestions = testConfig.totalQuestions

  // Calculate percentages and create results
  const results = Object.entries(scaleCount).map(([letter, count]) => {
    const percentage = totalAnswered > 0 ? (count / totalAnswered) * 100 : 0
    const config = loveLanguages[letter]
    
    return {
      code: letter,
      name: config.name,
      nameId: config.nameId,
      count,
      percentage: Math.round(percentage * 100) / 100,
      description: config.description,
      descriptionId: config.descriptionId,
      characteristics: config.characteristics,
      characteristicsId: config.characteristicsId,
      icon: config.icon,
      color: config.color
    }
  })

  // Sort by percentage (highest first)
  results.sort((a, b) => b.percentage - a.percentage)

  // Determine primary and secondary love languages
  const primary = results[0]
  const secondary = results[1]

  return {
    results,
    primary,
    secondary,
    scaleCount,
    totalAnswered,
    totalQuestions
  }
}

/**
 * Get interpretation based on score distribution
 * @param {Object} scoreData - The calculated score data
 * @returns {Object} Interpretation text
 */
export function getInterpretation(scoreData) {
  const { primary, secondary, results } = scoreData
  
  // Check if there's a clear dominant language
  const diff = primary.percentage - secondary.percentage
  
  let dominanceLevel = 'balanced'
  let interpretationId = ''
  let interpretation = ''
  
  if (diff >= 20) {
    dominanceLevel = 'strong'
    interpretation = `Your primary love language is clearly ${primary.name}. This is your dominant way of receiving and expressing love.`
    interpretationId = `Bahasa cinta utama Anda dengan jelas adalah ${primary.nameId}. Ini adalah cara dominan Anda dalam menerima dan mengekspresikan cinta.`
  } else if (diff >= 10) {
    dominanceLevel = 'moderate'
    interpretation = `Your primary love language is ${primary.name}, with ${secondary.name} as a close secondary. You appreciate both forms of love expression.`
    interpretationId = `Bahasa cinta utama Anda adalah ${primary.nameId}, dengan ${secondary.nameId} sebagai sekunder yang dekat. Anda menghargai kedua bentuk ekspresi cinta.`
  } else {
    dominanceLevel = 'balanced'
    interpretation = `You have a balanced appreciation for multiple love languages, with ${primary.name} and ${secondary.name} being slightly more prominent.`
    interpretationId = `Anda memiliki apresiasi yang seimbang untuk berbagai bahasa cinta, dengan ${primary.nameId} dan ${secondary.nameId} sedikit lebih menonjol.`
  }
  
  return {
    dominanceLevel,
    interpretation,
    interpretationId,
    primaryDescription: primary.description,
    primaryDescriptionId: primary.descriptionId,
    secondaryDescription: secondary.description,
    secondaryDescriptionId: secondary.descriptionId
  }
}

export default {
  scoringConfig,
  loveLanguages,
  testConfig,
  questionScaleMapping,
  calculateLoveLanguageScores,
  getInterpretation
}
