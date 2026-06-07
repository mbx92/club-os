/**
 * Simple Forecasting Utility
 * Uses linear regression on historical data to project future values.
 */

/**
 * Calculate linear regression (least squares) on a dataset.
 * @param {Array<{ x: number, y: number }>} data - Array of data points
 * @returns {{ slope: number, intercept: number, r2: number }}
 */
function linearRegression(data) {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: data[0]?.y || 0, r2: 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0, sumYY = 0;

  for (const { x, y } of data) {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
    sumYY += y * y;
  }

  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n, r2: 0 };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // R² (coefficient of determination)
  const meanY = sumY / n;
  let ssTot = 0, ssRes = 0;
  for (const { x, y } of data) {
    ssTot += (y - meanY) ** 2;
    ssRes += (y - (slope * x + intercept)) ** 2;
  }
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  return { slope, intercept, r2 };
}

/**
 * Calculate simple moving average.
 * @param {number[]} values - Array of numeric values
 * @param {number} window - Window size
 * @returns {number[]}
 */
function movingAverage(values, window = 3) {
  if (values.length < window) return values;
  const result = [];
  for (let i = 0; i <= values.length - window; i++) {
    const sum = values.slice(i, i + window).reduce((a, b) => a + b, 0);
    result.push(sum / window);
  }
  return result;
}

/**
 * Generate forecast data points from historical time series.
 * @param {Array<{ period: string, value: number }>} historicalData - Historical data sorted by period
 * @param {number} periodsAhead - How many periods to forecast
 * @returns {{ forecast: Array<{ period: number, predictedValue: number }>, model: { slope: number, intercept: number, r2: number }, trend: string, avgGrowthRate: number }}
 */
function generateForecast(historicalData, periodsAhead = 3) {
  if (!historicalData || historicalData.length < 2) {
    return {
      forecast: [],
      model: { slope: 0, intercept: 0, r2: 0 },
      trend: 'insufficient_data',
      avgGrowthRate: 0,
      confidence: 'none'
    };
  }

  // Map historical data to x,y for regression
  const regressionData = historicalData.map((d, i) => ({
    x: i + 1,
    y: parseFloat(d.value) || 0
  }));

  const model = linearRegression(regressionData);
  const n = regressionData.length;

  // Generate forecast points
  const forecast = [];
  for (let i = 1; i <= periodsAhead; i++) {
    const xVal = n + i;
    const predictedValue = Math.max(0, Math.round((model.slope * xVal + model.intercept) * 100) / 100);
    forecast.push({
      periodIndex: xVal,
      predictedValue
    });
  }

  // Determine trend
  let trend = 'stable';
  if (model.slope > 0.01) trend = 'growing';
  else if (model.slope < -0.01) trend = 'declining';

  // Average growth rate
  let totalGrowth = 0;
  let growthCount = 0;
  for (let i = 1; i < historicalData.length; i++) {
    const prev = parseFloat(historicalData[i - 1].value) || 0;
    const curr = parseFloat(historicalData[i].value) || 0;
    if (prev > 0) {
      totalGrowth += (curr - prev) / prev;
      growthCount++;
    }
  }
  const avgGrowthRate = growthCount > 0 ? Math.round((totalGrowth / growthCount) * 10000) / 100 : 0;

  // Confidence based on R²
  let confidence = 'low';
  if (model.r2 >= 0.7) confidence = 'high';
  else if (model.r2 >= 0.4) confidence = 'medium';

  return {
    forecast,
    model: {
      slope: Math.round(model.slope * 100) / 100,
      intercept: Math.round(model.intercept * 100) / 100,
      r2: Math.round(model.r2 * 1000) / 1000
    },
    trend,
    avgGrowthRate,
    confidence
  };
}

module.exports = {
  linearRegression,
  movingAverage,
  generateForecast
};
