export function formatCurrency(amount: number | null | undefined, currency: string = 'FCFA'): string {
  if (amount === null || amount === undefined || isNaN(amount)) return `0\u00A0${currency}`
  
  // Format with space as thousands separator and no decimals
  let formatted = new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  }).format(amount)

  // Use non-breaking space everywhere to prevent wrapping
  formatted = formatted.replace(/\u202F|\s/g, '\u00A0')

  // Explicitly ensure the currency is appended correctly with a non-breaking space
  return `${formatted}\u00A0${currency}`
}
