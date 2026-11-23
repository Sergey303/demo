import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import { normalizeEvidence } from './evidence.mjs'

export default defineConfig({
  base: './',
  server: { host: '127.0.0.1' },
  preview: { host: '127.0.0.1' },
  define: {
    __EIS_EVIDENCE__: JSON.stringify(normalizeEvidence(
      readFileSync(new URL('../EVIDENCE-OFFLINE.json', import.meta.url), 'utf8'),
      readFileSync(new URL('../EVIDENCE-HTTP-ADVICE.json', import.meta.url), 'utf8'),
    )),
  },
})
