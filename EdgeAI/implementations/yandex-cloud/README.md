# Yandex Cloud AI inference — separate Edge AI implementation

**Status: TODO.** Candidate Russian cloud implementation of EdgeAI, independent of Smart Web Security ML features.

Tasks:
- Verify the right Yandex service/runtime for selected model and inference API.
- Distinguish **cloud inference in a regional data center** from actual **edge inference** near the user/device.
- Compare with Cloudflare Workers AI and ONNX Local on identical licensed model/data where possible.
- Specify data locality, privacy, network latency, model version, cold/warm p95, cost and outage fallback.
- Never claim a provider's built-in L7 security ML supports running our custom model.

This implementation does not require any production cloud credentials until deployment is explicitly approved.
