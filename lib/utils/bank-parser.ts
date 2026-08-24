import crypto from 'crypto'

export interface ParsedBankTransaction {
  source_row_index: number
  transaction_date: string
  value_date?: string | null
  description: string
  bank_reference?: string | null
  debit_amount: number
  credit_amount: number
  currency: string
  fingerprint: string
  fingerprint_level: 'STABLE_REF' | 'HEURISTIC'
}

export interface ParseBankStatementResult {
  file_hash: string
  account_reference?: string | null
  statement_start_date?: string | null
  statement_end_date?: string | null
  currency: string
  total_rows: number
  transactions: ParsedBankTransaction[]
  errors: string[]
}

/**
 * Normalise un texte (supprime accents superflus, espaces multiples, mise en minuscules)
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Parse un montant au format français ("1 234,56", "1.234,56 €") ou international ("1,234.56")
 */
export function parseBankAmount(raw: string | number | undefined | null): number {
  if (raw === undefined || raw === null) return 0
  if (typeof raw === 'number') return isNaN(raw) ? 0 : Math.abs(raw)

  let clean = raw.trim().replace(/[^\d.,\-+]/g, '')
  if (!clean) return 0

  // Si virgule et point présents : déterminer le séparateur décimal
  if (clean.includes(',') && clean.includes('.')) {
    if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
      // Format 1.234,56 -> 1234.56
      clean = clean.replace(/\./g, '').replace(',', '.')
    } else {
      // Format 1,234.56 -> 1234.56
      clean = clean.replace(/,/g, '')
    }
  } else if (clean.includes(',')) {
    // Format 1234,56 -> 1234.56
    clean = clean.replace(',', '.')
  }

  const val = parseFloat(clean)
  return isNaN(val) ? 0 : Math.abs(val)
}

/**
 * Parse une date au format DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY, etc.
 */
export function parseBankDate(raw: string | undefined | null): string | null {
  if (!raw) return null
  const clean = raw.trim().replace(/^"|"$/g, '')

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const d = new Date(clean)
    return isNaN(d.getTime()) ? null : clean
  }

  // DD/MM/YYYY ou DD-MM-YYYY
  const parts = clean.split(/[/.-]/)
  if (parts.length === 3) {
    let day = parseInt(parts[0], 10)
    let month = parseInt(parts[1], 10)
    let year = parseInt(parts[2], 10)

    // Si année sur 2 chiffres
    if (year < 100) year += 2000

    // Si format YYYY/MM/DD
    if (parts[0].length === 4) {
      year = parseInt(parts[0], 10)
      month = parseInt(parts[1], 10)
      day = parseInt(parts[2], 10)
    }

    if (year > 1900 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const dStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const d = new Date(dStr)
      return isNaN(d.getTime()) ? null : dStr
    }
  }

  return null
}

/**
 * Découpeur CSV respectant les quotes RFC 4180
 */
function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++ // saute double quote
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result.map(s => s.replace(/^"|"$/g, '').trim())
}

/**
 * Détecte le délimiteur principal d'un texte CSV (',', ';', '\t')
 */
function detectDelimiter(headerLine: string): string {
  const commas = (headerLine.match(/,/g) || []).length
  const semicolons = (headerLine.match(/;/g) || []).length
  const tabs = (headerLine.match(/\t/g) || []).length

  if (semicolons >= commas && semicolons >= tabs && semicolons > 0) return ';'
  if (tabs >= commas && tabs >= semicolons && tabs > 0) return '\t'
  return ','
}

/**
 * Calcule la fingerprint déterministe d'une transaction
 */
export function calculateTransactionFingerprint(
  projectId: string,
  accountRef: string | null | undefined,
  transaction: {
    transaction_date: string
    value_date?: string | null
    description: string
    bank_reference?: string | null
    debit_amount: number
    credit_amount: number
  }
): { fingerprint: string, level: 'STABLE_REF' | 'HEURISTIC' } {
  const acc = accountRef ? normalizeText(accountRef) : 'DEF_ACC'

  if (transaction.bank_reference && transaction.bank_reference.trim().length >= 4) {
    const cleanRef = normalizeText(transaction.bank_reference)
    const raw = `${projectId}|${acc}|${cleanRef}|${transaction.transaction_date}|${transaction.debit_amount.toFixed(2)}`
    return {
      fingerprint: crypto.createHash('sha256').update(raw).digest('hex'),
      level: 'STABLE_REF'
    }
  }

  const cleanDesc = normalizeText(transaction.description)
  const vDate = transaction.value_date || transaction.transaction_date
  const raw = `${projectId}|${acc}|${transaction.transaction_date}|${vDate}|${transaction.debit_amount.toFixed(2)}|${transaction.credit_amount.toFixed(2)}|${cleanDesc}`
  return {
    fingerprint: crypto.createHash('sha256').update(raw).digest('hex'),
    level: 'HEURISTIC'
  }
}

