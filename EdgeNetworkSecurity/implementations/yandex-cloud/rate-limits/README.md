# Advanced Rate Limiter

TODO: stage an ARL profile for /api/* and separate API calls by resource cost. Confirm rule actions, windows and segmentation. Check HTTP 429, reasonable Retry-After (if actually supplied by the provider), burst behaviour and false positives on shared IPs.

A 429 at L7 is not L3/L4 DDoS defence.

Docs: https://yandex.cloud/ru/docs/smartwebsecurity/concepts/rules
