export function formatCurrency(amount: number): string {
  if (isNaN(amount)) return '0 FCFA'
  
  // Format with space as thousands separator and no decimals
  const formatted = new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  }).format(amount)

  // Explicitly ensure 'FCFA' is appended correctly
  return `${formatted} FCFA`
}
