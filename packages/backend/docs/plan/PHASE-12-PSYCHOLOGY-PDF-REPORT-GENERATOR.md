# Phase 12: Psychology Test PDF Report Generator

## Overview

Sistem untuk generate dan download hasil tes psikologi dalam format PDF. PDF di-generate menggunakan PDFKit library dengan native PDF generation, dengan caching maksimal 24 jam untuk optimasi performa.

## Business Requirements

1. **Download PDF** - Klien/peserta dapat download hasil tes dalam format PDF
2. **Professional Layout** - PDF dengan layout profesional, tabel skor, dan analisis visual
3. **Temporary Storage** - PDF disimpan maksimal 24 jam, kemudian dihapus
4. **Re-generate on Demand** - Jika PDF expired, generate ulang saat diminta
5. **Secure Access** - Hanya authorized users yang bisa download

---

## Architecture

### Technology Stack

- **PDF Library**: PDFKit (native PDF generation, no browser dependency)
- **Caching**: Database record + file storage
- **Cleanup**: Scheduled job untuk hapus expired files

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                      PDF GENERATION FLOW                             │
└─────────────────────────────────────────────────────────────────────┘

  ┌──────────┐         ┌──────────────┐         ┌─────────────────┐
  │ Frontend │────────▶│   Backend    │────────▶│ PsychologyReport│
  │ Request  │         │   API        │         │    Cache        │
  └──────────┘         └──────────────┘         └─────────────────┘
       │                      │                          │
       │   POST /reports/     │                          │
       │   :sessionId/pdf     │    Check cache           │
       │──────────────────────▶──────────────────────────▶
       │                      │                          │
       │                      │    Cache exists &        │
       │                      │    not expired?          │
       │                      │◀─────────────────────────│
       │                      │                          │
       │               ┌──────┴──────┐                   │
       │               │             │                   │
       │            YES│             │NO                 │
       │               ▼             ▼                   │
       │        ┌──────────┐  ┌──────────────┐          │
       │        │ Return   │  │ Generate PDF │          │
       │        │ Cached   │  │ (PDFKit)     │          │
       │        │ File     │  └──────────────┘          │
       │        └──────────┘         │                   │
       │               │             │                   │
       │               │      ┌──────▼──────┐           │
       │               │      │ Save to     │           │
       │               │      │ /uploads/   │           │
       │               │      │ psychology- │           │
       │               │      │ reports/    │           │
       │               │      └──────┬──────┘           │
       │               │             │                   │
       │               │      ┌──────▼──────┐           │
       │               │      │ Create      │           │
       │               │      │ Cache Record│           │
       │               │      └──────┬──────┘           │
       │               │             │                   │
       │               ▼             ▼                   │
       │◀──────────────────────────────────────────────│
       │         Return PDF (stream/download)           │
       │                                                │
```

### Cleanup Scheduler

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DAILY CLEANUP JOB (Cron)                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Schedule: Every day at 02:00 AM                                    │
│                                                                      │
│  1. Query PsychologyReportCache WHERE expiresAt < NOW()             │
│                                                                      │
│  2. For each expired record:                                        │
│     a. Delete file from disk: /uploads/reports/{tenantId}/xxx.pdf  │
│     b. Delete cache record from database                            │
│                                                                      │
│  3. Log cleanup summary:                                            │
│     - Files deleted: X                                              │
│     - Space freed: Y MB                                             │
│     - Errors: Z                                                     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Table: PsychologyReportCache

```sql
CREATE TABLE "PsychologyReportCaches" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL REFERENCES "Tenants"("id") ON DELETE CASCADE,
  "sessionId" UUID NOT NULL REFERENCES "PsychologySessions"("id") ON DELETE CASCADE,
  "reportType" VARCHAR(50) NOT NULL DEFAULT 'full',
  "filePath" VARCHAR(500) NOT NULL,
  "fileName" VARCHAR(255) NOT NULL,
  "fileSize" INTEGER,
  "mimeType" VARCHAR(100) DEFAULT 'application/pdf',
  "generatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
  "downloadCount" INTEGER DEFAULT 0,
  "lastDownloadedAt" TIMESTAMP WITH TIME ZONE,
  "metadata" JSONB DEFAULT '{}',
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT "unique_session_report_type" UNIQUE ("sessionId", "reportType")
);

