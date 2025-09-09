// Scoring calculation utilities
export function getMaxScoreFromScoringLogic(scoringLogic) {
  try {
    const logic = String(scoringLogic || '');
    const parts = logic.split(';').map(p => p.trim()).filter(Boolean);
    const numbers = [];
    parts.forEach(part => {
      const left = part.split('=')[0];
      const digits = (left || '').replace(/[^0-9]/g, '');
      if (digits !== '') numbers.push(parseInt(digits, 10));
    });
    return numbers.length ? Math.max(...numbers) : 5;
  } catch (e) {
    return 5;
  }
}

export function computeScores(company, indicators) {
  // per-DRG aggregation and 0–10 normalization
  const DRG_KEYS = ['1', '2', '3', '4', '5', '6', '7'];
  const per_drg_totals = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0 };
  const per_drg_max = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0 };
  
  for (const ind of indicators) {
    const name = ind['Criterion/Metric Name'];
    const score = company.scores?.[name] || 0;
    const max_s = getMaxScoreFromScoringLogic(ind['Scoring Logic']);
    const drg = String(ind.get?.('DRG Short Code') || ind['DRG Short Code'] || '').trim();
    if (DRG_KEYS.includes(drg)) {
      per_drg_totals[drg] += score;
      per_drg_max[drg] += max_s;
    }
  }
  
  const per_drg = {};
  for (const k of DRG_KEYS) {
    per_drg[k] = per_drg_max[k] === 0 ? 0 : Math.round((per_drg_totals[k] / per_drg_max[k]) * 10 * 100) / 100;
  }

  // overall as normalized 0–10 across all indicators
  let max_all = 0;
  let total_all = 0;
  for (const ind of indicators) {
    const name = ind['Criterion/Metric Name'];
    const score = company.scores?.[name] || 0;
    max_all += getMaxScoreFromScoringLogic(ind['Scoring Logic']);
    total_all += score;
  }
  const overall = max_all === 0 ? 0 : Math.round((total_all / max_all) * 10 * 100) / 100;
  
  return {
    ...company,
    perDRG: per_drg,
    overallScore: overall
  };
}
