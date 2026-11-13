Only alice_webhook_token is required: a random 64-character hex string.

The Windows Install-AliceVoiceGpt.ps1 creates it automatically and preserves it on updates.

Do not commit this token, .env or Codex OAuth credentials. Do not paste them in chat or logs.
Codex ChatGPT OAuth credentials reside in the private Docker volume alice-voice-gpt_codex_auth.
No OpenAI API key is required.
