# Psychology Module - API Format Guide

## Create Test Type - Request Body Format

### Endpoint
```
POST /api/v1/psychology/test-types
Authorization: Bearer {{jwt_token}}
Content-Type: application/json
```

---

## PAPI Kostick Format

### Full Request Body
```json
{
  "code": "PAPI_KOSTICK",
  "name": "PAPI Kostick",
  "description": "Personality and Preference Inventory - measures 20 personality dimensions",
  "category": "personality",
  "estimatedMinutes": 30,
  "questions": [
    // Copy from papi-transformed.json → questions array
  ],
  "scoringConfig": {
    "scales": ["G","E","A","N","P","X","B","O","Z","K","F","W","C","L","I","T","V","S","R","D"],
    "maxPerScale": 9
  },
  "isActive": true
}
```

### Question Format (PAPI)
```json
{
  "id": 1,
  "textA": "Saya seorang pekerja giat",
  "textB": "Saya Bukan Seorang Pemurung",
  "scaleA": "G",
  "scaleB": "E"
}
```

### PAPI Scales (20)
| Scale | Label |
|-------|-------|
| G | Hard Working / Pekerja Keras |
| E | Emotional Control / Pengendalian Emosi |
| A | Need to Achieve / Kebutuhan Berprestasi |
| N | Need for Rules / Kebutuhan Mengikuti Aturan |
| P | Need for Attention / Kebutuhan diperhatikan |
| X | Need for Change / Kebutuhan Perubahan |
| B | Need to Belong / Kebutuhan Diterima Kelompok |
| O | Need to be Close / Kebutuhan Kedekatan |
| Z | Need for Affection / Kebutuhan Kasih Sayang |
| K | Need for Aggression / Kebutuhan Agresi |
| F | Need for Fairness / Kebutuhan Keadilan |
| W | Need for Independence / Kebutuhan Mandiri |
| C | Need for Order / Kerapihan |
| L | Leadership / Kepemimpinan |
| I | Ease in Decision Making / Kemudahan Mengambil Keputusan |
| T | Pace / Kecepatan Kerja |
| V | Vigor / Semangat Kerja |
| S | Social Extension / Keterbukaan Sosial |
| R | Need for Support / Kebutuhan Dukungan |
| D | Attention to Detail / Perhatian Detail |

---

## EPPS Format

### Full Request Body
```json
{
  "code": "EPPS",
  "name": "Edwards Personal Preference Schedule",
  "description": "Measures 15 psychological needs based on Henry Murray's theory",
  "category": "personality",
  "estimatedMinutes": 45,
  "questions": [
    // Copy from epps-transformed.json → questions array
  ],
  "scoringConfig": {
    "needs": ["ach","def","ord","exh","aut","aff","int","suc","dom","aba","nur","chg","end","het","agg"],
    "consistency": ["BD", "BH", "S"]
  },
  "isActive": true
}
```

### Question Format (EPPS)
```json
{
  "id": 1,
  "textA": "Saya ingin menolong teman-teman saya, bila mereka berada dalam kesulitan.",
  "textB": "Saya ingin berkarya dan bekerja sebaik mungkin.",
  "rowIdx": 1,
  "colIdx": 1,
  "matrixGroup": "1"
}
```

> **Note:** EPPS menggunakan `rowIdx`, `colIdx`, dan `matrixGroup` untuk referensi posisi dalam matriks.
> Frontend **tidak perlu** menentukan need dari setiap statement.
> Backend scoringService akan menghitung score berdasarkan EPPS matrix lookup.

### EPPS Needs (15)
| Need | Label |
|------|-------|
| ach | Achievement - Kebutuhan Berprestasi |
| def | Deference - Kebutuhan Menghormati |
| ord | Order - Kebutuhan Keteraturan |
| exh | Exhibition - Kebutuhan Menonjolkan Diri |
| aut | Autonomy - Kebutuhan Otonomi |
| aff | Affiliation - Kebutuhan Berafiliasi |
| int | Intraception - Kebutuhan Introspeksi |
| suc | Succorance - Kebutuhan Mendapat Pertolongan |
| dom | Dominance - Kebutuhan Dominasi |
| aba | Abasement - Kebutuhan Merendah |
| nur | Nurturance - Kebutuhan Menolong |
| chg | Change - Kebutuhan Perubahan |
| end | Endurance - Kebutuhan Ketekunan |
| het | Heterosexuality - Kebutuhan Heteroseksual |
| agg | Aggression - Kebutuhan Agresi |

---

## Quick Copy-Paste Guide

### Step 1: Read transformed file
```bash
# PAPI
cat docs/soalPsikolog/papi-transformed.json

# EPPS  
cat docs/soalPsikolog/epps-transformed.json
```

### Step 2: Create request in Postman

**For PAPI:**
1. Copy entire content from `papi-transformed.json`
2. In Postman body, create JSON:
```json
{
  "code": "PAPI_KOSTICK",
  "name": "PAPI Kostick", 
  "description": "Personality and Preference Inventory",
  "category": "personality",
  "estimatedMinutes": 30,
  "questions": <PASTE questions array here>,
  "scoringConfig": {
    "scales": ["G","E","A","N","P","X","B","O","Z","K","F","W","C","L","I","T","V","S","R","D"],
    "maxPerScale": 9
  },
  "isActive": true
}
```

**For EPPS:**
1. Copy entire content from `epps-transformed.json`
2. In Postman body, create JSON:
```json
{
  "code": "EPPS",
  "name": "Edwards Personal Preference Schedule",
  "description": "Measures 15 psychological needs",
  "category": "personality", 
  "estimatedMinutes": 45,
  "questions": <PASTE questions array here>,
  "scoringConfig": {
    "needs": ["ach","def","ord","exh","aut","aff","int","suc","dom","aba","nur","chg","end","het","agg"],
    "consistency": ["BD", "BH", "S"],
    "matrixBased": true
  },
  "isActive": true
}
```

> **Frontend Developer Note:**
> - EPPS questions berisi `rowIdx`, `colIdx`, `matrixGroup` sebagai metadata
> - Frontend cukup tampilkan `textA` dan `textB`, biarkan user pilih A atau B
> - Backend akan menghitung score menggunakan EPPS matrix lookup

---

## Using Transform Scripts

If you have new question data in legacy format:

```bash
# Transform PAPI questions
node scripts/transformPapiQuestions.js

# Transform EPPS questions  
node scripts/transformEppsQuestions.js
```

Input files:
- `docs/soalPsikolog/papiKostick_test.json`
- `docs/soalPsikolog/epps.json`

Output files:
- `docs/soalPsikolog/papi-transformed.json`
- `docs/soalPsikolog/epps-transformed.json`

---

## Validation

API will validate:
- **PAPI**: 90 questions, scales must be valid (G,E,A,N,P,X,B,O,Z,K,F,W,C,L,I,T,V,S,R,D)
- **EPPS**: 225 questions, needs must be valid (ach,def,ord,exh,aut,aff,int,suc,dom,aba,nur,chg,end,het,agg)

Validation errors will be returned with details:
```json
{
  "success": false,
  "message": "Question validation failed",
  "errors": [
    "Question 5: invalid scaleA \"X\"",
    "Question 10: textB is required"
  ],
  "stats": {
    "total": 90,
    "valid": 88,
    "invalid": 2
  }
}
```
