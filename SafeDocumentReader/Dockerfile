# Build on trusted network before processing documents; pin bases and CLI.
ARG NODE_BASE
ARG OLLAMA_BASE
FROM $NODE_BASE AS codex
ARG CODEX_VERSION
RUN test -n "$CODEX_VERSION" && npm install -g "@openai/codex@$CODEX_VERSION"
FROM $OLLAMA_BASE
ARG MODEL=qwen3-vl:8b
COPY --from=codex /usr/local/bin/node /usr/local/bin/node
COPY --from=codex /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s /usr/local/lib/node_modules/@openai/codex/bin/codex.js /usr/local/bin/codex \
    && apt-get update && apt-get install -y --no-install-recommends python3 ca-certificates \
    && rm -rf /var/lib/apt/lists/*
ENV OLLAMA_MODELS=/opt/models OLLAMA_HOST=127.0.0.1:11434 OLLAMA_NO_CLOUD=1 HOME=/tmp
RUN set -eu; mkdir -p /opt/models; ollama serve >/tmp/ollama-build.log 2>&1 & \
    pid=$!; trap 'kill "$pid" 2>/dev/null || true' EXIT; \
    for i in $(seq 1 60); do if ollama list >/dev/null 2>&1; then break; fi; sleep 1; done; \
    ollama pull "$MODEL"; chmod -R a+rX /opt/models; rm -f /tmp/ollama-build.log
WORKDIR /app
COPY contract.py worker.py /app/
USER 10001:10001
ENTRYPOINT ["python3","/app/worker.py"]
