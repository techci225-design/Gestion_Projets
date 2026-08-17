export function formatCurrency(amount: number | null | undefined, currency: string = 'USD', compact: boolean = false): string {
  if (amount === null || amount === undefined || isNaN(amount)) amount = 0;
  
  const config = {
    'XOF': { suffix: 'FCFA', locale: 'fr-CI', decimals: 0 },
    'XAF': { suffix: 'FCFA', locale: 'fr-CM', decimals: 0 },
    'EUR': { suffix: '€',    locale: 'fr-FR', decimals: 2 },
    'USD': { suffix: '$',    locale: 'en-US', decimals: 2 },
    'GBP': { suffix: '£',    locale: 'en-GB', decimals: 2 },
    'CAD': { suffix: '$ CA', locale: 'en-CA', decimals: 2 },
    'CHF': { suffix: 'CHF',  locale: 'fr-CH', decimals: 2 },
  };
  
  let curr = currency;
  if (curr === 'FCFA') curr = 'XOF';
  
  const currConfig = config[curr as keyof typeof config] || config['USD'];
  const { suffix, decimals } = currConfig;

  if (compact) {
    if (amount >= 1_000_000_000) {
      return (amount / 1_000_000_000).toLocaleString(currConfig.locale, { minimumFractionDigits: 1, maximumFractionDigits: 2 }) + ' Md ' + suffix;
    }
    if (amount >= 1_000_000) {
      return (amount / 1_000_000).toLocaleString(currConfig.locale, { minimumFractionDigits: 1, maximumFractionDigits: 2 }) + ' M ' + suffix;
    }
  }

  const formatter = new Intl.NumberFormat(currConfig.locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });

  return formatter.format(amount) + ' ' + suffix;
}
