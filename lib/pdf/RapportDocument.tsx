import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { backgroundColor: '#FFFFFF', paddingBottom: 50 },
  coverPage: { backgroundColor: '#1E3A5F', padding: 40, display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' },
  coverTitle: { color: '#FFFFFF', fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  coverCode: { color: '#E2E8F0', fontSize: 14, textAlign: 'center', marginBottom: 40 },
  coverLine: { borderBottomWidth: 1, borderBottomColor: '#FFFFFF', marginVertical: 20, width: '50%', alignSelf: 'center' },
  coverSubtitle: { color: '#FFFFFF', fontSize: 16, textAlign: 'center', marginBottom: 10 },
  coverDate: { color: '#FFFFFF', fontSize: 12, textAlign: 'center', marginBottom: 50 },
  coverFooter: { color: '#E2E8F0', fontSize: 10, textAlign: 'center', position: 'absolute', bottom: 40, left: 0, right: 0 },
  
  headerBrand: { color: '#FFFFFF', fontSize: 14, position: 'absolute', top: 40, left: 40 },
  
  section: { padding: 30, paddingTop: 40 },
  sectionHeader: { backgroundColor: '#1E3A5F', color: '#FFFFFF', padding: 8, fontSize: 14, fontWeight: 'bold', marginBottom: 15 },
  
  table: { display: 'flex', width: '100%', borderStyle: 'solid', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 20 },
  tableRow: { margin: 'auto', flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', minHeight: 24, alignItems: 'center' },
  tableRowAlt: { backgroundColor: '#F8FAFC' },
  tableColHeader: { backgroundColor: '#F1F5F9', borderRightWidth: 1, borderRightColor: '#E2E8F0', padding: 5 },
  tableCol: { borderRightWidth: 1, borderRightColor: '#E2E8F0', padding: 5 },
  tableCellHeader: { fontSize: 10, fontWeight: 'bold', color: '#1E293B' },
  tableCell: { fontSize: 9, color: '#334155' },
  
  badge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, fontSize: 8, color: '#FFFFFF' },
  
  summaryBox: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  summaryItem: { backgroundColor: '#F8FAFC', padding: 10, borderRadius: 4, border: '1px solid #E2E8F0', flex: 1, marginHorizontal: 5 },
  summaryLabel: { fontSize: 10, color: '#64748B', marginBottom: 4 },
  summaryValue: { fontSize: 14, color: '#0F172A', fontWeight: 'bold' },

  footer: { position: 'absolute', bottom: 20, left: 30, right: 30, borderTopWidth: 1, borderTopColor: '#1E3A5F', paddingTop: 5, flexDirection: 'row', justifyContent: 'center' },
  footerText: { fontSize: 8, color: '#64748B' }
});

const getBadgeColor = (level: string) => {
  switch (level) {
    case 'objectif_global': return '#1E3A5F';
    case 'objectif_specifique': return '#3B82F6';
    case 'resultat': return '#10B981';
    case 'activite': return '#F59E0B';
    default: return '#64748B';
  }
};

const getLevelLabel = (level: string) => {
  switch (level) {
    case 'objectif_global': return 'Obj. Global';
    case 'objectif_specifique': return 'Obj. Spécifique';
    case 'resultat': return 'Résultat';
    case 'activite': return 'Activité';
    default: return level;
  }
};

const formatCurrency = (amount: number) => {
  if (amount === undefined || amount === null) return '0 FCFA';
  return Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';
};

export const RapportDocument = ({ data }: { data: any }) => {
  const { project, logframeItems, budgetConsumption, evmSummary, evmIndicators, procurementPlan, risks, dateString } = data;
  
  const budgetByCategory = budgetConsumption.reduce((acc: any, curr: any) => {
    const codeParts = curr.code.split('.');
    const mainCategory = codeParts[0] || 'Autre';
    if (!acc[mainCategory]) acc[mainCategory] = [];
    acc[mainCategory].push(curr);
    return acc;
  }, {});

  const bac = evmSummary?.bac_total || 0;
  const eac = evmSummary?.eac_global || 0;
  const vac = bac - eac;
  const cpi = evmSummary?.cpi_global || 1;
  const spi = evmSummary?.spi_global || 1;

  const totalBudget = budgetConsumption.reduce((acc: number, curr: any) => acc + (curr.initial_allocated_amount || 0), 0);
  const totalDecaisse = budgetConsumption.reduce((acc: number, curr: any) => acc + (curr.total_decaisse || 0), 0);
  const globalRate = totalBudget > 0 ? (totalDecaisse / totalBudget) * 100 : 0;

  return (
    <Document>
      <Page size="A4" style={styles.coverPage}>
        <Text style={styles.headerBrand}>ProjetPilote</Text>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Text style={styles.coverTitle}>{project.name}</Text>
          <Text style={styles.coverCode}>{project.code}</Text>
          <View style={styles.coverLine} />
          <Text style={styles.coverSubtitle}>RAPPORT DE SUIVI ET D'ÉVALUATION</Text>
          <Text style={styles.coverDate}>Période arrêtée au {dateString}</Text>
        </View>
        <Text style={styles.coverFooter}>Généré avec ProjetPilote</Text>
      </Page>

      {data.executiveSummary && (
        <Page size="A4" style={styles.page} wrap>
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>RÉSUMÉ EXÉCUTIF</Text>
            <Text style={{ fontSize: 14, lineHeight: 1.5, color: '#334155', textAlign: 'justify' }}>
              {data.executiveSummary}
            </Text>
          </View>
        </Page>
      )}

      <Page size="A4" style={styles.page} wrap>
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>1. Cadre Logique</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableColHeader]}>
              <View style={[styles.tableCol, { width: '15%' }]}><Text style={styles.tableCellHeader}>Niveau</Text></View>
              <View style={[styles.tableCol, { width: '35%' }]}><Text style={styles.tableCellHeader}>Description</Text></View>
              <View style={[styles.tableCol, { width: '20%' }]}><Text style={styles.tableCellHeader}>IOV</Text></View>
              <View style={[styles.tableCol, { width: '15%' }]}><Text style={styles.tableCellHeader}>Cible</Text></View>
              <View style={[styles.tableCol, { width: '15%', borderRightWidth: 0 }]}><Text style={styles.tableCellHeader}>Hypothèses</Text></View>
            </View>
            {logframeItems.map((item: any, i: number) => (
              <View key={item.id} style={[styles.tableRow, i % 2 !== 0 ? styles.tableRowAlt : {}]}>
                <View style={[styles.tableCol, { width: '15%' }]}>
                  <View style={[styles.badge, { backgroundColor: getBadgeColor(item.level) }]}>
                    <Text>{getLevelLabel(item.level)}</Text>
                  </View>
                </View>
                <View style={[styles.tableCol, { width: '35%' }]}><Text style={styles.tableCell}>{item.description}</Text></View>
                <View style={[styles.tableCol, { width: '20%' }]}><Text style={styles.tableCell}>{item.indicators}</Text></View>
                <View style={[styles.tableCol, { width: '15%' }]}><Text style={styles.tableCell}>{item.target_value}</Text></View>
                <View style={[styles.tableCol, { width: '15%', borderRightWidth: 0 }]}><Text style={styles.tableCell}>{item.assumptions}</Text></View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>2. Budget et Consommation</Text>
          <View style={styles.summaryBox}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Budget Total</Text>
              <Text style={styles.summaryValue}>{formatCurrency(totalBudget)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Décaissé</Text>
              <Text style={styles.summaryValue}>{formatCurrency(totalDecaisse)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Taux Global</Text>
              <Text style={styles.summaryValue}>{globalRate.toFixed(1)}%</Text>
            </View>
          </View>
          
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableColHeader]}>
              <View style={[styles.tableCol, { width: '25%' }]}><Text style={styles.tableCellHeader}>Ligne</Text></View>
              <View style={[styles.tableCol, { width: '15%' }]}><Text style={styles.tableCellHeader}>Budget Initial</Text></View>
              <View style={[styles.tableCol, { width: '15%' }]}><Text style={styles.tableCellHeader}>Engagé</Text></View>
              <View style={[styles.tableCol, { width: '15%' }]}><Text style={styles.tableCellHeader}>Décaissé</Text></View>
              <View style={[styles.tableCol, { width: '15%' }]}><Text style={styles.tableCellHeader}>Solde</Text></View>
              <View style={[styles.tableCol, { width: '15%', borderRightWidth: 0 }]}><Text style={styles.tableCellHeader}>Taux</Text></View>
            </View>
            
            {Object.keys(budgetByCategory).sort().map(cat => (
              <React.Fragment key={cat}>
                <View style={[styles.tableRow, { backgroundColor: '#EFF6FF' }]}>
                  <View style={[styles.tableCol, { width: '100%', borderRightWidth: 0 }]}><Text style={[styles.tableCell, { fontWeight: 'bold' }]}>Catégorie {cat}</Text></View>
                </View>
                {budgetByCategory[cat].map((row: any) => {
                  const rate = row.initial_allocated_amount > 0 ? (row.total_decaisse / row.initial_allocated_amount) * 100 : 0;
                  const bgCell = rate > 100 ? '#FEE2E2' : '#FFFFFF';
                  return (
                    <View key={row.id} style={styles.tableRow}>
                      <View style={[styles.tableCol, { width: '25%' }]}><Text style={styles.tableCell}>{row.code} - {row.label}</Text></View>
                      <View style={[styles.tableCol, { width: '15%' }]}><Text style={styles.tableCell}>{formatCurrency(row.initial_allocated_amount)}</Text></View>
                      <View style={[styles.tableCol, { width: '15%' }]}><Text style={styles.tableCell}>{formatCurrency(row.total_engage)}</Text></View>
                      <View style={[styles.tableCol, { width: '15%' }]}><Text style={styles.tableCell}>{formatCurrency(row.total_decaisse)}</Text></View>
                      <View style={[styles.tableCol, { width: '15%' }]}><Text style={styles.tableCell}>{formatCurrency(row.solde_disponible)}</Text></View>
                      <View style={[styles.tableCol, { width: '15%', borderRightWidth: 0, backgroundColor: bgCell }]}><Text style={styles.tableCell}>{rate.toFixed(1)}%</Text></View>
                    </View>
                  )
                })}
              </React.Fragment>
            ))}
          </View>
        </View>

        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionHeader}>3. Analyse de la Valeur Acquise (EVM)</Text>
          <View style={styles.summaryBox}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>BAC Total</Text>
              <Text style={styles.summaryValue}>{formatCurrency(bac)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>EAC Global</Text>
              <Text style={styles.summaryValue}>{formatCurrency(eac)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>VAC (Variance)</Text>
              <Text style={[styles.summaryValue, { color: vac < 0 ? '#DC2626' : '#16A34A' }]}>{formatCurrency(vac)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>CPI Global</Text>
              <Text style={[styles.summaryValue, { color: cpi >= 1 ? '#16A34A' : cpi >= 0.9 ? '#F59E0B' : '#DC2626' }]}>{Number(cpi).toFixed(2)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>SPI Global</Text>
              <Text style={[styles.summaryValue, { color: spi >= 1 ? '#16A34A' : spi >= 0.9 ? '#F59E0B' : '#DC2626' }]}>{Number(spi).toFixed(2)}</Text>
            </View>
          </View>
          
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableColHeader]}>
              <View style={[styles.tableCol, { width: '15%' }]}><Text style={styles.tableCellHeader}>Code</Text></View>
              <View style={[styles.tableCol, { width: '30%' }]}><Text style={styles.tableCellHeader}>Description</Text></View>
              <View style={[styles.tableCol, { width: '10%' }]}><Text style={styles.tableCellHeader}>% Av.</Text></View>
              <View style={[styles.tableCol, { width: '15%' }]}><Text style={styles.tableCellHeader}>BAC</Text></View>
              <View style={[styles.tableCol, { width: '15%' }]}><Text style={styles.tableCellHeader}>AC</Text></View>
              <View style={[styles.tableCol, { width: '7%' }]}><Text style={styles.tableCellHeader}>CPI</Text></View>
              <View style={[styles.tableCol, { width: '8%', borderRightWidth: 0 }]}><Text style={styles.tableCellHeader}>SPI</Text></View>
            </View>
            {evmIndicators.map((ind: any, i: number) => (
              <View key={ind.id} style={[styles.tableRow, i % 2 !== 0 ? styles.tableRowAlt : {}]}>
                <View style={[styles.tableCol, { width: '15%' }]}><Text style={styles.tableCell}>{ind.code}</Text></View>
                <View style={[styles.tableCol, { width: '30%' }]}><Text style={styles.tableCell}>{ind.name}</Text></View>
                <View style={[styles.tableCol, { width: '10%' }]}><Text style={styles.tableCell}>{ind.percent_complete}%</Text></View>
                <View style={[styles.tableCol, { width: '15%' }]}><Text style={styles.tableCell}>{formatCurrency(ind.budget_allocated)}</Text></View>
                <View style={[styles.tableCol, { width: '15%' }]}><Text style={styles.tableCell}>{formatCurrency(ind.actual_cost)}</Text></View>
                <View style={[styles.tableCol, { width: '7%', backgroundColor: ind.cpi < 0.9 ? '#FEE2E2' : 'transparent' }]}><Text style={styles.tableCell}>{Number(ind.cpi).toFixed(2)}</Text></View>
                <View style={[styles.tableCol, { width: '8%', borderRightWidth: 0, backgroundColor: ind.spi < 0.9 ? '#FEE2E2' : 'transparent' }]}><Text style={styles.tableCell}>{Number(ind.spi).toFixed(2)}</Text></View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionHeader}>4. Plan de Passation des Marchés</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableColHeader]}>
              <View style={[styles.tableCol, { width: '30%' }]}><Text style={styles.tableCellHeader}>Description</Text></View>
              <View style={[styles.tableCol, { width: '10%' }]}><Text style={styles.tableCellHeader}>Type</Text></View>
              <View style={[styles.tableCol, { width: '15%' }]}><Text style={styles.tableCellHeader}>Méthode</Text></View>
              <View style={[styles.tableCol, { width: '15%' }]}><Text style={styles.tableCellHeader}>Date Avis</Text></View>
              <View style={[styles.tableCol, { width: '15%' }]}><Text style={styles.tableCellHeader}>Date Signature</Text></View>
              <View style={[styles.tableCol, { width: '15%', borderRightWidth: 0 }]}><Text style={styles.tableCellHeader}>Montant</Text></View>
            </View>
            {procurementPlan.map((proc: any, i: number) => {
              const isLate = proc.planned_notice_date && new Date(proc.planned_notice_date) < new Date() && proc.status !== 'attribue';
              return (
                <View key={proc.id} style={[styles.tableRow, i % 2 !== 0 ? styles.tableRowAlt : {}]}>
                  <View style={[styles.tableCol, { width: '30%' }]}><Text style={[styles.tableCell, isLate ? { color: '#DC2626' } : {}]}>{proc.description}</Text></View>
                  <View style={[styles.tableCol, { width: '10%' }]}><Text style={styles.tableCell}>{proc.procurement_type}</Text></View>
                  <View style={[styles.tableCol, { width: '15%' }]}><Text style={styles.tableCell}>{proc.procurement_method}</Text></View>
                  <View style={[styles.tableCol, { width: '15%' }]}><Text style={styles.tableCell}>{proc.planned_notice_date}</Text></View>
                  <View style={[styles.tableCol, { width: '15%' }]}><Text style={styles.tableCell}>{proc.planned_contract_date}</Text></View>
                  <View style={[styles.tableCol, { width: '15%', borderRightWidth: 0 }]}><Text style={styles.tableCell}>{formatCurrency(proc.estimated_amount)}</Text></View>
                </View>
              )
            })}
          </View>
        </View>

        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionHeader}>5. Matrice des Risques</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableColHeader]}>
              <View style={[styles.tableCol, { width: '10%' }]}><Text style={styles.tableCellHeader}>Cat.</Text></View>
              <View style={[styles.tableCol, { width: '30%' }]}><Text style={styles.tableCellHeader}>Description</Text></View>
              <View style={[styles.tableCol, { width: '5%' }]}><Text style={styles.tableCellHeader}>P</Text></View>
              <View style={[styles.tableCol, { width: '5%' }]}><Text style={styles.tableCellHeader}>I</Text></View>
              <View style={[styles.tableCol, { width: '10%' }]}><Text style={styles.tableCellHeader}>Criticité</Text></View>
              <View style={[styles.tableCol, { width: '25%' }]}><Text style={styles.tableCellHeader}>Stratégie</Text></View>
              <View style={[styles.tableCol, { width: '15%', borderRightWidth: 0 }]}><Text style={styles.tableCellHeader}>Resp.</Text></View>
            </View>
            {risks.map((risk: any, i: number) => {
              const bgCrit = risk.criticality >= 9 ? '#FEE2E2' : risk.criticality >= 6 ? '#FEF3C7' : '#D1FAE5';
              const colCrit = risk.criticality >= 9 ? '#DC2626' : risk.criticality >= 6 ? '#D97706' : '#059669';
              return (
                <View key={risk.id} style={[styles.tableRow, i % 2 !== 0 ? styles.tableRowAlt : {}]}>
                  <View style={[styles.tableCol, { width: '10%' }]}><Text style={styles.tableCell}>{risk.category}</Text></View>
                  <View style={[styles.tableCol, { width: '30%' }]}><Text style={styles.tableCell}>{risk.description}</Text></View>
                  <View style={[styles.tableCol, { width: '5%' }]}><Text style={styles.tableCell}>{risk.probability}</Text></View>
                  <View style={[styles.tableCol, { width: '5%' }]}><Text style={styles.tableCell}>{risk.impact}</Text></View>
                  <View style={[styles.tableCol, { width: '10%', backgroundColor: bgCrit }]}><Text style={[styles.tableCell, { color: colCrit, fontWeight: 'bold' }]}>{risk.criticality}</Text></View>
                  <View style={[styles.tableCol, { width: '25%' }]}><Text style={styles.tableCell}>{risk.mitigation_strategy}</Text></View>
                  <View style={[styles.tableCol, { width: '15%', borderRightWidth: 0 }]}><Text style={styles.tableCell}>{risk.responsible}</Text></View>
                </View>
              )
            })}
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>ProjetPilote — {project.name} — Confidentiel — Arrêté au {dateString} — Page </Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => (`${pageNumber} / ${totalPages}`)} />
        </View>
      </Page>
    </Document>
  );
};
