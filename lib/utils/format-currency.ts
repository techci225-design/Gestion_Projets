export function formatCurrency(amount: number): string {
  if (isNaN(amount)) return '0 FCFA'
  
  // Format with space as thousands separator and no decimals
  let formatted = new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  }).format(amount)

  // Remplacer les espaces insécables générés par Intl.NumberFormat ('fr-FR')
  formatted = formatted.replace(/\u202F|\u00A0/g, ' ')

  // Explicitly ensure 'FCFA' is appended correctly
  return `${formatted} FCFA`
}
