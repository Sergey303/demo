import React from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const { offline, http } = __EIS_EVIDENCE__
const stageNames = { bgp: 'BGP', anycast: 'Anycast', anomaly: 'Anomaly detector', policy: 'Policy replay' }
const phaseNames = { fixed_window: 'Fixed rate window', quota_unavailable: 'Quota dependency unavailable' }
const labels = {
  no_route_steps: 'Steps with no route', recovered_steps: 'Recovery steps',
  stages: 'Stages replayed', records: 'Synthetic windows',
  new_observations: 'New observe recommendations', model_fallbacks: 'Rule-only model fallbacks',
  hard_blocked_benign: 'Benign windows blocked by rules',
  fallback_ids: 'Model fallback cases', advisory_ids: 'Observe cases',
}
const wording = value => labels[value] ?? value.replaceAll('_', ' ')
const confusion = { tp: 'True positives', tn: 'True negatives', fp: 'False positives', fn: 'False negatives' }

function Status({ value }) {
  return <span className={'status ' + value}>{value.replaceAll('_', ' ')}</span>
}

function Figures({ entries }) {
  return <dl className="figures">
    {entries.map(([label, value]) => <div key={label}>
      <dt>{label}</dt><dd>{value}</dd>
    </div>)}
  </dl>
}

function ConfusionTable({ name, counters }) {
  const policy = name === 'policy'
  return <table>
    <caption>{policy ? 'Flagged cases (observe or block)' : 'Detector classifications'}</caption>
    <thead><tr><th scope="col">Outcome</th>{policy
      ? <><th scope="col">Rule-only</th><th scope="col">Assisted</th></>
      : <th scope="col">Count</th>}</tr></thead>
    <tbody>{Object.entries(confusion).map(([key, label]) => <tr key={key}>
      <th scope="row">{label}</th>
      {policy
        ? <><td>{counters['rule_only_' + key]}</td><td>{counters['assisted_' + key]}</td></>
        : <td>{counters[key]}</td>}
    </tr>)}</tbody>
  </table>
}

function Stage({ name, stage }) {
  const { counters, failure_cases: cases } = stage
  return <article>
    <div className="card-heading"><h3>{stageNames[name]}</h3><Status value={stage.source_status} /></div>
    {stage.source_status === 'error' ? <p className="notice">
      Stage error · {wording(stage.error)}{stage.exit_code !== undefined && ` (exit ${stage.exit_code})`}
    </p> : <>
      <Figures entries={Object.entries(counters)
        .filter(([key]) => !Object.hasOwn(confusion, key) && !/^(rule_only|assisted)_/.test(key))
        .map(([key, value]) => [wording(key), value])} />
      {cases && Object.keys(cases).length > 0 && <dl className="cases">
        {Object.entries(cases).map(([key, values]) => <div key={key}>
          <dt>{wording(key)}{name === 'bgp' && ' (zero-based)'}</dt>
          <dd>{values.length ? values.join(', ') : 'None recorded'}</dd>
        </div>)}
      </dl>}
      {(name === 'anomaly' || name === 'policy') && <ConfusionTable name={name} counters={counters} />}
    </>}
    <details>
      <summary>{stageNames[name]} source</summary>
      <dl className="cases provenance">
        <div><dt>Fixture</dt><dd>{stage.fixture}</dd></div>
        <div><dt>Entrypoint</dt><dd>{stage.entrypoint}</dd></div>
        {stage.dataset_sha256 && <div><dt>Fixture SHA-256</dt><dd>{stage.dataset_sha256}</dd></div>}
      </dl>
    </details>
  </article>
}

const httpLabels = { 200: '200 OK', 429: '429 Rate limited', 503: '503 Unavailable' }
const ms = value => value === null ? 'Unavailable' : `${value} ms`
const decision = value => typeof value === 'string' ? wording(value) : `${value.action} · ${value.source}`

