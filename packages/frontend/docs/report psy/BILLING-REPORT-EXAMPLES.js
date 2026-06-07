/**
 * QUICK EXAMPLE: Psychology Test Usage Billing Report
 * 
 * Use Case: Generate monthly invoice untuk penagihan penggunaan test psikologi
 */

// ============================================
// Example 1: Generate Monthly Billing Report
// ============================================

async function generateMonthlyInvoice(month, year) {
  // Calculate date range
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

  // Call API
  const response = await fetch(
    `/api/v1/psychology/reports/test-usage-billing?startDate=${startDate}&endDate=${endDate}&verified=all`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );

  const data = await response.json();

  // Generate invoice from summary
  console.log('='.repeat(50));
  console.log(`INVOICE - ${getMonthName(month)} ${year}`);
  console.log('='.repeat(50));
  console.log(`Period: ${startDate} to ${endDate}\n`);

  // Pricing per test type
  const rates = {
    'CFIT': 50000,
    'PAPI': 75000,
    'EPPS': 60000,
    'DISC': 50000,
    'MBTI': 65000
  };

  let grandTotal = 0;

  console.log('Test Usage Summary:');
  console.log('-'.repeat(50));
  
  data.data.summaryByTestType.forEach(item => {
    const rate = rates[item.testType.code] || 50000;
    const subtotal = item.totalTests * rate;
    grandTotal += subtotal;

    console.log(`${item.testType.name} (${item.testType.code})`);
    console.log(`  ${item.totalTests} tests @ Rp ${rate.toLocaleString()}`);
    console.log(`  Subtotal: Rp ${subtotal.toLocaleString()}`);
    console.log(`  (${item.verifiedTests} verified, ${item.unverifiedTests} pending)\n`);
  });

  console.log('-'.repeat(50));
  console.log(`TOTAL TESTS: ${data.data.overallSummary.totalTests}`);
  console.log(`GRAND TOTAL: Rp ${grandTotal.toLocaleString()}`);
  console.log('='.repeat(50));

  return {
    period: { startDate, endDate },
    totalTests: data.data.overallSummary.totalTests,
    verifiedTests: data.data.overallSummary.verifiedTests,
    unverifiedTests: data.data.overallSummary.unverifiedTests,
    breakdown: data.data.summaryByTestType,
    grandTotal
  };
}

// ============================================
// Example 2: Validation dengan Client
// ============================================

async function exportDetailedReport(startDate, endDate) {
  const response = await fetch(
    `/api/v1/psychology/reports/test-usage-billing?startDate=${startDate}&endDate=${endDate}&limit=1000`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );

  const data = await response.json();

  // Convert to CSV untuk sharing dengan client
  const csvRows = [
    ['Order Number', 'Patient Name', 'Test Type', 'Completed Date', 'Duration (min)', 'Verified', 'Verified By']
  ];

  data.data.sessions.forEach(session => {
    csvRows.push([
      session.orderNumber,
      session.patientName,
      `${session.testType.code} - ${session.testType.name}`,
      new Date(session.completedAt).toLocaleDateString('id-ID'),
      session.duration || '-',
      session.verified.isVerified ? 'Yes' : 'No',
      session.verified.verifiedBy || '-'
    ]);
  });

  // Save or download CSV
  const csv = csvRows.map(row => row.join(',')).join('\n');
  downloadCSV(csv, `Test_Usage_${startDate}_${endDate}.csv`);
  
  console.log(`✅ Exported ${data.data.sessions.length} sessions`);
}

// ============================================
// Example 3: Quality Control Check
// ============================================

async function checkUnverifiedTests() {
  const response = await fetch(
    `/api/v1/psychology/reports/test-usage-billing?verified=unverified`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );

  const data = await response.json();
  const count = data.data.overallSummary.totalTests;

  if (count > 0) {
    console.warn(`⚠️  ${count} tests pending verification:`);
    data.data.sessions.forEach(session => {
      console.log(`  - ${session.sessionId}: ${session.testType.code} (${session.patientName})`);
    });
    return false; // Not ready for billing
  } else {
    console.log('✅ All tests verified. Ready for billing!');
    return true; // Ready for billing
  }
}

// ============================================
// Example 4: Specific Test Type Usage
// ============================================

async function getCFITUsageReport(startDate, endDate, cfitTestTypeId) {
  const response = await fetch(
    `/api/v1/psychology/reports/test-usage-billing?startDate=${startDate}&endDate=${endDate}&testTypeId=${cfitTestTypeId}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );

  const data = await response.json();
  const summary = data.data.summaryByTestType[0];

  console.log('\n📊 CFIT Usage Report');
  console.log(`Period: ${startDate} to ${endDate}`);
  console.log(`Total Tests: ${summary.totalTests}`);
  console.log(`Average Duration: ${summary.avgDurationMinutes} minutes`);
  console.log(`Verified: ${summary.verifiedTests}`);
  console.log(`First Test: ${new Date(summary.period.firstTest).toLocaleDateString()}`);
  console.log(`Last Test: ${new Date(summary.period.lastTest).toLocaleDateString()}`);

  return summary;
}

// ============================================
// Example 5: React Component (Simple)
// ============================================

function BillingReportWidget({ month, year }) {
  const [report, setReport] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadReport();
  }, [month, year]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

      const res = await fetch(
        `/api/v1/psychology/reports/test-usage-billing?startDate=${startDate}&endDate=${endDate}`,
        {
          headers: { 'Authorization': `Bearer ${getToken()}` }
        }
      );
      
      const data = await res.json();
      setReport(data.data);
    } catch (error) {
      console.error('Failed to load report:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!report) return <div>No data</div>;

  return (
    <div className="billing-report-widget">
      <h3>Test Usage - {getMonthName(month)} {year}</h3>
      
      <div className="summary-stats">
        <div className="stat-card">
          <label>Total Tests</label>
          <strong>{report.overallSummary.totalTests}</strong>
        </div>
        <div className="stat-card">
          <label>Verified</label>
          <strong className="success">{report.overallSummary.verifiedTests}</strong>
        </div>
        <div className="stat-card">
          <label>Pending</label>
          <strong className="warning">{report.overallSummary.unverifiedTests}</strong>
        </div>
      </div>

      <table className="test-type-breakdown">
        <thead>
          <tr>
            <th>Test Type</th>
            <th>Total</th>
            <th>Verified</th>
            <th>Avg Duration</th>
          </tr>
        </thead>
        <tbody>
          {report.summaryByTestType.map(item => (
            <tr key={item.testType.id}>
              <td>{item.testType.name}</td>
              <td>{item.totalTests}</td>
              <td>{item.verifiedTests}</td>
              <td>{item.avgDurationMinutes} min</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================
// Helper Functions
// ============================================

function getMonthName(month) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1];
}

function downloadCSV(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

// ============================================
// Usage Examples
// ============================================

// Generate invoice for January 2026
generateMonthlyInvoice(1, 2026);

// Export detailed report
exportDetailedReport('2026-01-01', '2026-01-31');

// Check if ready for billing
checkUnverifiedTests();

// Get CFIT-specific usage
getCFITUsageReport('2026-01-01', '2026-01-31', 'cfit-uuid-here');
