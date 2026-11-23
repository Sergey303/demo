import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { normalizeEvidence } from './evidence.mjs'

const offline = readFileSync(new URL('../EVIDENCE-OFFLINE.json', import.meta.url), 'utf8')
const http = readFileSync(new URL('../EVIDENCE-HTTP-ADVICE.json', import.meta.url), 'utf8')
const normalize = (change, source = 'offline') => {
  const report = JSON.parse(source === 'offline' ? offline : http)
  change(report)
  return source === 'offline'
    ? normalizeEvidence(JSON.stringify(report), http)
    : normalizeEvidence(offline, JSON.stringify(report))
}

test('loads both checked-in fixtures deterministically', () => {
  const evidence = normalizeEvidence(offline, http)
  assert.deepEqual(normalizeEvidence(offline, http), evidence)
  assert.equal(evidence.offline.stages.policy.counters.model_fallbacks, 2)
  assert.equal(evidence.http.http_observations.fixed_window.responses_by_status['429'], 6)
})

test('rejects invalid JSON, wrong schema and corrupt nested figures', () => {
  assert.throws(() => normalizeEvidence('{', http), /offline evidence/)
  assert.throws(() => normalize(report => { report.schema_version = 2 }), /schema_version/)
  assert.throws(() => normalize(report => { report.stages.policy.counters.records = '12' }), /records/)
  assert.throws(() => normalize(report => {
    report.http_observations.fixed_window.requests_attempted++
  }, 'http'), /requests_attempted/)
})

test('rejects nested prototype pollution keys', () => {
  for (const key of ['__proto__', 'constructor', 'prototype']) {
    const poisoned = http.replace('"responses_by_status": {', `"responses_by_status": {"${key}": {},`)
    assert.throws(() => normalizeEvidence(offline, poisoned), /unsafe key/)
  }
})

test('rejects unexpected statuses in nested stages, providers, HTTP and scoring', () => {
  assert.throws(() => normalize(report => { report.stages.bgp.source_status = 'live' }), /source_status/)
  assert.throws(() => normalize(report => { report.providers.Cloudflare.source_status = 'ready' }), /source_status/)
  assert.throws(() => normalize(report => {
    report.http_observations.fixed_window.status = 'production'
  }, 'http'), /status/)
  assert.throws(() => normalize(report => {
    report.offline_policy_comparison.fixed_window.scoring.status = 'ready'
  }, 'http'), /status/)
})

test('retains valid errors, missing phases and rule fallback', () => {
  const failed = normalize(report => {
    report.status = 'failed'
    const { fixture, entrypoint } = report.stages.bgp
    report.stages.bgp = { fixture, entrypoint, source_status: 'error', error: 'timeout' }
  })
  assert.equal(failed.offline.stages.bgp.error, 'timeout')

  const incomplete = normalize(report => {
    report.status = 'incomplete'
    report.http_observations.fixed_window = { status: 'interrupted', requests_attempted: 2 }
    report.offline_policy_comparison.fixed_window = {
      status: 'skipped', reason: 'unexpected_or_incomplete_http_observations',
    }
    delete report.http_observations.quota_unavailable
    delete report.offline_policy_comparison.quota_unavailable
  }, 'http')
  assert.equal(incomplete.http.http_observations.fixed_window.status, 'interrupted')

  const fallback = normalize(report => {
    const advice = report.offline_policy_comparison.fixed_window
    advice.score = null
    advice.scoring = { kind: 'onnx_cpu', status: 'rule_fallback', reason: 'timeout' }
    Object.assign(advice.cohorts_by_observed_http_status['200'].assisted, {
      action: 'allow', source: 'rule-fallback',
    })
  }, 'http')
  assert.equal(fallback.http.offline_policy_comparison.fixed_window.scoring.reason, 'timeout')
})

test('retains latency measurements when every HTTP attempt fails in transport', () => {
  const evidence = normalize(report => {
    report.status = 'incomplete'
    const observed = report.http_observations.fixed_window
    observed.status = 'incomplete'
    observed.responses_by_status = {}
    observed.transport_errors = observed.requests_attempted
    report.offline_policy_comparison.fixed_window = {
      status: 'skipped', reason: 'unexpected_or_incomplete_http_observations',
    }
  }, 'http')
  assert.equal(evidence.http.http_observations.fixed_window.transport_errors, 10)
})
