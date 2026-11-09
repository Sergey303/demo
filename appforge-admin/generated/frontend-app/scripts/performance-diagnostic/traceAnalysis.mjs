import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';

export async function analyzeTrace(tracePath) {
  const payload = JSON.parse(gunzipSync(await readFile(tracePath)));
  const events = payload.traceEvents ?? [];
  const thread = rendererMainThread(events);
  if (!thread) return { rendererMainThread: null, topMainThreadSlices: [], longTasks: [] };
  const complete = events.filter(event =>
    event.pid === thread.pid && event.tid === thread.tid &&
    event.ph === 'X' && Number(event.dur) > 0);
  const tasks = complete
    .filter(event => isTask(event) && event.dur >= 50_000)
    .map(task => ({ task, busy: busyDuration(childrenOf(task, complete)) }))
    .filter(entry => entry.busy >= 50_000);
  return {
    rendererMainThread: { pid: thread.pid, tid: thread.tid },
    topMainThreadSlices: topSlices(complete, 15),
    longTasks: tasks.slice(0, 10).map(entry => ({
      name: entry.task.name,
      durationMs: ms(entry.task.dur),
      busyDurationMs: ms(entry.busy),
      topSlices: topSlices(childrenOf(entry.task, complete), 8),
    })),
  };
}

function rendererMainThread(events) {
  const names = events.filter(event => event.ph === 'M' && event.name === 'thread_name');
  return names.find(event => event.args?.name === 'CrRendererMain') ??
    names.find(event => /RendererMain/u.test(event.args?.name ?? ''));
}
function childrenOf(task, events) {
  const start = task.ts;
  const end = task.ts + task.dur;
  return events.filter(event =>
    event !== task && event.ts >= start && event.ts + event.dur <= end);
}

function topSlices(events, limit) {
  return events
    .filter(event => interesting(event.name))
    .sort((left, right) => right.dur - left.dur)
    .slice(0, limit)
    .map(event => ({
      name: event.name,
      durationMs: ms(event.dur),
      url: event.args?.data?.url ?? event.args?.data?.scriptName ?? null,
    }));
}

function busyDuration(events) {
  const ranges = events
    .filter(event => !isTask(event) && interesting(event.name))
    .map(event => [event.ts, event.ts + event.dur])
    .sort((left, right) => left[0] - right[0] || left[1] - right[1]);
  let total = 0;
  let end = -1;
  for (const [start, nextEnd] of ranges) {
    if (start >= end) total += nextEnd - start;
    else if (nextEnd > end) total += nextEnd - end;
    end = Math.max(end, nextEnd);
  }
  return total;
}

function isTask(event) {
  return event.name === 'RunTask' ||
    event.name === 'ThreadControllerImpl::RunTask' ||
    event.name === 'ThreadPool_RunTask';
}

function interesting(name = '') {
  return /(?:RunTask|Evaluate|FunctionCall|EventDispatch|Layout|Style|Paint|Parse|Compile|v8\.|GC|Animation)/u.test(name);
}

function ms(microseconds) {
  return Math.round((microseconds / 1000) * 10) / 10;
}
