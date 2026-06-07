/**
 * IDR currency formatting composable
 * Formats numbers to Indonesian Rupiah display: "Rp 1.250.000"
 *
 * @returns {{ format: (amount: number, options?: object) => string }}
 */
export function useFormatIDR() {
  /**
   * Format a number to IDR currency string
   * @param {number} amount - The amount to format
   * @param {{ symbol?: boolean, compact?: boolean, decimal?: number }} [options]
   * @returns {string} Formatted IDR string
   */
  const format = (amount, options = {}) => {
    const { symbol = true, compact = false, decimal = 0 } = options

    if (amount == null || isNaN(amount)) return symbol ? 'Rp 0' : '0'

    let formatted

    if (compact) {
      if (Math.abs(amount) >= 1_000_000_000) {
        formatted = (amount / 1_000_000_000).toFixed(1) + ' M'
      } else if (Math.abs(amount) >= 1_000_000) {
        formatted = (amount / 1_000_000).toFixed(1) + ' Jt'
      } else if (Math.abs(amount) >= 1_000) {
        formatted = Math.round(amount / 1_000) + ' Rb'
      } else {
        formatted = Math.round(amount).toString()
      }
      return symbol ? `Rp ${formatted}` : formatted
    }

    formatted = Math.round(amount).toLocaleString('id-ID', {
      minimumFractionDigits: decimal,
      maximumFractionDigits: decimal,
    })

    return symbol ? `Rp ${formatted}` : formatted
  }

  /**
   * Format a number as compact short IDR
   * @param {number} amount
   * @returns {string}
   */
  const short = (amount) => format(amount, { compact: true })

  /**
   * Format a number as IDR without symbol
   * @param {number} amount
   * @returns {string}
   */
  const number = (amount) => format(amount, { symbol: false })

  return { format, short, number }
}
