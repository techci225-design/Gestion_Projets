export function getDisplayCurrency(currencyCode: string | null | undefined): string {
  if (!currencyCode) return 'FCFA'
  
  switch (currencyCode.toUpperCase()) {
    case 'XOF':
    case 'XAF':
      return 'FCFA'
    case 'USD':
      return '$'
    case 'EUR':
      return '€'
    default:
      return currencyCode
  }
}
