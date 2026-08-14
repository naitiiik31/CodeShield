export function generateExplanation(input) {
  const explanations = [];

  if (input.adjustedScore >= 0.7) {
    explanations.push(
      `Very high fingerprint similarity (${(input.adjustedScore * 100).toFixed(1)}%) detected after boilerplate adjustment.`
    );
  } else if (input.adjustedScore >= 0.4) {
    explanations.push(
      `Moderate fingerprint similarity (${(input.adjustedScore * 100).toFixed(1)}%) detected after boilerplate adjustment.`
    );
  } else if (input.adjustedScore >= 0.2) {
    explanations.push(
      `Low-moderate fingerprint similarity (${(input.adjustedScore * 100).toFixed(1)}%) detected after boilerplate adjustment.`
    );
  }

  if (input.boilerplateOverlap > 0) {
    const rawPct = (input.rawScore * 100).toFixed(1);
    const adjPct = (input.adjustedScore * 100).toFixed(1);
    const bpPct = (input.boilerplateOverlap * 100).toFixed(1);
    explanations.push(
      `Raw similarity was ${rawPct}%, reduced to ${adjPct}% after excluding ${bpPct}% boilerplate overlap.`
    );
  }

  if (input.matchedRegions && input.matchedRegions.length > 0) {
    explanations.push(
      `${input.matchedRegions.length} distinct matching code region(s) identified.`
    );

    const coverageA = calculateLineCoverage(
      input.matchedRegions.map((r) => ({ start: r.startLineA, end: r.endLineA }))
    );
    const coverageB = calculateLineCoverage(
      input.matchedRegions.map((r) => ({ start: r.startLineB, end: r.endLineB }))
    );

    if (coverageA > 5 || coverageB > 5) {
      explanations.push(
        `Matching regions span approximately ${coverageA} lines in submission A and ${coverageB} lines in submission B.`
      );
    }
  }

  const renamingDetected = detectVariableRenaming(input.tokensA || [], input.tokensB || []);
  if (renamingDetected) {
    explanations.push(
      'Variable renaming pattern detected: submissions use different identifier names but identical structural patterns.'
    );
  }

  const structuralSimilarity = analyzeStructuralPatterns(input.tokensA || [], input.tokensB || []);
  if (structuralSimilarity.loopSimilarity) {
    explanations.push('Similar loop structure detected (matching loop constructs and body patterns).');
  }
  if (structuralSimilarity.conditionalSimilarity) {
    explanations.push('Similar conditional structure detected (matching if/else patterns).');
  }
  if (structuralSimilarity.functionSimilarity) {
    explanations.push('Similar function structure detected (matching function definitions and call patterns).');
  }

  if (input.nonBoilerplateMatches && input.nonBoilerplateMatches.length > 0) {
    explanations.push(
      `${input.nonBoilerplateMatches.length} non-boilerplate fingerprint matches found between submissions.`
    );
  }

  if (explanations.length === 0) {
    explanations.push('No significant similarity evidence detected.');
  }

  return explanations;
}

export function determineRiskLevel(adjustedScore, threshold = 0.5) {
  const highCutoff = Math.max(0.7, threshold);
  const mediumCutoff = Math.min(0.4, threshold * 0.8);

  if (adjustedScore >= highCutoff) return 'high';
  if (adjustedScore >= mediumCutoff) return 'medium';
  return 'low';
}

function calculateLineCoverage(ranges) {
  if (!ranges || ranges.length === 0) return 0;
  const lines = new Set();
  for (const range of ranges) {
    for (let l = range.start; l <= range.end; l++) {
      lines.add(l);
    }
  }
  return lines.size;
}

function detectVariableRenaming(tokensA, tokensB) {
  const structA = tokensA.map((t) => t.type);
  const structB = tokensB.map((t) => t.type);

  const windowSize = Math.min(20, structA.length, structB.length);
  if (windowSize < 5) return false;

  const seqA = structA.slice(0, windowSize).join(' ');
  const seqB = structB.slice(0, windowSize).join(' ');

  if (seqA === seqB) {
    const origVarsA = tokensA
      .filter((t) => t.type === 'VAR')
      .slice(0, 10)
      .map((t) => t.original);
    const origVarsB = tokensB
      .filter((t) => t.type === 'VAR')
      .slice(0, 10)
      .map((t) => t.original);

    let diffCount = 0;
    const compareLen = Math.min(origVarsA.length, origVarsB.length);
    for (let i = 0; i < compareLen; i++) {
      if (origVarsA[i] !== origVarsB[i]) diffCount++;
    }

    return compareLen > 0 && diffCount / compareLen > 0.3;
  }

  return false;
}

function analyzeStructuralPatterns(tokensA, tokensB) {
  const loopTokens = new Set(['FOR', 'WHILE']);
  const condTokens = new Set(['IF', 'ELSE', 'ELIF']);
  const funcTokens = new Set(['DEF', 'FUNCTION']);

  const loopCountA = tokensA.filter((t) => loopTokens.has(t.type)).length;
  const loopCountB = tokensB.filter((t) => loopTokens.has(t.type)).length;
  const condCountA = tokensA.filter((t) => condTokens.has(t.type)).length;
  const condCountB = tokensB.filter((t) => condTokens.has(t.type)).length;
  const funcCountA = tokensA.filter((t) => funcTokens.has(t.type)).length;
  const funcCountB = tokensB.filter((t) => funcTokens.has(t.type)).length;

  return {
    loopSimilarity: loopCountA > 0 && loopCountA === loopCountB,
    conditionalSimilarity: condCountA > 0 && condCountA === condCountB,
    functionSimilarity: funcCountA > 0 && funcCountA === funcCountB,
  };
}
