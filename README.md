# nango-doctor 🔍

> Integration failure diagnosis for Nango users.
> Finds the root cause automatically — so you stop guessing why your customer's OAuth broke.

![Tests](https://img.shields.io/badge/tests-14%20passing-brightgreen)
![Issues](https://img.shields.io/badge/issues%20diagnosed-5-blue)
![Patterns](https://img.shields.io/badge/failure%20patterns-4-orange)

---

## The problem

Your customer's GitHub integration broke overnight. You call `GET /connection/github-001`. You get:

```json
{ "error": { "status": 500 } }
```

Why? Unknown. Who else is affected? Unknown. How to fix it? Unknown.

**nango-doctor** analyzes the error and tells you exactly what happened: