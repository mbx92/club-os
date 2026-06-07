const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const db = require('../src/models');

const sessionId = '1c944e71-f19a-4b59-a310-ca30695f62f2';
const outputPath = path.join(__dirname, '..', 'Laporan-Transaksi-21-Feb-2026.pdf');

function fmt(val) {
  return Number(val).toLocaleString('id-ID');
}

async function generatePDF() {
  try {
    // ── Fetch data ──────────────────────────────────────────
    const [session] = await db.sequelize.query(`
      SELECT "openingBalance", "closingBalance", "actualCash", "difference", "openedAt", "closedAt"
      FROM "CashRegisterSessions" WHERE id = '${sessionId}'
    `);
    const s = session[0];

    const [transactions] = await db.sequelize.query(`
      SELECT t.id, t."transactionNumber", t."transactionDate", t."transactionType",
        t."status", t."subtotal", t."voucherDiscount", t."serviceCharge", t."tax",
        t."roundingAmount", t."totalAmount", t."paidAmount", t."changeAmount",
        t."customerType", t."customerName", t."notes", t."splitFromId"
      FROM "Transactions" t
      WHERE t."transactionDate" >= (SELECT "openedAt" FROM "CashRegisterSessions" WHERE id = '${sessionId}')
        AND t."transactionDate" < (SELECT "closedAt" FROM "CashRegisterSessions" WHERE id = '${sessionId}')
        AND t."tenantId" = (SELECT "tenantId" FROM "CashRegisterSessions" WHERE id = '${sessionId}')
      ORDER BY t."transactionDate"
    `);

    const [payments] = await db.sequelize.query(`
      SELECT tp."transactionId", tp."paymentMethod", tp."amount", tp."status", tp."notes"
      FROM "TransactionPayments" tp
      JOIN "Transactions" t ON tp."transactionId" = t.id
      WHERE t."transactionDate" >= (SELECT "openedAt" FROM "CashRegisterSessions" WHERE id = '${sessionId}')
        AND t."transactionDate" < (SELECT "closedAt" FROM "CashRegisterSessions" WHERE id = '${sessionId}')
        AND t."tenantId" = (SELECT "tenantId" FROM "CashRegisterSessions" WHERE id = '${sessionId}')
      ORDER BY tp."paymentDate"
    `);

    const [items] = await db.sequelize.query(`
      SELECT ti."transactionId", ti."itemName", ti."quantity", ti."unitPrice",
        ti."subtotal", ti."isRefunded"
      FROM "TransactionItems" ti
      JOIN "Transactions" t ON ti."transactionId" = t.id
      WHERE t."transactionDate" >= (SELECT "openedAt" FROM "CashRegisterSessions" WHERE id = '${sessionId}')
        AND t."transactionDate" < (SELECT "closedAt" FROM "CashRegisterSessions" WHERE id = '${sessionId}')
        AND t."tenantId" = (SELECT "tenantId" FROM "CashRegisterSessions" WHERE id = '${sessionId}')
      ORDER BY ti."createdAt"
    `);

    const paymentMap = {};
    payments.forEach(p => { (paymentMap[p.transactionId] ||= []).push(p); });
    const itemMap = {};
    items.forEach(i => { (itemMap[i.transactionId] ||= []).push(i); });

    // ── Build PDF ───────────────────────────────────────────
    const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    const W = doc.page.width - 80; // usable width
    const colors = {
      primary: '#1a237e',
      accent: '#0d47a1',
      success: '#2e7d32',
      danger: '#c62828',
      warning: '#e65100',
      muted: '#616161',
      lightBg: '#f5f5f5',
      white: '#ffffff',
      border: '#bdbdbd',
      black: '#212121',
    };

    // ── Helper functions ────────────────────────────────────
    function checkPage(needed = 80) {
      if (doc.y + needed > doc.page.height - 50) {
        doc.addPage();
      }
    }

    function drawLine(y, color = colors.border) {
      doc.strokeColor(color).lineWidth(0.5)
        .moveTo(40, y).lineTo(40 + W, y).stroke();
    }

    function statusColor(status) {
      switch (status) {
        case 'completed': case 'paid': return colors.success;
        case 'cancelled': return colors.danger;
        case 'refunded': case 'partially_refunded': return colors.warning;
        case 'split': return colors.accent;
        default: return colors.muted;
      }
    }

    function statusLabel(status) {
      const map = {
        completed: 'COMPLETED', cancelled: 'CANCELLED', refunded: 'REFUNDED',
        split: 'SPLIT', paid: 'PAID', pending: 'PENDING',
      };
      return map[status] || status.toUpperCase();
    }

    function paymentStatusIcon(status) {
      return status === 'completed' ? '✓' : status === 'failed' ? '✗' : '?';
    }

    // ── HEADER ──────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 100).fill(colors.primary);
    doc.fill(colors.white).fontSize(20).font('Helvetica-Bold')
      .text('LAPORAN DETAIL TRANSAKSI', 40, 25, { width: W, align: 'center' });
    doc.fontSize(12).font('Helvetica')
      .text('Sesi Siang — 21 Februari 2026', 40, 52, { width: W, align: 'center' });
    doc.fontSize(9)
      .text(`Generated: ${new Date().toLocaleString('id-ID')}`, 40, 72, { width: W, align: 'center' });

    doc.fill(colors.black);
    doc.y = 115;

    // ── SESSION INFO ────────────────────────────────────────
    doc.rect(40, doc.y, W, 90).fill('#e8eaf6').stroke(colors.border);
    const infoY = doc.y + 10;
    doc.fill(colors.primary).fontSize(11).font('Helvetica-Bold')
      .text('Informasi Sesi', 55, infoY);

    doc.fill(colors.black).fontSize(9).font('Helvetica');
    const col1 = 55, col2 = 300;
    let iy = infoY + 18;
    doc.text(`Modal Awal       : Rp ${fmt(s.openingBalance)}`, col1, iy);
    doc.text(`Expected Cash    : Rp ${fmt(s.closingBalance)}`, col2, iy);
    iy += 14;
    doc.text(`Actual Cash      : Rp ${fmt(s.actualCash)}`, col1, iy);
    doc.font('Helvetica-Bold').fillColor(parseFloat(s.difference) < 0 ? colors.danger : colors.success)
      .text(`Selisih          : Rp ${fmt(s.difference)}`, col2, iy);
    iy += 14;
    doc.font('Helvetica').fill(colors.black);
    doc.text(`Jumlah Transaksi : ${transactions.length}`, col1, iy);
    doc.text(`Session ID       : ${sessionId.substring(0, 18)}...`, col2, iy);

    doc.y = infoY + 85;

    // ── EACH TRANSACTION ────────────────────────────────────
    let totalCash = 0, totalNonCash = 0, totalChange = 0, grandTotal = 0;

    transactions.forEach((t, idx) => {
      const txItems = itemMap[t.id] || [];
      const txPayments = paymentMap[t.id] || [];

      // Estimate height needed
      const estHeight = 80 + txItems.length * 14 + txPayments.length * 14 + 60;
      checkPage(estHeight);

      // Transaction header bar
      const headerY = doc.y + 8;
      doc.rect(40, headerY, W, 22).fill(statusColor(t.status));
      doc.fill(colors.white).fontSize(10).font('Helvetica-Bold')
        .text(`#${idx + 1}  ${t.transactionNumber}`, 50, headerY + 5)
        .text(statusLabel(t.status), 40, headerY + 5, { width: W - 10, align: 'right' });

      doc.y = headerY + 28;
      doc.fill(colors.black).font('Helvetica').fontSize(8);

      // Meta info
      const txDate = new Date(t.transactionDate);
      const dateStr = txDate.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
      doc.text(`Tanggal: ${dateStr}    |    Tipe: ${t.transactionType}`, 50, doc.y);
      if (t.customerName) {
        doc.y += 11;
        doc.text(`Customer: ${t.customerName} (${t.customerType})`, 50, doc.y);
      }
      if (t.notes) {
        doc.y += 11;
        doc.fillColor(colors.muted).text(`Notes: ${t.notes}`, 50, doc.y, { width: W - 20 });
        doc.fillColor(colors.black);
      }
      doc.y += 16;

      // Items table header
      checkPage(30 + txItems.length * 13);
      doc.rect(50, doc.y, W - 20, 14).fill('#e0e0e0');
      const thY = doc.y + 3;
      doc.fill(colors.black).fontSize(7.5).font('Helvetica-Bold');
      doc.text('Item', 55, thY, { width: 200 });
      doc.text('Qty', 270, thY, { width: 30, align: 'right' });
      doc.text('Harga', 310, thY, { width: 80, align: 'right' });
      doc.text('Subtotal', 400, thY, { width: 80, align: 'right' });
      doc.y += 16;

      // Item rows
      doc.font('Helvetica').fontSize(7.5);
      txItems.forEach((item, ii) => {
        const rowY = doc.y;
        if (ii % 2 === 0) doc.rect(50, rowY - 1, W - 20, 13).fill('#fafafa');
        doc.fill(colors.black);
        let name = item.itemName;
        if (item.isRefunded) name += ' [REFUND]';
        doc.text(name, 55, rowY + 1, { width: 200 });
        doc.text(String(item.quantity), 270, rowY + 1, { width: 30, align: 'right' });
        doc.text(`Rp ${fmt(item.unitPrice)}`, 310, rowY + 1, { width: 80, align: 'right' });
        doc.text(`Rp ${fmt(item.subtotal)}`, 400, rowY + 1, { width: 80, align: 'right' });
        doc.y += 13;
      });

      // Calculation summary
      doc.y += 4;
      drawLine(doc.y);
      doc.y += 5;
      doc.fontSize(8).font('Helvetica');

      const calcX = 330, valX = 420;
      doc.text('Subtotal', calcX, doc.y, { width: 80 });
      doc.text(`Rp ${fmt(t.subtotal)}`, valX, doc.y, { width: 80, align: 'right' });
      doc.y += 12;

      if (parseFloat(t.voucherDiscount) > 0) {
        doc.fillColor(colors.success).text('Voucher Disc', calcX, doc.y, { width: 80 });
        doc.text(`-Rp ${fmt(t.voucherDiscount)}`, valX, doc.y, { width: 80, align: 'right' });
        doc.fillColor(colors.black); doc.y += 12;
      }
      if (parseFloat(t.serviceCharge) > 0) {
        doc.text('Service Charge', calcX, doc.y, { width: 80 });
        doc.text(`+Rp ${fmt(t.serviceCharge)}`, valX, doc.y, { width: 80, align: 'right' });
        doc.y += 12;
      }
      if (parseFloat(t.tax) > 0) {
        doc.text('Tax', calcX, doc.y, { width: 80 });
        doc.text(`+Rp ${fmt(t.tax)}`, valX, doc.y, { width: 80, align: 'right' });
        doc.y += 12;
      }

      doc.font('Helvetica-Bold').fontSize(9);
      doc.text('TOTAL', calcX, doc.y, { width: 80 });
      doc.text(`Rp ${fmt(t.totalAmount)}`, valX, doc.y, { width: 80, align: 'right' });
      doc.y += 16;

      // Payments
      doc.font('Helvetica-Bold').fontSize(8).fillColor(colors.primary)
        .text('Pembayaran:', 50, doc.y);
      doc.y += 13;
      doc.font('Helvetica').fillColor(colors.black);

      if (txPayments.length === 0) {
        doc.fontSize(8).fillColor(colors.muted)
          .text('(tidak ada pembayaran)', 60, doc.y);
        doc.fillColor(colors.black);
        doc.y += 12;
      } else {
        txPayments.forEach(p => {
          const icon = paymentStatusIcon(p.status);
          const pColor = p.status === 'completed' ? colors.success : p.status === 'failed' ? colors.danger : colors.muted;
          doc.fontSize(8).fillColor(pColor);
          doc.text(`${icon} ${p.paymentMethod.toUpperCase()}`, 60, doc.y, { width: 100 });
          doc.text(`Rp ${fmt(p.amount)}`, 170, doc.y, { width: 80, align: 'right' });
          doc.fillColor(colors.muted).fontSize(7)
            .text(`[${p.status}]`, 260, doc.y + 0.5);
          doc.fillColor(colors.black);
          doc.y += 13;

          if (p.status === 'completed') {
            if (p.paymentMethod === 'cash') totalCash += parseFloat(p.amount);
            else totalNonCash += parseFloat(p.amount);
          }
        });
      }

      if (parseFloat(t.changeAmount) > 0) {
        doc.fontSize(8).fillColor(colors.accent)
          .text(`Kembalian: Rp ${fmt(t.changeAmount)}`, 60, doc.y);
        doc.fillColor(colors.black);
        doc.y += 13;
        const hasCompletedCash = txPayments.some(p => p.paymentMethod === 'cash' && p.status === 'completed');
        if (hasCompletedCash) totalChange += parseFloat(t.changeAmount);
      }

      if (['completed', 'paid'].includes(t.status)) {
        grandTotal += parseFloat(t.totalAmount);
      }

      doc.y += 6;
    });

    // ── SUMMARY PAGE ────────────────────────────────────────
    checkPage(250);
    doc.y += 10;

    doc.rect(40, doc.y, W, 28).fill(colors.primary);
    doc.fill(colors.white).fontSize(14).font('Helvetica-Bold')
      .text('RINGKASAN KEUANGAN', 50, doc.y + 6, { width: W - 20, align: 'center' });
    doc.y += 38;

    const netCash = totalCash - totalChange;
    const expected = parseFloat(s.openingBalance) + netCash;
    const diff = parseFloat(s.actualCash) - expected;

    function summaryRow(label, value, bold = false, color = colors.black) {
      checkPage(20);
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(10).fillColor(color);
      doc.text(label, 55, doc.y, { width: 280 });
      doc.text(value, 350, doc.y, { width: 150, align: 'right' });
      doc.y += 18;
    }

    summaryRow('Total Cash Masuk (completed)', `Rp ${fmt(totalCash)}`);
    summaryRow('Total Kembalian Cash', `Rp ${fmt(totalChange)}`);
    summaryRow('Net Cash In', `Rp ${fmt(netCash)}`, true);
    doc.y += 4;
    drawLine(doc.y); doc.y += 8;
    summaryRow('Total Non-Cash (QRIS, dll)', `Rp ${fmt(totalNonCash)}`);
    summaryRow('Grand Total (completed)', `Rp ${fmt(grandTotal)}`, true);
    doc.y += 4;
    drawLine(doc.y); doc.y += 8;

    // Box for final calc
    doc.rect(50, doc.y, W - 20, 95).lineWidth(1).strokeColor(colors.primary).stroke();
    doc.y += 10;
    summaryRow('Modal Awal', `Rp ${fmt(s.openingBalance)}`);
    summaryRow('+ Net Cash In', `Rp ${fmt(netCash)}`);
    summaryRow('= Expected Cash di Laci', `Rp ${fmt(expected)}`, true, colors.primary);
    summaryRow('Actual Cash di Laci', `Rp ${fmt(s.actualCash)}`, true);
    summaryRow('SELISIH', `Rp ${fmt(diff)}`, true, diff < 0 ? colors.danger : colors.success);

    // ── Footer on all pages ─────────────────────────────────
    const totalPages = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      doc.fontSize(7).fillColor(colors.muted).font('Helvetica')
        .text(`Halaman ${i + 1} / ${totalPages}`, 40, doc.page.height - 30, { width: W, align: 'center' });
    }

    doc.end();

    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    console.log(`\n✅ PDF berhasil dibuat: ${outputPath}`);
    console.log(`   Ukuran: ${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB`);

  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
  } finally {
    await db.sequelize.close();
  }
}

generatePDF();
