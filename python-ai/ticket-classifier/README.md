# PyTorch neural ticket classifier

A **trained neural network**, not a keyword-switch or an LLM wrapper. Learns customer-support intent (billing / technical / account) through a token embedding layer, masked mean pooling and MLP. Includes reproducible training, held-out evaluation, saved weights and an HTTP inference endpoint.

## Run

```bash
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
python train.py
cat artifacts/metrics.json
uvicorn app.main:app --reload --port 8001
curl -s localhost:8001/predict -H 'content-type: application/json' -d '{"text":"I cannot sign in to my account"}'
pytest -q
```

**Important:** `data/tickets.csv` is a **tiny illustrative synthetic dataset**, not a production training corpus. The held-out score is a code-path demonstration, not evidence of generalization. Output confidence is uncalibrated. Train/test examples are split before optimization. For real deployment: collect consented, representative labeled tickets; separate training, validation and test by customer/time; measure macro-F1, confusion matrix and calibration; assess non-Russian and out-of-domain inputs; tune abstention threshold on validation data; monitor drift and retrain.

**Interview demo:** walk through Embedding, padding masks, loss, optimizer, deterministic seed, inference vs training, model checkpoint and meaningful quality gates.
