# Contributing to SitePulse

Thanks for helping improve SitePulse. Keep changes focused, reproducible, and safe for a local-first monitoring project.

## Before making a change

1. Create a branch for the change.
2. Keep credentials and local `.env` values out of commits.
3. Only configure monitoring targets that you own or have permission to inspect.
4. Prefer small commits that address one concern at a time.

## Local validation

Start the stack using the documented setup:

```sh
node scripts/setup.mjs
docker compose up --build -d
```

After making a change, run the smoke test:

```sh
node scripts/smoke.mjs
```

For changes that affect the dashboard, API, worker, queue, or persistence behavior, also follow the repeatable checks in `docs/VALIDATION.md`.

## Documentation changes

Update the README or relevant file under `docs/` when a change affects setup, API behavior, architecture, security assumptions, or operator workflow. Commands in documentation should be copy-pasteable and should not contain machine-specific paths or real credentials.

## Commit guidance

Use concise messages that describe the change, for example:

```text
docs: clarify worker validation steps
fix: handle expired run lease safely
test: cover failed browser check retry
```

Avoid empty or no-op commits. Each commit should leave the repository more useful, understandable, or reliable.
