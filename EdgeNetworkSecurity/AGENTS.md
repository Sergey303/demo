# Codex CLI — EdgeNetworkSecurity

Scope: this directory only, unless the task explicitly names a contract in EdgeAI or EdgeIntegratedScenarios. Keep the other hiring demos untouched.

1. Read README.md and docs/ARCHITECTURE.md, then the nearest TASK.md.
2. Record starting git SHA, inspect git status, never discard concurrent edits.
3. Implement one vertical slice, replace its TODO only after verified tests. New TODOs must state missing behavior and acceptance criteria.
4. Use bounded localhost synthetic traffic ONLY. Do not send DDoS traffic to public services or execute provider deployments without explicit approval.
5. A simulated BGP/Anycast result is NOT provider behavior. Network L3/L4, L7 WAF, rate limiting and inference must not be conflated.
6. Report exact files, commands/test outputs, status (simulated/local-tested/provider-configured/provider-verified) and missing risks.
7. No credentials, API keys, real endpoints or Terraform state committed. No implicit cloud costs.
