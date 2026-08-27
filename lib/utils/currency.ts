export function getDisplayCurrency(currencyCode: string | null | undefined): string {
  if (!currencyCode) return '—'
  
  switch (currencyCode.toUpperCase()) {
    case 'XOF':
    case 'XAF':
      return 'FCFA'
    case 'USD':
      return '$'
    case 'EUR':
      return '€'
    case 'GBP':
      return '£'
    case 'CAD':
      return '$ CA'
    case 'CHF':
      return 'CHF'
    default:
      return currencyCode
  }
}
