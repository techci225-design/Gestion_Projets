export function formatCurrency(amount: number | null | undefined, currency: string = 'XOF', compact: boolean = false): string {
  if (amount === null || amount === undefined || isNaN(amount)) amount = 0;
  
  const config = {
    'XOF': { suffix: 'FCFA', locale: 'fr-CI', decimals: 0 },
    'XAF': { suffix: 'FCFA', locale: 'fr-CM', decimals: 0 },
    'EUR': { suffix: '€',    locale: 'fr-FR', decimals: 2 },
    'USD': { suffix: '$',    locale: 'en-US', decimals: 2 },
  };
  
  let curr = currency;
  if (curr === 'FCFA') curr = 'XOF';
  
  const currConfig = config[curr as keyof typeof config] || config['XOF'];
  const { suffix, decimals } = currConfig;

  if (compact) {
    if (Math.abs(amount) >= 1_000_000_000) {
      return `${(amount / 1_000_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })}\u00A0Md\u00A0${suffix}`
    }
    if (Math.abs(amount) >= 1_000_000) {
      return `${(amount / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })}\u00A0M\u00A0${suffix}`
    }
  }

  let formatted = new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals
  }).format(amount)

  formatted = formatted.replace(/\u202F|\s/g, '\u00A0')

  return `${formatted}\u00A0${suffix}`
}