function HttpPhase({ name, observed, advice }) {
  return <article>
    <div className="card-heading"><h3>{phaseNames[name]}</h3><Status value={observed?.status ?? 'missing'} /></div>
    {observed?.responses_by_status ? <>
      <Figures entries={[
        ['Requests attempted', observed.requests_attempted],
        ['Transport errors', observed.transport_errors],
        ['Sample p50', ms(observed.latency_p50_ms)],
        ['Sample p95', ms(observed.latency_p95_ms)],
      ]} />
      <dl className="codes">{Object.entries(observed.responses_by_status).map(([code, count]) =>
        <div key={code}><dt>{httpLabels[code] ?? code}</dt><dd>{count}</dd></div>)}</dl>
    </> : <p className="notice">{observed?.status === 'interrupted'
      ? `Capture interrupted after ${observed.requests_attempted} attempts.`
      : observed ? wording(observed.reason) : 'Phase absent from the captured report.'}</p>}
    <div className="advice">
      <div className="card-heading"><h4>Offline advice</h4><Status value={advice?.status ?? 'missing'} /></div>
      {advice?.status === 'simulated' ? <>
        <p>Scoring <strong>{wording(advice.scoring.status)}</strong>
          {advice.scoring.kind && ` · ${wording(advice.scoring.kind)}`}
          {advice.scoring.reason && ` · ${wording(advice.scoring.reason)}`}
          {advice.score !== null && ` · score ${advice.score} / threshold ${advice.threshold}`}
        </p>
        {advice.scoring.status === 'rule_fallback' && <p className="notice">The deterministic rule supplied the decision.</p>}
        <table>
          <caption>Policy outcomes for the captured HTTP cohorts</caption>
          <thead><tr><th scope="col">HTTP (count)</th><th scope="col">Rule-only</th><th scope="col">Assisted</th></tr></thead>
          <tbody>{Object.entries(advice.cohorts_by_observed_http_status).map(([code, cohort]) => <tr key={code}>
            <th scope="row">{code} ({cohort.count})</th>
            <td>{decision(cohort.rule_only)}</td><td>{decision(cohort.assisted)}</td>
          </tr>)}</tbody>
        </table>
      </> : <p>{advice ? wording(advice.reason) : 'No advice captured.'}</p>}
    </div>
  </article>
}

function App() {
  const { workload } = http
  return <>
    <a className="skip" href="#main">Skip to evidence</a>
    <header className="masthead">
      <div className="wrap">
        <p className="project">Edge Integrated Scenarios</p>
        <h1>Edge evidence dashboard</h1>
        <p>Review checked-in routing simulations, policy comparisons, and loopback HTTP observations.</p>
        <nav aria-label="Evidence sections">
          <a href="#replay">Offline replay</a><a href="#http">Local HTTP</a><a href="#cloud">Cloud providers</a>
        </nav>
      </div>
    </header>
    <main id="main" className="wrap" tabIndex={-1}>
      <section aria-labelledby="replay">
        <div className="section-heading"><h2 id="replay">Offline replay</h2><Status value={offline.status} /></div>
        <p className="context">Synthetic fixtures with a {offline.stage_timeout_seconds}-second timeout per stage. Counts describe these fixtures only. BGP indices and Anycast event totals describe replay steps and stages, respectively.</p>
        <div className="grid">{Object.keys(stageNames).map(name =>
          <Stage key={name} name={name} stage={offline.stages[name]} />)}</div>
      </section>
      <section aria-labelledby="http">
        <div className="section-heading"><h2 id="http">Local HTTP experiment</h2><Status value={http.status} /></div>
        <p className="context">Synthetic loopback workload capped at {workload.rps_cap} requests/s for {workload.seconds_per_phase} s per phase. The small samples make the latency percentiles unstable. Timing covers the HTTP probe only. Advice was evaluated offline after capture.</p>
        <div className="grid">{Object.keys(phaseNames).map(name =>
          <HttpPhase key={name} name={name} observed={http.http_observations[name]} advice={http.offline_policy_comparison[name]} />)}</div>
      </section>
      <section aria-labelledby="cloud">
        <div className="section-heading"><h2 id="cloud">Cloud providers</h2></div>
        <p className="context">Provider measurements are pending separate acceptance.</p>
        <div className="grid providers">{Object.entries(offline.providers).map(([name, provider]) =>
          <article key={name}><div className="card-heading"><h3>{name}</h3><Status value={provider.source_status} /></div>
            <p>{provider.prerequisite}</p></article>)}</div>
      </section>
    </main>
    <footer className="wrap">Bundled snapshots · EVIDENCE-OFFLINE.json v{offline.schema_version} · EVIDENCE-HTTP-ADVICE.json v{http.schema_version}</footer>
  </>
}

createRoot(document.getElementById('root')).render(<App />)
