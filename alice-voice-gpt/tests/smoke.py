"""Contract smoke test against a running local DEMO_MODE=true Alice webhook."""
import json
import os
import urllib.error
import urllib.request

BASE = os.environ.get("ALICE_SMOKE_URL", "http://127.0.0.1:19088")
TOKEN = os.environ["ALICE_SMOKE_TOKEN"]

def call(path, body=None):
    data = None if body is None else json.dumps(body, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(BASE + path, data=data,
        headers={"Content-Type": "application/json"} if data is not None else {},
        method="POST" if body is not None else "GET")
    try:
        with urllib.request.urlopen(req, timeout=5) as result:
            return result.status, json.load(result)
    except urllib.error.HTTPError as error:
        return error.code, None

def utterance(text, user="local-smoke-user", skill="demo-skill"):
    return {
        "version": "1.0",
        "session": {"user_id": user, "skill_id": skill, "message_id": 1},
        "request": {"command": text, "original_utterance": text, "type": "SimpleUtterance"}
    }

code, health = call("/health")
assert code == 200 and health["demo"] is True, (code, health)
code, _ = call("/alice/incorrect", utterance("проверка"))
assert code == 404, code
code, result = call("/alice/" + TOKEN, {"request": {"command": "", "original_utterance": "ping"}})
assert code == 200 and result["response"]["text"] == "pong", (code, result)
code, _ = call("/alice/" + TOKEN, utterance("проверка", skill="bad-skill"))
assert code == 404, code
code, result = call("/alice/" + TOKEN, utterance("Почему расширяется Вселенная?"))
assert code == 200 and "Демо-режим" in result["response"]["text"], (code, result)
code, result = call("/alice/" + TOKEN, utterance("ответ"))
assert code == 200 and "Сначала" in result["response"]["text"], (code, result)
code, result = call("/alice/" + TOKEN, utterance("X" * 801))
assert code == 200 and "длинный вопрос" in result["response"]["text"], (code, result)
print("PASS: health, bad token, ping, skill ID, demo question, no-pending answer, max length")