CREATE INDEX "idx_report_cache_tenant" ON "PsychologyReportCaches"("tenantId");
CREATE INDEX "idx_report_cache_session" ON "PsychologyReportCaches"("sessionId");
CREATE INDEX "idx_report_cache_expires" ON "PsychologyReportCaches"("expiresAt");
```

### Report Types

| reportType | Description |
|------------|-------------|
| `full` | Complete report with all sections |
| `summary` | Executive summary only |
| `detailed` | Full report with raw data |
| `participant` | Simplified report for participant |

---

## File Structure

```
src/
├── modules/
│   └── psychology/
│       ├── controllers/
│       │   └── reportController.js      # PDF generation endpoints
│       ├── services/
│       │   ├── pdfGeneratorService.js   # Puppeteer PDF generation
│       │   └── reportCacheService.js    # Cache management
│       ├── templates/
│       │   ├── report-full.html         # Full report template
│       │   ├── report-summary.html      # Summary template
│       │   ├── partials/
│       │   │   ├── header.html
│       │   │   ├── footer.html
│       │   │   ├── chart-section.html
│       │   │   └── score-table.html
│       │   └── styles/
│       │       └── report.css           # Print-optimized CSS
│       └── routes/
│           └── report.routes.js
├── models/
│   └── PsychologyReportCache.js
├── migrations/
│   └── YYYYMMDD-create-psychology-report-cache.js
├── jobs/
│   └── cleanupExpiredReports.js         # Scheduled cleanup job
└── uploads/
    └── reports/
        └── {tenantId}/
            └── {sessionId}-{reportType}-{timestamp}.pdf
```

---

## API Endpoints

### 1. Generate/Download PDF Report

```
POST /api/v1/psychology/reports/:sessionId/pdf
```

**Request Body:**
```json
{
  "reportType": "full",           // full, summary, detailed, participant
  "forceRegenerate": false,       // Force regenerate even if cached
  "options": {
    "includeRawScores": true,
    "includeCharts": true,
    "includeRecommendations": true,
    "language": "id"              // id, en
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "downloadUrl": "/api/v1/psychology/reports/download/abc123",
    "fileName": "Psychology-Report-John-Doe-2025-12-02.pdf",
    "fileSize": 245678,
    "expiresAt": "2025-12-03T10:00:00Z",
    "cached": false
  }
}
```

### 2. Download PDF File

```
GET /api/v1/psychology/reports/download/:cacheId
```

**Response:** PDF file stream with headers:
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="Psychology-Report-xxx.pdf"
Content-Length: 245678
```

### 3. Check Report Status

```
GET /api/v1/psychology/reports/:sessionId/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "hasCache": true,
    "reportType": "full",
    "generatedAt": "2025-12-02T10:00:00Z",
    "expiresAt": "2025-12-03T10:00:00Z",
    "isExpired": false,
    "downloadCount": 3
  }
}
```

### 4. Delete Cached Report (Admin)

```
DELETE /api/v1/psychology/reports/:sessionId/cache
```

---

## PDF Generator Service

### Using Puppeteer

