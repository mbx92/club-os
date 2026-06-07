export const useCurrency = () => {
  /**
   * Format currency using tenant currency configuration when available.
   * currencyConfig expected shape (partial): { defaultCurrency: 'IDR', currencySymbol: 'Rp', useDecimals: true }
   */
  const formatCurrency = (amount, currencyConfig = null) => {
    // Handle null/undefined gracefully
    if (amount === null || amount === undefined) return currencyConfig?.currencySymbol ? `${currencyConfig.currencySymbol} 0` : '0'

    // Ensure numeric
    const num = typeof amount === 'number' ? amount : parseFloat(String(amount))
    if (Number.isNaN(num)) return amount

    const currencyCode = currencyConfig?.defaultCurrency || 'IDR'

    // Choose locale by currency (basic approximation)
    const locale = currencyCode === 'IDR' ? 'id-ID' : 'en-US'

    const useDecimals = currencyConfig?.useDecimals ?? true
    const fractionDigits = useDecimals ? 2 : 0

    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits
      }).format(num)
    } catch (e) {
      // Fallback simple formatting
      const formatted = num.toFixed(fractionDigits)
      return currencyConfig?.currencySymbol ? `${currencyConfig.currencySymbol} ${formatted}` : `${currencyCode} ${formatted}`
    }
  }

  const getCurrencyLabel = (label = 'Price', currencyConfig = null) => {
    const currencyCode = currencyConfig?.defaultCurrency || 'IDR'
    return `${label} (${currencyCode})`
  }

  return {
    formatCurrency,
    getCurrencyLabel
  }
}
