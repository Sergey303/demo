export function summarizeRouteDiagnostic(route, data, protocol, consoleErrors) {
  const resources = data.resources.map(resource => ({ ...resource, kind: resourceKind(resource) }));
  const longTaskDurations = data.observer.longTasks.map(task => task.duration);
  const transferBytes = resources.reduce((sum, resource) => sum + resource.transferSize, 0);
  return {
    route,
    metrics: {
      fcpMs: paintTime(data.paints, 'first-contentful-paint'),
      lcpMs: round(data.observer.lcpMs),
      cls: round(data.observer.cls, 4),
      longTaskCount: longTaskDurations.length,
      longTaskTotalMs: round(longTaskDurations.reduce((sum, value) => sum + value, 0)),
      longTaskMaxMs: round(Math.max(0, ...longTaskDurations)),
      domContentLoadedMs: round(data.navigation?.domContentLoadedEventEnd ?? 0),
      loadMs: round(data.navigation?.loadEventEnd ?? 0),
      transferKb: kb(transferBytes),
      resourceCount: resources.length,
      scriptTransferKb: kb(sumTransfer(resources, 'script')),
      stylesheetTransferKb: kb(sumTransfer(resources, 'stylesheet')),
      fontTransferKb: kb(sumTransfer(resources, 'font')),
      taskDurationMs: secondsToMs(protocol.TaskDuration),
      scriptDurationMs: secondsToMs(protocol.ScriptDuration),
      layoutDurationMs: secondsToMs(protocol.LayoutDuration),
      recalcStyleDurationMs: secondsToMs(protocol.RecalcStyleDuration),
      jsHeapUsedMb: mb(protocol.JSHeapUsedSize),
      nodes: protocol.Nodes ?? null,
      layoutCount: protocol.LayoutCount ?? null,
      recalcStyleCount: protocol.RecalcStyleCount ?? null,
    },
    marks: data.marks,
    topTransferResources: [...resources]
      .sort((left, right) => right.transferSize - left.transferSize)
      .slice(0, 12),
    slowestResources: [...resources]
      .sort((left, right) => right.duration - left.duration)
      .slice(0, 12),
    consoleErrors,
  };
}

function resourceKind(resource) {
  const pathname = new URL(resource.name).pathname;
  if (/\.m?js$/u.test(pathname)) return 'script';
  if (/\.css$/u.test(pathname)) return 'stylesheet';
  if (/\.(?:woff2?|ttf|otf)$/u.test(pathname)) return 'font';
  return resource.initiatorType || 'other';
}
function sumTransfer(resources, kind) {
  return resources.filter(resource => resource.kind === kind)
    .reduce((sum, resource) => sum + resource.transferSize, 0);
}

function paintTime(paints, name) {
  return round(paints.find(entry => entry.name === name)?.startTime ?? 0);
}

function secondsToMs(value) {
  return value == null ? null : round(value * 1000);
}

function kb(value) {
  return round(value / 1024, 1);
}

function mb(value) {
  return value == null ? null : round(value / (1024 * 1024), 1);
}

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
