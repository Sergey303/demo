const count = value => Number.isSafeInteger(value) && value >= 0
const positive = value => count(value) && value > 0
const text = value => typeof value === 'string' && value.trim().length > 0
const digest = value => text(value) && /^[a-f0-9]{64}$/.test(value)
const finite = value => Number.isFinite(value) && value >= 0
const probability = value => finite(value) && value <= 1
const oneOf = (...values) => value => values.includes(value)
const list = predicate => value => Array.isArray(value) && value.every(predicate)
const fields = (keys, predicate) => Object.fromEntries(keys.split(' ').map(key => [key, predicate]))
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value)

function check(valid, path) {
  if (!valid) throw new Error(`Invalid evidence at ${path}`)
}

function shape(value, schema, path) {
  check(isRecord(value), path)
  for (const key of Object.keys(value)) check(Object.hasOwn(schema, key), `${path}.${key}`)
  for (const [key, predicate] of Object.entries(schema)) {
    check(Object.hasOwn(value, key) && predicate(value[key]), `${path}.${key}`)
  }
}

function read(json, name) {
  try {
    return JSON.parse(json, (key, value) => {
      if (['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error('unsafe key')
      return value
    })
  } catch (error) {
    throw new Error(`Invalid ${name} evidence: ${error.message}`)
  }
}

const confusion = 'tp tn fp fn'
const modes = ['rule_only', 'assisted']
const metrics = {
  bgp: 'steps no_route_steps',
  anycast: 'stages overload_events unassigned_client_events interrupted_session_events',
  anomaly: `records ${confusion}`,
  policy: 'records new_observations model_fallbacks hard_blocked_benign ' +
    modes.flatMap(mode => confusion.split(' ').map(key => `${mode}_${key}`)).join(' '),
}
const cases = {
  bgp: fields('no_route_steps recovered_steps', list(count)),
  anycast: fields('overloaded_stages unassigned_stages interrupted_stages', list(text)),
  anomaly: {},
  policy: fields('fallback_ids advisory_ids', list(text)),
}
const sum = numbers => numbers.reduce((total, number) => total + number, 0)

function offlineReport(report) {
  shape(report, {
    schema_version: oneOf(1), scenario: oneOf('offline-edge-fixtures'),
    status: oneOf('ok', 'failed'), stage_timeout_seconds: positive,
    stages: isRecord, providers: isRecord,
  }, 'offline')
  shape(report.stages, fields('bgp anycast anomaly policy', isRecord), 'offline.stages')
  shape(report.providers, { Cloudflare: isRecord, 'Yandex Cloud': isRecord, EdgeCenter: isRecord }, 'offline.providers')
  for (const [name, provider] of Object.entries(report.providers)) {
    shape(provider, { source_status: oneOf('blocked'), prerequisite: text }, `providers.${name}`)
  }
  for (const [name, stage] of Object.entries(report.stages)) {
    const path = `stages.${name}`
    const base = { fixture: text, entrypoint: text }
    if (stage.source_status === 'error') {
      shape(stage, {
        ...base, source_status: oneOf('error'),
        error: oneOf('worker_failed', 'timeout', 'worker_io', 'invalid_evidence'),
        ...(stage.error === 'worker_failed' ? { exit_code: n => Number.isSafeInteger(n) && n !== 0 } : {}),
      }, path)
      continue
    }
    shape(stage, {
      ...base, source_status: oneOf('simulated'), dataset_sha256: digest,
      counters: isRecord, failure_cases: isRecord,
    }, path)
    const { counters, failure_cases: failures } = stage
    shape(counters, fields(metrics[name], count), `${path}.counters`)
    shape(failures, cases[name], `${path}.failure_cases`)
    for (const [key, entries] of Object.entries(failures)) {
      check(new Set(entries).size === entries.length, `${path}.failure_cases.${key}`)
    }
    if (name === 'bgp') {
      check(Object.values(failures).flat().every(step => step < counters.steps), `${path}.failure_cases`)
      check(failures.no_route_steps.length === counters.no_route_steps, `${path}.counters.no_route_steps`)
    }
    if (name === 'policy') {
      check(failures.fallback_ids.length === counters.model_fallbacks, `${path}.counters.model_fallbacks`)
      check(failures.advisory_ids.length === counters.new_observations, `${path}.counters.new_observations`)
    }
    const prefixes = name === 'policy' ? modes.map(mode => mode + '_') : name === 'anomaly' ? [''] : []
    for (const prefix of prefixes) {
      check(sum(confusion.split(' ').map(key => counters[prefix + key])) === counters.records, `${path}.counters.records`)
    }
  }
  check((report.status === 'failed') === Object.values(report.stages).some(stage => stage.source_status === 'error'), 'offline.status')
}

const phases = { fixed_window: ['200', '429'], quota_unavailable: ['503'] }

function observation(row, name) {
  const path = `http_observations.${name}`
  if (row.status === 'skipped') {
    shape(row, { status: oneOf('skipped'), reason: oneOf('traffic_deadline') }, path)
    return
  }
  if (row.status === 'interrupted') {
    shape(row, { status: oneOf('interrupted'), requests_attempted: count }, path)
    return
  }
  shape(row, {
    status: oneOf('local-tested', 'incomplete'), scenario_id: oneOf(name),
    scenario_sha256: digest, url_kind: oneOf('loopback-http'), limits: text,
    requests_attempted: count, transport_errors: count, responses_by_status: isRecord,
    latency_p50_ms: value => value === null || finite(value),
    latency_p95_ms: value => value === null || finite(value),
  }, path)
  const responses = Object.entries(row.responses_by_status)
  for (const [code, total] of responses) check(/^[1-5][0-9]{2}$/.test(code) && positive(total), `${path}.responses_by_status.${code}`)
  check(sum(responses.map(([, total]) => total)) + row.transport_errors === row.requests_attempted, `${path}.requests_attempted`)
  check((row.status === 'local-tested') === (responses.length > 0 && row.transport_errors === 0), `${path}.status`)
  check(row.requests_attempted > 0
    ? finite(row.latency_p50_ms) && finite(row.latency_p95_ms) && row.latency_p95_ms >= row.latency_p50_ms
    : row.latency_p50_ms === null && row.latency_p95_ms === null, `${path}.latency`)
}

function comparison(row, observed, name, seconds) {
  const path = `offline_policy_comparison.${name}`
  const expected = phases[name]
  const counts = observed.responses_by_status
  if (observed.status !== 'local-tested' || Object.keys(counts).length !== expected.length ||
      !expected.every(code => Object.hasOwn(counts, code))) {
    shape(row, { status: oneOf('skipped'), reason: oneOf('unexpected_or_incomplete_http_observations') }, path)
    return
  }
  shape(row, {
    status: oneOf('simulated'), window: isRecord, scoring: isRecord,
    threshold: value => probability(value) && value > 0,
    score: value => value === null || probability(value),
    cohorts_by_observed_http_status: isRecord,
  }, path)
  shape(row.window, {
    requests: oneOf(observed.requests_attempted), seconds: oneOf(seconds),
    errors: oneOf((counts['429'] ?? 0) + (counts['503'] ?? 0)), baseline_rps: positive,
  }, `${path}.window`)
  const scoring = row.scoring
  const scoringPath = `${path}.scoring`
  if (!Object.hasOwn(counts, '200')) {
    shape(scoring, { status: oneOf('skipped'), reason: oneOf('no_allowed_responses') }, scoringPath)
  } else if (scoring.status === 'rule_fallback') {
    shape(scoring, { status: oneOf('rule_fallback'), kind: oneOf('onnx_cpu'), reason: oneOf('timeout', 'unavailable_or_invalid') }, scoringPath)
  } else {
    shape(scoring, {
      status: oneOf('scored'), kind: oneOf('heuristic', 'onnx_cpu'),
      ...(scoring.kind === 'onnx_cpu' ? { model_id: text, model_sha256: digest } : {}),
    }, scoringPath)
  }
  check((scoring.status === 'scored') === (row.score !== null), `${path}.score`)
  const cohorts = row.cohorts_by_observed_http_status
  shape(cohorts, fields(expected.join(' '), isRecord), `${path}.cohorts_by_observed_http_status`)
  for (const [code, cohort] of Object.entries(cohorts)) {
    const cohortPath = `${path}.cohorts.${code}`
    if (code === '200') {
      shape(cohort, { count: oneOf(counts[code]), rule_only: isRecord, assisted: isRecord }, cohortPath)
      const advisory = row.score !== null && row.score >= row.threshold
      const decision = (action, source) => ({
        action: oneOf(action), source: oneOf(source), status: oneOf('simulated'), policy_id: text,
      })
      shape(cohort.rule_only, decision('allow', 'rule'), `${cohortPath}.rule_only`)
      shape(cohort.assisted, decision(advisory ? 'observe' : 'allow',
        advisory ? 'anomaly-advisory' : row.score === null ? 'rule-fallback' : 'rule'), `${cohortPath}.assisted`)
    } else {
      const outcome = code === '429' ? 'rate_limited' : 'unavailable'
      shape(cohort, {
        count: oneOf(counts[code]), rule_only: oneOf(outcome), assisted: oneOf(outcome),
        source: oneOf(code === '429' ? 'preserved_http_rate_limit' : 'preserved_http_failure'),
      }, cohortPath)
    }
  }
}

function httpReport(report) {
  shape(report, {
    schema_version: oneOf(1), experiment: oneOf('loopback_http_advice'),
    status: oneOf('complete', 'incomplete'), workload: isRecord,
    http_observations: isRecord, offline_policy_comparison: isRecord,
  }, 'http')
  shape(report.workload, {
    synthetic: oneOf(true), rps_cap: positive, seconds_per_phase: positive,
    traffic_deadline_seconds: positive, total_attempt_cap: positive,
  }, 'http.workload')
  const names = Object.keys(report.http_observations)
  check(names.length > 0 && names.every(name => Object.hasOwn(phases, name)), 'http.http_observations')
  shape(report.http_observations, fields(names.join(' '), isRecord), 'http.http_observations')
  shape(report.offline_policy_comparison, fields(names.join(' '), isRecord), 'http.offline_policy_comparison')
  for (const name of names) {
    const observed = report.http_observations[name]
    observation(observed, name)
    comparison(report.offline_policy_comparison[name], observed, name, report.workload.seconds_per_phase)
  }
  const complete = names.length === Object.keys(phases).length &&
    Object.values(report.offline_policy_comparison).every(row => row.status === 'simulated')
  check((report.status === 'complete') === complete, 'http.status')
}

export function normalizeEvidence(offlineJson, httpJson) {
  const offline = read(offlineJson, 'offline')
  const http = read(httpJson, 'HTTP')
  offlineReport(offline)
  httpReport(http)
  return { offline, http }
}
