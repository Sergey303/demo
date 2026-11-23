# Offline staging policy contract

Run from this directory with Python 3.10+ and a local environment containing
`requirements.txt`:

```sh
python3 -m pip install -r requirements.txt
python3 -B -m unittest -v
python3 -B validate.py fixtures/observe.json
python3 -B validate.py fixtures/enforce.json
```

[policy.schema.json](policy.schema.json) is JSON Schema Draft 2020-12.
[validate.py](validate.py) checks that rollback points to an earlier revision and
rejects duplicate JSON keys. The validator returns 0 for valid intent, 1 for
schema or revision errors, and 2 for unreadable or malformed input. It reads
local files and does not perform network requests.

The contract uses reserved `.invalid` origin names and models staging intent for
TLS, origin access, WAF, HTTP quotas, CDN caching and metadata-only logging.
`observe` records intended observation without blocking. A 429 expectation
is required only in rate-limit enforcement mode. Bounds are local policy
limits. The revision check establishes ordering only. Fixture tests validate
the contract and do not execute policies or simulate provider responses.
