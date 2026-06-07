# CFIT Instruction Pages - Frontend Integration Guide

## Overview

CFIT test sekarang memiliki instruction pages yang muncul sebelum setiap subtest dimulai. Setiap subtest (Series, Classification, Matrices, Topology) memiliki halaman instruksi dengan contoh soal, aturan, dan peringatan.

## Data Structure

### Instruction Item Format

Setiap instruction item dalam array `questions` memiliki struktur:

```json
{
  "id": "series_instruction",
  "type": "instruction",
  "title": "PETUNJUK UNTUK TES 1",
  "subtitle": "SERIES - 12 Soal, 3 Menit",
  "subtest": "series",
  "content": {
    "intro": "Pada tes ini, kamu akan melihat pola yang berkelanjutan...",
    "examples": [
      {
        "number": 1,
        "description": "Garis hitam tebal ini makin lama makin memanjang...",
        "answer": "1",
        "explanation": "Jawabannya adalah kotak nomor 1, karena garis terus memanjang.",
        "imagePath": "/psychology/cfit/examples/series_example_1.png"
      },
      // ... more examples
    ],
    "rules": [
      "Setiap soal hanya ada satu jawaban yang benar",
      "Mulailah dari soal nomor 1 terus sampai nomor 12",
      "Bekerjalah dengan teliti dan secepat-cepatnya",
      "Perhatikan pola yang berulang atau berkembang"
    ],
    "warnings": [
      // Only for topology subtest
      "Jangan tandai atau menggambar pada layar/kertas",
      "Bayangkan dalam pikiran saja"
    ],
    "timeLimit": 180
  }
}
```

### Question Item Format

Regular question items tetap seperti sebelumnya:

```json
{
  "id": "cfit_series_1",
  "type": "question",
  "number": 1,
  "subtest": "series",
  "imagePath": "/psychology/cfit/subtes1/1.png",
  "correctAnswer": "A"
}
```

## Implementation Steps

### 1. Detect Instruction Items

Ketika mengiterasi array questions, check tipe item:

```javascript
const renderItem = (item, index) => {
  if (item.type === 'instruction') {
    return <InstructionPage key={item.id} instruction={item} onContinue={handleContinue} />;
  } else {
    return <QuestionPage key={item.id} question={item} onAnswer={handleAnswer} />;
  }
};
```

### 2. Create InstructionPage Component

