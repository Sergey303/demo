# Verification record — 2026-11-24

At commit `fb634def50234e55c43751773804eb52b1f6e5d5`, a fresh sparse checkout on `rdc-project` ran `python3 -m unittest discover -s tests -v` (9 passed) and `python3 -m py_compile safe_read.py contract.py worker.py` (exit 0).

Observed binaries: `pdfinfo`, `pdftoppm`, `docker`, `codex`. Neither `sbx` nor `dangerzone-cli` was found on PATH. No inference image was built; no real rendering, VM creation, offline model inference or attack containment was tested. Unit-test mocks are not live isolation evidence. Subsequent fixture and text-report additions have their own test run.

At commit `0475d2915030960fcbede705a88c5487e2968a93`, a fresh sparse checkout on the same device ran 10/10 unit tests, Python compilation for controller, worker, contract and fixture generator, and generated synthetic documents in a disposable directory. Poppler pdfinfo confirmed 2 pages for first.pdf and 1 for second.pdf; Python zipfile integrity check passed for office.docx. This proves fixture structure, not Dangerzone rendering or AI quality. Temporary checkout and fixtures removed by shell trap.
