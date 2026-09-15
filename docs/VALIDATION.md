# Validation record

Authoring environment checks:
- PASS: strict TypeScript type check and esbuild browser bundle (`npm run build`).
- PASS: four Node tests for allowed origins, URL rejection, retry limit and result IDs.
- PASS: syntax checks of the worker, setup and smoke scripts.
- PASS: Compose and CI YAML parse.

Not executed here: Go compilation/tests, Docker builds, live PostgreSQL/MongoDB,
Puppeteer navigation and the end-to-end smoke test. This environment has neither
Go nor Docker. CI is configured to execute the full stack, but no remote CI run
has happened. Do not describe the full application as end-to-end verified yet.

Next validation: run `docker compose up --build -d` and `node scripts/smoke.mjs`.
