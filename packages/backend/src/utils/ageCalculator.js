/**
 * Age Calculator Utility
 * Helper functions untuk kalkulasi usia dan age group
 */

/**
 * Calculate age in years, months, and days
 * @param {Date|string} birthDate - Tanggal lahir
 * @param {Date|string} testDate - Tanggal tes (default: today)
 * @returns {Object} { years, months, days, totalMonths }
 */
function calculateAge(birthDate, testDate = new Date()) {
  const birth = new Date(birthDate);
  const test = new Date(testDate);

  if (isNaN(birth.getTime()) || isNaN(test.getTime())) {
    throw new Error('Invalid date format');
  }

  if (test < birth) {
    throw new Error('Test date cannot be before birth date');
  }

  let years = test.getFullYear() - birth.getFullYear();
  let months = test.getMonth() - birth.getMonth();
  let days = test.getDate() - birth.getDate();

  // Adjust for negative days
  if (days < 0) {
    months--;
    const prevMonth = new Date(test.getFullYear(), test.getMonth(), 0);
    days += prevMonth.getDate();
  }

  // Adjust for negative months
  if (months < 0) {
    years--;
    months += 12;
  }

  const totalMonths = years * 12 + months;

  return {
    years,
    months,
    days,
    totalMonths
  };
}

/**
 * Get age group label for CFIT norms lookup
 * Format: "14-0_14-11" for age 14 years 0-11 months
 * @param {number} totalMonths - Total usia dalam bulan
 * @returns {string} Age group label
 */
function getAgeGroup(totalMonths) {
  const years = Math.floor(totalMonths / 12);
  
  // For now, we only have norms for age 14 (168-179 months)
  // This can be extended when more age group norms are available
  if (totalMonths >= 168 && totalMonths <= 179) {
    return '14-0_14-11';
  }

  // Default to age 14 group if outside range (temporary)
  // TODO: Add more age groups when data is available
  return '14-0_14-11';
}

/**
 * Format age as readable string
 * @param {Object} age - Age object from calculateAge
 * @returns {string} Formatted age string
 */
function formatAge(age) {
  const parts = [];
  
  if (age.years > 0) {
    parts.push(`${age.years} Tahun`);
  }
  
  if (age.months > 0) {
    parts.push(`${age.months} Bulan`);
  }
  
  if (age.days > 0) {
    parts.push(`${age.days} Hari`);
  }
  
  return parts.join(', ') || '0 Hari';
}

/**
 * Validate if age is within valid range for testing
 * @param {number} totalMonths - Total usia dalam bulan
 * @param {number} minAge - Minimum age in years (default: 10)
 * @param {number} maxAge - Maximum age in years (default: 80)
 * @returns {boolean} True if age is valid
 */
function isValidAgeForTest(totalMonths, minAge = 10, maxAge = 80) {
  const minMonths = minAge * 12;
  const maxMonths = maxAge * 12;
  
  return totalMonths >= minMonths && totalMonths <= maxMonths;
}

module.exports = {
  calculateAge,
  getAgeGroup,
  formatAge,
  isValidAgeForTest
};