/**
 * Parse un relevé bancaire brut (CSV / Texte)
 */
export function parseBankStatement(
  fileContent: string,
  projectId: string,
  projectCurrency: string = 'XOF',
  accountReference?: string | null
): ParseBankStatementResult {
  const fileHash = crypto.createHash('sha256').update(fileContent, 'utf8').digest('hex')
  const lines = fileContent.split(/\r?\n/).filter(l => l.trim().length > 0)

  if (lines.length === 0) {
    return {
      file_hash: fileHash,
      account_reference: accountReference || null,
      statement_start_date: null,
      statement_end_date: null,
      currency: projectCurrency,
      total_rows: 0,
      transactions: [],
      errors: ['Fichier vide']
    }
  }

  const delimiter = detectDelimiter(lines[0])
  const headerCols = parseCsvLine(lines[0], delimiter).map(c => normalizeText(c))

  // Détection des index de colonnes
  let dateIdx = headerCols.findIndex(c => c.includes('date') && !c.includes('valeur'))
  let valueDateIdx = headerCols.findIndex(c => c.includes('valeur'))
  let descIdx = headerCols.findIndex(c => c.includes('libelle') || c.includes('description') || c.includes('operation') || c.includes('detail'))
  let refIdx = headerCols.findIndex(c => c.includes('reference') || c.includes('ref') || c.includes('piece') || c.includes('numero') || c.includes('num'))
  let debitIdx = headerCols.findIndex(c => c.includes('debit') || c.includes('depense') || c.includes('sortie'))
  let creditIdx = headerCols.findIndex(c => c.includes('credit') || c.includes('recette') || c.includes('entree'))
  let amountIdx = headerCols.findIndex(c => c === 'montant' || c === 'montant devise' || c === 'amount')

  // Fallbacks positionnels si en-tête non reconnu
  if (dateIdx === -1) dateIdx = 0
  if (descIdx === -1) descIdx = 1
  if (debitIdx === -1 && amountIdx !== -1) debitIdx = amountIdx
  if (debitIdx === -1 && headerCols.length >= 3) debitIdx = 2
  if (creditIdx === -1 && headerCols.length >= 4) creditIdx = 3

  const transactions: ParsedBankTransaction[] = []
  const errors: string[] = []
  let minDate: string | null = null
  let maxDate: string | null = null

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i], delimiter)
    if (cols.length < 2) continue

    const rawDate = cols[dateIdx]
    const parsedDate = parseBankDate(rawDate)

    if (!parsedDate) {
      // Ligne non reconnue ou commentaire
      continue
    }

    const rawValueDate = valueDateIdx !== -1 ? cols[valueDateIdx] : null
    const parsedValueDate = parseBankDate(rawValueDate)

    const rawDesc = descIdx !== -1 && cols[descIdx] ? cols[descIdx] : `Opération ligne ${i}`
    const rawRef = refIdx !== -1 && cols[refIdx] ? cols[refIdx] : null

    let debit = debitIdx !== -1 ? parseBankAmount(cols[debitIdx]) : 0
    let credit = creditIdx !== -1 ? parseBankAmount(cols[creditIdx]) : 0

    // Si une seule colonne montant avec signe négatif
    if (debitIdx === amountIdx && amountIdx !== -1) {
      const rawAmtStr = cols[amountIdx] || ''
      if (rawAmtStr.includes('-')) {
        debit = parseBankAmount(rawAmtStr)
        credit = 0
      } else {
        credit = parseBankAmount(rawAmtStr)
        debit = 0
      }
    }

    if (debit === 0 && credit === 0) continue

    // Suivi des dates min et max
    if (!minDate || parsedDate < minDate) minDate = parsedDate
    if (!maxDate || parsedDate > maxDate) maxDate = parsedDate

    const { fingerprint, level } = calculateTransactionFingerprint(projectId, accountReference, {
      transaction_date: parsedDate,
      value_date: parsedValueDate,
      description: rawDesc,
      bank_reference: rawRef,
      debit_amount: debit,
      credit_amount: credit
    })

    transactions.push({
      source_row_index: i,
      transaction_date: parsedDate,
      value_date: parsedValueDate,
      description: rawDesc,
      bank_reference: rawRef,
      debit_amount: debit,
      credit_amount: credit,
      currency: projectCurrency,
      fingerprint,
      fingerprint_level: level
    })
  }

  return {
    file_hash: fileHash,
    account_reference: accountReference ? accountReference.slice(-8) : null,
    statement_start_date: minDate,
    statement_end_date: maxDate,
    currency: projectCurrency,
    total_rows: transactions.length,
    transactions,
    errors
  }
}
