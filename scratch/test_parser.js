const { parseBankStatement, parseBankAmount, parseBankDate } = require('../lib/utils/bank-parser');

function testParser() {
  console.log("=== TEST DU PARSER BANCAIRE SERVEUR MULTI-FORMATS ===");

  // 1. Test parsing montants
  console.log("1 234,56 € ->", parseBankAmount("1 234,56 €"));
  console.log("1,234.56 ->", parseBankAmount("1,234.56"));
  console.log("1234,56 ->", parseBankAmount("1234,56"));
  console.log("1.234,56 ->", parseBankAmount("1.234,56"));

  if (parseBankAmount("1 234,56 €") !== 1234.56 || parseBankAmount("1.234,56") !== 1234.56) {
    throw new Error("Erreur de parsing de montant !");
  }

  // 2. Test parsing dates
  console.log("15/08/2026 ->", parseBankDate("15/08/2026"));
  console.log("2026-08-15 ->", parseBankDate("2026-08-15"));
  console.log("15-08-2026 ->", parseBankDate("15-08-2026"));

  if (parseBankDate("15/08/2026") !== "2026-08-15") {
    throw new Error("Erreur de parsing de date !");
  }

  // 3. Test CSV avec point-virgule et guillemets
  const csvSemicolon = `Date;Libellé;Débit;Crédit;Référence
10/08/2026;"Virement fournisseur, SARL Exemple";1 500,00;;VIR-88392
12/08/2026;"Frais de tenue de compte";25,50;;FEE-01
15/08/2026;"Remboursement avance";;500,00;ENC-99`;

  const res = parseBankStatement(csvSemicolon, '00000000-0000-0000-0000-000000000001', 'XOF', 'FR76****4812');
  console.log("Résultat parse CSV point-virgule :", {
    file_hash: res.file_hash.substring(0, 16) + '...',
    total_rows: res.total_rows,
    transactions_count: res.transactions.length
  });
  console.table(res.transactions);

  if (res.transactions.length !== 3 || res.transactions[0].debit_amount !== 1500 || res.transactions[0].bank_reference !== 'VIR-88392') {
    throw new Error("Erreur de parsing relevé CSV point-virgule !");
  }

  console.log("✓ TOUS LES TESTS DU PARSER SONT VALIDÉS !");
}

testParser();
