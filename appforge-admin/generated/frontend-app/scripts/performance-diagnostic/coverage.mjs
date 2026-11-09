export async function startCoverage(cdp) {
  const styleSheets = new Map();
  cdp.on('CSS.styleSheetAdded', event => {
    if (event.header?.sourceURL) styleSheets.set(event.header.styleSheetId, event.header.sourceURL);
  });
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.startPreciseCoverage', { callCount: false, detailed: true });
  await cdp.send('CSS.startRuleUsageTracking');
  return async () => {
    const jsResult = await cdp.send('Profiler.takePreciseCoverage');
    const cssResult = await cdp.send('CSS.stopRuleUsageTracking');
    await cdp.send('Profiler.stopPreciseCoverage');
    return {
      javascript: summarizeJavaScript(jsResult.result),
      stylesheets: await summarizeStylesheets(cdp, cssResult.ruleUsage, styleSheets),
    };
  };
}

function summarizeJavaScript(entries) {
  const resources = entries
    .filter(entry => /^https?:/u.test(entry.url))
    .map(entry => {
      const ranges = entry.functions.flatMap(fn => fn.ranges);
      const totalChars = Math.max(0, ...ranges.map(range => range.endOffset));
      const unusedChars = unionLength(ranges.filter(range => range.count === 0));
      return coverageResource(entry.url, totalChars, totalChars - unusedChars);
    })
    .filter(resource => resource.totalChars > 0);
  return coverageGroup(resources);
}
async function summarizeStylesheets(cdp, usage, styleSheets) {
  const bySheet = new Map();
  for (const rule of usage) {
    const list = bySheet.get(rule.styleSheetId) ?? [];
    list.push(rule);
    bySheet.set(rule.styleSheetId, list);
  }
  const resources = [];
  for (const [styleSheetId, rules] of bySheet) {
    const url = styleSheets.get(styleSheetId);
    if (!url || !/^https?:/u.test(url)) continue;
    const text = await cdp.send('CSS.getStyleSheetText', { styleSheetId });
    const usedChars = unionLength(rules.filter(rule => rule.used));
    resources.push(coverageResource(url, text.text.length, usedChars));
  }
  return coverageGroup(resources);
}

function coverageGroup(resources) {
  const totalChars = resources.reduce((sum, resource) => sum + resource.totalChars, 0);
  const usedChars = resources.reduce((sum, resource) => sum + resource.usedChars, 0);
  return {
    totalChars,
    usedChars,
    unusedChars: totalChars - usedChars,
    usedPercent: percent(usedChars, totalChars),
    topUnusedResources: [...resources]
      .sort((left, right) => right.unusedChars - left.unusedChars)
      .slice(0, 12),
  };
}
function coverageResource(url, totalChars, usedChars) {
  const safeUsed = Math.max(0, Math.min(totalChars, usedChars));
  return {
    url,
    totalChars,
    usedChars: safeUsed,
    unusedChars: totalChars - safeUsed,
    usedPercent: percent(safeUsed, totalChars),
  };
}

function unionLength(ranges) {
  const sorted = ranges
    .map(range => [range.startOffset, range.endOffset])
    .filter(([start, end]) => end > start)
    .sort((left, right) => left[0] - right[0] || left[1] - right[1]);
  let total = 0;
  let start = -1;
  let end = -1;
  for (const range of sorted) {
    if (range[0] > end) {
      total += Math.max(0, end - start);
      [start, end] = range;
    } else {
      end = Math.max(end, range[1]);
    }
  }
  return total + Math.max(0, end - start);
}

function percent(value, total) {
  return total ? Math.round((value / total) * 1000) / 10 : 0;
}