```jsx
import React from 'react';

const InstructionPage = ({ instruction, onContinue }) => {
  const { title, subtitle, content } = instruction;
  const { intro, examples, rules, warnings, timeLimit } = content;

  // Format time limit untuk display
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${minutes} menit ${secs} detik` : `${minutes} menit`;
  };

  return (
    <div className="instruction-page">
      {/* Header */}
      <div className="instruction-header">
        <h1>{title}</h1>
        <h2>{subtitle}</h2>
      </div>

      {/* Introduction */}
      <div className="instruction-intro">
        <p>{intro}</p>
        <div className="time-info">
          <span>⏱️ Waktu: {formatTime(timeLimit)}</span>
        </div>
      </div>

      {/* Examples Section */}
      <div className="instruction-examples">
        <h3>Contoh Soal:</h3>
        {examples.map((example) => (
          <div key={example.number} className="example-item">
            <div className="example-header">
              <strong>Contoh {example.number}:</strong>
            </div>
            {example.imagePath && (
              <img 
                src={example.imagePath} 
                alt={`Contoh ${example.number}`}
                className="example-image"
              />
            )}
            <p className="example-description">{example.description}</p>
            <div className="example-answer">
              <span className="answer-badge">Jawaban: {example.answer}</span>
              <p className="explanation">{example.explanation}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Rules Section */}
      <div className="instruction-rules">
        <h3>Aturan Pengerjaan:</h3>
        <ul>
          {rules.map((rule, index) => (
            <li key={index}>{rule}</li>
          ))}
        </ul>
      </div>

      {/* Warnings Section (only for topology) */}
      {warnings && warnings.length > 0 && (
        <div className="instruction-warnings">
          <h3>⚠️ Perhatian:</h3>
          <ul>
            {warnings.map((warning, index) => (
              <li key={index} className="warning-item">{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Continue Button */}
      <div className="instruction-footer">
        <button 
          className="btn-continue" 
          onClick={onContinue}
        >
          Saya Mengerti, Mulai Tes
        </button>
      </div>
    </div>
  );
};

export default InstructionPage;
```

### 3. Handle Continue Action

Ketika user klik "Saya Mengerti, Mulai Tes":

```javascript
const handleContinue = () => {
  // 1. Tandai instruction sebagai selesai
  setCurrentItemIndex(currentItemIndex + 1);
  
  // 2. Mulai timer untuk subtest
  const currentSubtest = questions[currentItemIndex].subtest;
  const timeLimit = questions[currentItemIndex].content.timeLimit;
  startSubtestTimer(currentSubtest, timeLimit);
  
  // 3. Navigate ke soal pertama subtest
  // currentItemIndex akan otomatis menunjuk ke question pertama
  // karena question array sudah terstruktur: instruction → questions
};
```

### 4. Timer Management

Setiap subtest memiliki timer terpisah:

```javascript
const [subtestTimers, setSubtestTimers] = useState({
  series: null,
  classification: null,
  matrices: null,
  topology: null
});

const startSubtestTimer = (subtest, timeLimit) => {
  const timer = {
    startTime: Date.now(),
    timeLimit: timeLimit,
    endTime: Date.now() + (timeLimit * 1000)
  };
  
  setSubtestTimers(prev => ({
    ...prev,
    [subtest]: timer
  }));
  
  // Start countdown
  const interval = setInterval(() => {
    const now = Date.now();
    const remaining = timer.endTime - now;
    
    if (remaining <= 0) {
      clearInterval(interval);
      handleSubtestTimeout(subtest);
    } else {
      updateTimerDisplay(subtest, remaining);
    }
  }, 1000);
};
```

## Questions Array Flow

Array questions sekarang terstruktur seperti ini:

```
Index 0:  INSTRUCTION - Series
Index 1:  Question 1 (series)
Index 2:  Question 2 (series)
...
Index 12: Question 12 (series)
Index 13: INSTRUCTION - Classification
Index 14: Question 13 (classification)
...
Index 27: Question 26 (classification)
Index 28: INSTRUCTION - Matrices
Index 29: Question 27 (matrices)
...
Index 40: Question 38 (matrices)
Index 41: INSTRUCTION - Topology
Index 42: Question 39 (topology)
...
Index 49: Question 46 (topology)
```

## Styling Recommendations

### CSS Example

```css
.instruction-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
  background: #fff;
}

.instruction-header {
  text-align: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e0e0e0;
}

.instruction-header h1 {
  font-size: 1.8rem;
  color: #2c3e50;
  margin-bottom: 0.5rem;
}

.instruction-header h2 {
  font-size: 1.2rem;
  color: #7f8c8d;
  font-weight: 500;
}

.instruction-intro {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.time-info {
  margin-top: 1rem;
  padding: 0.75rem;
  background: #fff3cd;
  border-left: 4px solid #ffc107;
  font-weight: 600;
}

.instruction-examples {
  margin-bottom: 2rem;
}

.example-item {
  background: #f8f9fa;
  padding: 1.5rem;
  margin-bottom: 1rem;
  border-radius: 8px;
  border-left: 4px solid #3498db;
}

.example-image {
  width: 100%;
  max-width: 600px;
  height: auto;
  margin: 1rem 0;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.example-answer {
  margin-top: 1rem;
  padding: 1rem;
  background: #e8f5e9;
  border-radius: 4px;
}

.answer-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: #4caf50;
  color: white;
  border-radius: 4px;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.explanation {
  margin-top: 0.5rem;
  color: #2e7d32;
}

.instruction-rules {
  background: #e3f2fd;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.instruction-rules ul {
  list-style: none;
  padding-left: 0;
}

.instruction-rules li {
  padding: 0.5rem 0;
  padding-left: 1.5rem;
  position: relative;
}

.instruction-rules li:before {
  content: "✓";
  position: absolute;
  left: 0;
  color: #1976d2;
  font-weight: bold;
}

.instruction-warnings {
  background: #fff3e0;
  padding: 1.5rem;
  border-radius: 8px;
  border-left: 4px solid #ff9800;
  margin-bottom: 2rem;
}

.warning-item {
  color: #e65100;
  font-weight: 500;
}

.instruction-footer {
  text-align: center;
  margin-top: 3rem;
}

.btn-continue {
  padding: 1rem 3rem;
  font-size: 1.1rem;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s;
}

.btn-continue:hover {
  background: #45a049;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}
```

## User Experience Flow

1. **User membuka CFIT test** → Melihat instruction page untuk Series
2. **User membaca instruksi** → Contoh soal, aturan, time limit
3. **User klik "Saya Mengerti, Mulai Tes"** → Timer 3 menit dimulai
4. **User mengerjakan 12 soal Series** → Dengan timer countdown
5. **Setelah soal ke-12** → Melihat instruction page untuk Classification
6. **Repeat** untuk Matrices dan Topology

## Important Notes

### 1. Navigation Logic

- User **tidak bisa skip** instruction page
- User harus klik "Saya Mengerti, Mulai Tes" untuk melanjutkan
- Setelah klik, langsung navigate ke soal pertama subtest

### 2. Timer Behavior

- Timer **hanya dimulai** setelah user klik continue dari instruction
- Setiap subtest punya timer **terpisah**
- Jika waktu habis, otomatis pindah ke instruction subtest berikutnya

### 3. Progress Tracking

```javascript
// Track progress dengan memperhatikan instruction items
const getProgress = () => {
  const totalQuestions = questions.filter(q => q.type === 'question').length; // 46
  const answeredQuestions = answers.filter(a => a.answer !== null).length;
  return `${answeredQuestions}/${totalQuestions}`;
};
```

### 4. Save Progress

Ketika save progress, **skip instruction items**:

```javascript
const saveProgress = () => {
  const answersToSave = questions
    .filter(q => q.type === 'question') // Only save question answers
    .map(q => ({
      questionId: q.id,
      answer: userAnswers[q.id],
      duration: answerDurations[q.id],
      timestamp: answerTimestamps[q.id]
    }));
  
  // POST to /save endpoint
};
```

## API Response Structure

Ketika fetch questions dari API:

```javascript
GET /api/v1/psychology/public/access/{token}/session/{sessionId}/questions

Response:
{
  "success": true,
  "data": {
    "questions": [
      { type: "instruction", ... },  // Series instruction
      { type: "question", ... },     // Series Q1
      { type: "question", ... },     // Series Q2
      ...
      { type: "instruction", ... },  // Classification instruction
      { type: "question", ... },     // Classification Q1
      ...
    ]
  }
}
```

## Testing Checklist

- [ ] Instruction page tampil sebelum setiap subtest
- [ ] All content rendered correctly (title, subtitle, intro, examples, rules, warnings)
- [ ] Time limit info displayed dengan format yang benar
- [ ] Examples dengan nomor, description, answer, explanation tampil lengkap
- [ ] Button "Saya Mengerti, Mulai Tes" berfungsi
- [ ] Timer mulai setelah klik continue
- [ ] Navigate ke soal pertama setelah klik continue
- [ ] Warnings hanya muncul di Topology subtest
- [ ] Progress tracking tidak menghitung instruction items
- [ ] Save progress hanya menyimpan question answers, bukan instruction

## Import JSON File (Recommended)

Untuk environment baru atau update, gunakan file JSON yang sudah include instructions:

```
File: public/psychology/export/CFIT_v1.4_with_instructions.json
```

**Import via API:**
```bash
POST /api/v1/psychology/test-types/import?filename=CFIT_v1.4_with_instructions.json&overwrite=true
```

**Import via UI:**
1. Buka halaman Test Types
2. Klik "Import"
3. Pilih file `CFIT_v1.4_with_instructions.json`
4. Centang "Overwrite existing"
5. Klik "Import"

File ini sudah lengkap dengan:
- 4 instruction items (series, classification, matrices, topology)
- 46 question items dengan correct answers
- Complete metadata (answerSchema, scoringConfig, config)

**No need to run scripts!** File JSON ini self-contained dan portable.

## Support

Jika ada masalah atau pertanyaan tentang implementasi instruction pages, hubungi backend team atau check:
- **Import file**: `public/psychology/export/CFIT_v1.4_with_instructions.json`
- Backend docs: `docs/CFIT-SETUP-GUIDE.md`
- Database verification: Run `node verify-cfit-instructions.js`
- Raw data check: Run `node check-cfit-raw.js`

---

**Last Updated:** December 11, 2025  
**Backend Version:** v1.4 with CFIT Instructions  
**JSON Export:** CFIT_v1.4_with_instructions.json (50 items total)  
**Contact:** Backend Team