```javascript
// src/modules/psychology/services/pdfGeneratorService.js

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;
const Handlebars = require('handlebars');

class PDFGeneratorService {
  constructor() {
    this.browser = null;
    this.templatesDir = path.join(__dirname, '../templates');
  }

  /**
   * Initialize browser instance (singleton)
   */
  async getBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      });
    }
    return this.browser;
  }

  /**
   * Generate PDF from session data
   */
  async generateReport(sessionData, options = {}) {
    const {
      reportType = 'full',
      includeCharts = true,
      includeRawScores = false,
      language = 'id'
    } = options;

    // 1. Load template
    const templatePath = path.join(this.templatesDir, `report-${reportType}.html`);
    const templateContent = await fs.readFile(templatePath, 'utf-8');
    
    // 2. Compile template with Handlebars
    const template = Handlebars.compile(templateContent);
    const html = template({
      session: sessionData,
      options: { includeCharts, includeRawScores },
      generatedAt: new Date().toISOString(),
      language
    });

    // 3. Generate PDF with Puppeteer
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    // Wait for charts to render (if using Chart.js)
    if (includeCharts) {
      await page.waitForSelector('.chart-rendered', { timeout: 5000 }).catch(() => {});
    }

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      },
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="font-size: 10px; width: 100%; text-align: center; color: #666;">
          Psychology Assessment Report
        </div>
      `,
      footerTemplate: `
        <div style="font-size: 10px; width: 100%; text-align: center; color: #666;">
          Page <span class="pageNumber"></span> of <span class="totalPages"></span>
        </div>
      `
    });

    await page.close();
    
    return pdfBuffer;
  }

  /**
   * Save PDF to disk
   */
  async saveToDisk(pdfBuffer, tenantId, sessionId, reportType) {
    const uploadsDir = path.join(process.cwd(), 'uploads', 'reports', tenantId);
    await fs.mkdir(uploadsDir, { recursive: true });
    
    const timestamp = Date.now();
    const fileName = `${sessionId}-${reportType}-${timestamp}.pdf`;
    const filePath = path.join(uploadsDir, fileName);
    
    await fs.writeFile(filePath, pdfBuffer);
    
    return {
      filePath,
      fileName,
      fileSize: pdfBuffer.length
    };
  }

  /**
   * Close browser instance
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

module.exports = new PDFGeneratorService();
```

---

## HTML Template Structure

### Main Template (report-full.html)

```html
<!DOCTYPE html>
<html lang="{{language}}">
<head>
  <meta charset="UTF-8">
  <title>Psychology Assessment Report</title>
  <style>
    /* Print-optimized CSS */
    @page {
      size: A4;
      margin: 0;
    }
    
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 12px;
      line-height: 1.5;
      color: #333;
    }
    
    .page-break {
      page-break-after: always;
    }
    
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    
    .section {
      padding: 20px;
      margin-bottom: 20px;
    }
    
    .score-table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .score-table th,
    .score-table td {
      border: 1px solid #ddd;
      padding: 10px;
      text-align: left;
    }
    
    .chart-container {
      width: 100%;
      height: 300px;
      margin: 20px 0;
    }
    
    .recommendation-box {
      background: #f8f9fa;
      border-left: 4px solid #667eea;
      padding: 15px;
      margin: 10px 0;
    }
  </style>
  <!-- Chart.js for rendering charts -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
  <!-- Cover Page -->
  <div class="header">
    <h1>LAPORAN HASIL ASESMEN PSIKOLOGI</h1>
    <h2>{{session.package.name}}</h2>
    <p>{{session.participant.name}}</p>
    <p>Tanggal: {{formatDate generatedAt}}</p>
  </div>

  <div class="page-break"></div>

  <!-- Participant Info -->
  <div class="section">
    <h2>Data Peserta</h2>
    <table class="info-table">
      <tr><td>Nama</td><td>: {{session.participant.name}}</td></tr>
      <tr><td>Email</td><td>: {{session.participant.email}}</td></tr>
      <tr><td>Tanggal Tes</td><td>: {{formatDate session.startedAt}}</td></tr>
      <tr><td>Durasi</td><td>: {{session.duration}} menit</td></tr>
    </table>
  </div>

  <!-- Score Summary -->
  <div class="section">
    <h2>Ringkasan Hasil</h2>
    {{#each session.results}}
    <div class="result-item">
      <h3>{{this.testName}}</h3>
      <table class="score-table">
        <thead>
          <tr>
            <th>Dimensi</th>
            <th>Skor</th>
            <th>Kategori</th>
          </tr>
        </thead>
        <tbody>
          {{#each this.dimensions}}
          <tr>
            <td>{{this.name}}</td>
            <td>{{this.score}}</td>
            <td>{{this.category}}</td>
          </tr>
          {{/each}}
        </tbody>
      </table>
    </div>
    {{/each}}
  </div>

  {{#if options.includeCharts}}
  <!-- Charts Section -->
  <div class="section page-break">
    <h2>Visualisasi Hasil</h2>
    <div class="chart-container">
      <canvas id="radarChart"></canvas>
    </div>
  </div>
  
  <script>
    // Render chart after page load
    document.addEventListener('DOMContentLoaded', function() {
      const ctx = document.getElementById('radarChart').getContext('2d');
      new Chart(ctx, {
        type: 'radar',
        data: {{{json session.chartData}}},
        options: {
          responsive: true,
          maintainAspectRatio: false
        }
      });
      // Mark chart as rendered
      document.querySelector('.chart-container').classList.add('chart-rendered');
    });
  </script>
  {{/if}}

  <!-- Interpretations -->
  <div class="section">
    <h2>Interpretasi</h2>
    {{#each session.interpretations}}
    <div class="interpretation-item">
      <h3>{{this.title}}</h3>
      <p>{{this.description}}</p>
    </div>
    {{/each}}
  </div>

  <!-- Recommendations -->
  <div class="section">
    <h2>Rekomendasi</h2>
    {{#each session.recommendations}}
    <div class="recommendation-box">
      <strong>{{this.title}}</strong>
      <p>{{this.content}}</p>
    </div>
    {{/each}}
  </div>

  <!-- Footer -->
  <div class="section">
    <hr>
    <p style="font-size: 10px; color: #666;">
      Laporan ini dihasilkan secara otomatis oleh sistem pada {{formatDate generatedAt}}.
      Hasil asesmen ini bersifat rahasia dan hanya untuk kepentingan yang bersangkutan.
    </p>
  </div>
</body>
</html>
```

---

## Cleanup Scheduler

### Using node-cron

```javascript
// src/jobs/cleanupExpiredReports.js

const cron = require('node-cron');
const { PsychologyReportCache } = require('../models');
const { Op } = require('sequelize');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

class ReportCleanupJob {
  constructor() {
    this.isRunning = false;
  }

  /**
   * Start the cleanup scheduler
   * Runs daily at 2:00 AM
   */
  start() {
    cron.schedule('0 2 * * *', async () => {
      await this.cleanup();
    });
    
    logger.logInfo('Report cleanup job scheduled', {
      action: 'CLEANUP_JOB_SCHEDULED',
      schedule: '0 2 * * * (daily at 2:00 AM)'
    });
  }

  /**
   * Run cleanup manually (for testing or admin trigger)
   */
  async cleanup() {
    if (this.isRunning) {
      logger.logInfo('Cleanup job already running, skipping', {
        action: 'CLEANUP_JOB_SKIPPED'
      });
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();
    const stats = {
      filesDeleted: 0,
      recordsDeleted: 0,
      bytesFreed: 0,
      errors: []
    };

    try {
      logger.logInfo('Starting expired reports cleanup', {
        action: 'CLEANUP_JOB_STARTED'
      });

      // Find all expired cache records
      const expiredRecords = await PsychologyReportCache.findAll({
        where: {
          expiresAt: {
            [Op.lt]: new Date()
          }
        }
      });

      logger.logInfo(`Found ${expiredRecords.length} expired reports`, {
        action: 'CLEANUP_EXPIRED_FOUND',
        count: expiredRecords.length
      });

      // Delete each expired record and its file
      for (const record of expiredRecords) {
        try {
          // Delete file from disk
          const filePath = record.filePath;
          try {
            await fs.access(filePath);
            const fileStats = await fs.stat(filePath);
            stats.bytesFreed += fileStats.size;
            await fs.unlink(filePath);
            stats.filesDeleted++;
          } catch (fileErr) {
            if (fileErr.code !== 'ENOENT') {
              stats.errors.push({
                type: 'file_delete',
                recordId: record.id,
                error: fileErr.message
              });
            }
            // File doesn't exist, continue with record deletion
          }

          // Delete database record
          await record.destroy();
          stats.recordsDeleted++;

        } catch (err) {
          stats.errors.push({
            type: 'record_delete',
            recordId: record.id,
            error: err.message
          });
        }
      }

      // Cleanup empty tenant directories
      await this.cleanupEmptyDirectories();

      const duration = Date.now() - startTime;
      
      logger.logInfo('Report cleanup completed', {
        action: 'CLEANUP_JOB_COMPLETED',
        duration: `${duration}ms`,
        filesDeleted: stats.filesDeleted,
        recordsDeleted: stats.recordsDeleted,
        bytesFreed: `${(stats.bytesFreed / 1024 / 1024).toFixed(2)} MB`,
        errors: stats.errors.length
      });

      return stats;

    } catch (err) {
      logger.logError('Report cleanup job failed', {
        action: 'CLEANUP_JOB_FAILED',
        error: err.message,
        stack: err.stack
      });
      throw err;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Remove empty tenant directories
   */
  async cleanupEmptyDirectories() {
    const reportsDir = path.join(process.cwd(), 'uploads', 'reports');
    
    try {
      const tenantDirs = await fs.readdir(reportsDir);
      
      for (const dir of tenantDirs) {
        const tenantPath = path.join(reportsDir, dir);
        const stat = await fs.stat(tenantPath);
        
        if (stat.isDirectory()) {
          const files = await fs.readdir(tenantPath);
          if (files.length === 0) {
            await fs.rmdir(tenantPath);
          }
        }
      }
    } catch (err) {
      // Ignore errors, directory might not exist
    }
  }
}

module.exports = new ReportCleanupJob();
```

---

## Cache Service

```javascript
// src/modules/psychology/services/reportCacheService.js

const { PsychologyReportCache } = require('../../../models');
const { Op } = require('sequelize');

const CACHE_DURATION_HOURS = 24;

class ReportCacheService {
  /**
   * Get cached report if exists and not expired
   */
  async getCachedReport(sessionId, reportType = 'full') {
    const cache = await PsychologyReportCache.findOne({
      where: {
        sessionId,
        reportType,
        expiresAt: {
          [Op.gt]: new Date()
        }
      }
    });

    return cache;
  }

  /**
   * Create cache record for new PDF
   */
  async createCacheRecord(data) {
    const { tenantId, sessionId, reportType, filePath, fileName, fileSize, metadata } = data;
    
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + CACHE_DURATION_HOURS);

    // Upsert - update if exists, create if not
    const [cache, created] = await PsychologyReportCache.upsert({
      tenantId,
      sessionId,
      reportType,
      filePath,
      fileName,
      fileSize,
      generatedAt: new Date(),
      expiresAt,
      downloadCount: 0,
      metadata: metadata || {}
    }, {
      returning: true
    });

    return cache;
  }

  /**
   * Increment download count
   */
  async incrementDownloadCount(cacheId) {
    await PsychologyReportCache.update({
      downloadCount: sequelize.literal('download_count + 1'),
      lastDownloadedAt: new Date()
    }, {
      where: { id: cacheId }
    });
  }

  /**
   * Delete cache by session
   */
  async deleteCacheBySession(sessionId) {
    const caches = await PsychologyReportCache.findAll({
      where: { sessionId }
    });

    for (const cache of caches) {
      // Delete file
      try {
        await fs.unlink(cache.filePath);
      } catch (err) {
        // Ignore if file doesn't exist
      }
      // Delete record
      await cache.destroy();
    }

    return caches.length;
  }

  /**
   * Get cache statistics
   */
  async getStats(tenantId) {
    const stats = await PsychologyReportCache.findAll({
      where: { tenantId },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalReports'],
        [sequelize.fn('SUM', sequelize.col('fileSize')), 'totalSize'],
        [sequelize.fn('SUM', sequelize.col('downloadCount')), 'totalDownloads']
      ],
      raw: true
    });

    return stats[0];
  }
}

module.exports = new ReportCacheService();
```

---

## Controller

```javascript
// src/modules/psychology/controllers/reportController.js

const PDFGeneratorService = require('../services/pdfGeneratorService');
const ReportCacheService = require('../services/reportCacheService');
const { PsychologySession, PsychologyReportCache } = require('../../../models');
const logger = require('../../../utils/logger');
const fs = require('fs').promises;
const path = require('path');

/**
 * Generate PDF report for psychology session
 * POST /api/v1/psychology/reports/:sessionId/pdf
 */
async function generateReport(req, res, next) {
  try {
    const { sessionId } = req.params;
    const { reportType = 'full', forceRegenerate = false, options = {} } = req.body;
    const tenantId = req.user.tenantId;

    // 1. Validate session exists and belongs to tenant
    const session = await PsychologySession.findOne({
      where: { id: sessionId, tenantId },
      include: [
        { association: 'participant' },
        { association: 'package' },
        { association: 'results' }
      ]
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Psychology session not found'
      });
    }

    // Check session is completed
    if (session.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot generate report for incomplete session'
      });
    }

    // 2. Check cache (unless force regenerate)
    if (!forceRegenerate) {
      const cachedReport = await ReportCacheService.getCachedReport(sessionId, reportType);
      
      if (cachedReport) {
        // Verify file still exists
        try {
          await fs.access(cachedReport.filePath);
          
          logger.logInfo('Returning cached PDF report', {
            action: 'PDF_REPORT_CACHE_HIT',
            sessionId,
            reportType,
            cacheId: cachedReport.id
          });

          return res.json({
            success: true,
            data: {
              downloadUrl: `/api/v1/psychology/reports/download/${cachedReport.id}`,
              fileName: cachedReport.fileName,
              fileSize: cachedReport.fileSize,
              expiresAt: cachedReport.expiresAt,
              cached: true
            }
          });
        } catch (err) {
          // File doesn't exist, continue to regenerate
        }
      }
    }

    // 3. Generate new PDF
    logger.logInfo('Generating new PDF report', {
      action: 'PDF_REPORT_GENERATING',
      sessionId,
      reportType,
      options
    });

    // Prepare session data for template
    const sessionData = prepareSessionDataForReport(session);
    
    // Generate PDF
    const pdfBuffer = await PDFGeneratorService.generateReport(sessionData, {
      reportType,
      ...options
    });

    // 4. Save to disk
    const { filePath, fileName, fileSize } = await PDFGeneratorService.saveToDisk(
      pdfBuffer,
      tenantId,
      sessionId,
      reportType
    );

    // 5. Create cache record
    const cache = await ReportCacheService.createCacheRecord({
      tenantId,
      sessionId,
      reportType,
      filePath,
      fileName,
      fileSize,
      metadata: {
        participantName: session.participant?.name,
        packageName: session.package?.name,
        generatedBy: req.user.id
      }
    });

    logger.logInfo('PDF report generated successfully', {
      action: 'PDF_REPORT_GENERATED',
      sessionId,
      reportType,
      cacheId: cache.id,
      fileSize
    });

    return res.json({
      success: true,
      data: {
        downloadUrl: `/api/v1/psychology/reports/download/${cache.id}`,
        fileName,
        fileSize,
        expiresAt: cache.expiresAt,
        cached: false
      }
    });

  } catch (err) {
    logger.logError('Error generating PDF report', {
      action: 'PDF_REPORT_ERROR',
      sessionId: req.params.sessionId,
      error: err.message,
      stack: err.stack
    });
    next(err);
  }
}

/**
 * Download PDF file
 * GET /api/v1/psychology/reports/download/:cacheId
 */
async function downloadReport(req, res, next) {
  try {
    const { cacheId } = req.params;
    const tenantId = req.user.tenantId;

    const cache = await PsychologyReportCache.findOne({
      where: { id: cacheId, tenantId }
    });

    if (!cache) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    // Check if expired
    if (new Date(cache.expiresAt) < new Date()) {
      return res.status(410).json({
        success: false,
        message: 'Report has expired. Please regenerate.'
      });
    }

    // Check file exists
    try {
      await fs.access(cache.filePath);
    } catch (err) {
      return res.status(410).json({
        success: false,
        message: 'Report file not found. Please regenerate.'
      });
    }

    // Increment download count
    await ReportCacheService.incrementDownloadCount(cacheId);

    // Stream file
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${cache.fileName}"`);
    res.setHeader('Content-Length', cache.fileSize);

    const fileStream = require('fs').createReadStream(cache.filePath);
    fileStream.pipe(res);

  } catch (err) {
    next(err);
  }
}

/**
 * Get report status
 * GET /api/v1/psychology/reports/:sessionId/status
 */
async function getReportStatus(req, res, next) {
  try {
    const { sessionId } = req.params;
    const tenantId = req.user.tenantId;

    const caches = await PsychologyReportCache.findAll({
      where: { sessionId, tenantId }
    });

    const reports = caches.map(cache => ({
      reportType: cache.reportType,
      hasCache: true,
      generatedAt: cache.generatedAt,
      expiresAt: cache.expiresAt,
      isExpired: new Date(cache.expiresAt) < new Date(),
      downloadCount: cache.downloadCount,
      fileSize: cache.fileSize
    }));

    return res.json({
      success: true,
      data: {
        sessionId,
        reports
      }
    });

  } catch (err) {
    next(err);
  }
}

/**
 * Delete cached reports for session
 * DELETE /api/v1/psychology/reports/:sessionId/cache
 */
async function deleteCache(req, res, next) {
  try {
    const { sessionId } = req.params;
    const deletedCount = await ReportCacheService.deleteCacheBySession(sessionId);

    return res.json({
      success: true,
      message: `Deleted ${deletedCount} cached report(s)`
    });

  } catch (err) {
    next(err);
  }
}

// Helper function
function prepareSessionDataForReport(session) {
  // Transform session data for template
  return {
    id: session.id,
    participant: {
      name: session.participant?.name || 'N/A',
      email: session.participant?.email || 'N/A'
    },
    package: {
      name: session.package?.name || 'N/A',
      description: session.package?.description
    },
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    duration: session.duration,
    results: session.results || [],
    interpretations: session.interpretations || [],
    recommendations: session.recommendations || [],
    chartData: prepareChartData(session.results)
  };
}

function prepareChartData(results) {
  // Prepare data for Chart.js radar chart
  if (!results || results.length === 0) return null;
  
  return {
    labels: results.map(r => r.dimensionName),
    datasets: [{
      label: 'Score',
      data: results.map(r => r.score),
      backgroundColor: 'rgba(102, 126, 234, 0.2)',
      borderColor: 'rgba(102, 126, 234, 1)',
      borderWidth: 2
    }]
  };
}

module.exports = {
  generateReport,
  downloadReport,
  getReportStatus,
  deleteCache
};
```

---

## Routes

```javascript
// src/modules/psychology/routes/report.routes.js

const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate } = require('../../../middlewares/authMiddleware');
const { authorizeCasl } = require('../../../middlewares/caslMiddleware');

router.use(authenticate);

// Generate/Download PDF
router.post(
  '/:sessionId/pdf',
  authorizeCasl('read', 'PsychologySession'),
  reportController.generateReport
);

// Download file
router.get(
  '/download/:cacheId',
  reportController.downloadReport
);

// Check report status
router.get(
  '/:sessionId/status',
  authorizeCasl('read', 'PsychologySession'),
  reportController.getReportStatus
);

// Delete cache (admin)
router.delete(
  '/:sessionId/cache',
  authorizeCasl('manage', 'PsychologySession'),
  reportController.deleteCache
);

module.exports = router;
```

---

## Installation & Dependencies

```bash
npm install puppeteer handlebars node-cron
```

### Puppeteer in Production

Untuk production (Docker/Linux), tambahkan dependencies:

```dockerfile
# Dockerfile
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgdk-pixbuf2.0-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

---

## Testing Checklist

### Unit Tests

- [ ] PDF generation with valid session data
- [ ] Cache hit returns cached file
- [ ] Cache miss triggers regeneration
- [ ] Force regenerate bypasses cache
- [ ] Expired cache triggers regeneration
- [ ] Download increments counter
- [ ] Cleanup deletes expired files

### Integration Tests

- [ ] Full flow: generate → download → verify PDF content
- [ ] Concurrent requests to same session
- [ ] Large report generation (many test results)
- [ ] Error handling for missing session

### E2E Tests

- [ ] Frontend triggers generate
- [ ] Download link works
- [ ] PDF opens correctly
- [ ] Charts rendered in PDF

---

## Security Considerations

1. **Tenant Isolation** - Reports only accessible by same tenant
2. **File Path Sanitization** - Prevent path traversal attacks
3. **Rate Limiting** - Limit PDF generation requests (resource intensive)
4. **Access Control** - CASL permissions for read/manage
5. **Temporary Files** - Auto-cleanup prevents disk overflow

---

## Performance Optimization

1. **Browser Reuse** - Single Puppeteer instance (singleton pattern)
2. **Template Caching** - Compile Handlebars templates once
3. **Stream Download** - Don't load entire PDF to memory
4. **Async Generation** - Consider queue for large reports
5. **CDN for Assets** - Chart.js loaded from CDN

---

## Monitoring

```javascript
// Metrics to track
- pdf_generation_duration_seconds
- pdf_generation_total (counter)
- pdf_cache_hit_total (counter)
- pdf_cache_miss_total (counter)
- pdf_file_size_bytes (histogram)
- pdf_cleanup_files_deleted (gauge)
```

---

## Implementation Order

1. ✅ Documentation (this file)
2. Migration - Create PsychologyReportCache table
3. Model - PsychologyReportCache
4. Service - pdfGeneratorService.js
5. Service - reportCacheService.js
6. Templates - HTML templates for reports
7. Controller - reportController.js
8. Routes - report.routes.js
9. Job - cleanupExpiredReports.js
10. Integration - Add to app.js startup

---

## Estimated Effort

| Task | Effort |
|------|--------|
| Migration & Model | 1 hour |
| PDF Generator Service | 3 hours |
| Cache Service | 1 hour |
| HTML Templates | 4 hours |
| Controller & Routes | 2 hours |
| Cleanup Job | 1 hour |
| Testing | 3 hours |
| **Total** | **~15 hours** |

---

## Related Documents

- [PSYCHOLOGY-MODULE-FRONTEND.md](../frontend-integration/PSYCHOLOGY-MODULE-FRONTEND.md)
- Psychology Session endpoints documentation
