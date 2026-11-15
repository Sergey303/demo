# EP-11 review fixes implementation plan

Base: e65af53ef19bcb7704eb69df85f082eb8e0ef168, feature/ep11-multiuser-auth.
Scope: exactly the three findings in enterprise-demo/EP11-REVIEW-FIX-BRIEF.md.

- Add failing HTTP-mocked Chromium cases for whole-page identity invalidation,
  late replies, initial refusal, and same-principal focus during run/confirm.
- EnterpriseAiPage owns verified identity and a monotonic identity epoch. Gate
  the data subtree until verified; synchronously remount it on change/failure.
  Share fresh verification with AgentWorkflowCard before/after operations.
  Keep background identity checking separate from operation abort controllers.
- Strengthen real MCP/SQL tests with distinct complete private-marker sentences
  for each principal and inspect model messages plus complete answer/note output.
- Run bounded node/TypeScript/browser checks and Python checks. Use only a newly
  created disposable PostgreSQL if available; otherwise report integration SKIP.
- Update EP-11 evidence and CI browser selection; independently review changes,
  run diff/link checks, and commit only intended files. No push/merge, bwrap,
  model downloads, shared databases, or other repositories.

Review focus: identity failure during response parsing; unmounted late replies;
unchanged focus during a one-use confirmation; no data controls before identity;
revoked source text in model context versus returned evidence. Each is covered
by the browser or MCP/SQL tests above. Backend identity/ACL semantics unchanged.
