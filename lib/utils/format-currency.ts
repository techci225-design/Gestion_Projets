import { getDisplayCurrency } from './currency'

export function formatCurrency(amount: number | null | undefined, currency: string = 'FCFA', compact: boolean = false): string {
  const displayCurrency = getDisplayCurrency(currency)
  if (amount === null || amount === undefined || isNaN(amount)) return `0\u00A0${displayCurrency}`
  
  if (compact) {
    if (Math.abs(amount) >= 1_000_000_000) {
      return `${(amount / 1_000_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })}\u00A0Md\u00A0${displayCurrency}`
    }
    if (Math.abs(amount) >= 1_000_000) {
      return `${(amount / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })}\u00A0M\u00A0${displayCurrency}`
    }
  }

  // Format with space as thousands separator and no decimals
  let formatted = new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  }).format(amount)

  // Use non-breaking space everywhere to prevent wrapping
  formatted = formatted.replace(/\u202F|\s/g, '\u00A0')

  // Explicitly ensure the currency is appended correctly with a non-breaking space
  return `${formatted}\u00A0${displayCurrency}`
}
