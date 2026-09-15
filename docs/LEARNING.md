# Learn it before claiming experience

1. Run the seeded check and explain each field in its MongoDB result.
2. Read the Go POST handler. Explain why the browser gets HTTP 202 before a result exists.
3. Add a validation rule and a Go test for it. Explain your change without generated notes.
4. Add a typed frontend filter for completed/failed runs. Explain union types and nullability.
5. Use psql to join monitors and runs and count successful browser inspections by monitor.
6. Use mongosh to find checks with status >= 400. Explain why SQL and MongoDB hold different data.
7. Add a Puppeteer assertion that the demo button changes its text after a click.
8. Queue several checks, stop the worker during one, restart it, and observe lease recovery.
9. Start two workers and explain SKIP LOCKED, at-least-once delivery and idempotency.
10. Demonstrate stale-worker rejection with attempt versioning and conditional MongoDB updates.

Useful commands:

```sh
docker compose logs -f worker
docker compose exec postgres psql -U sitepulse -c "SELECT state,count(*) FROM runs GROUP BY state;"
docker compose exec mongo mongosh sitepulse --eval 'db.results.find({}, {screenshot:0}).limit(5)'
```

After completing and understanding these tasks, describe the experience specifically:
“I built and tested a portfolio monitoring system using Go, TypeScript, PostgreSQL,
MongoDB and Puppeteer, and practiced queue leasing, retries and worker recovery.”
Do not convert the project's existence into a claim of professional tenure or proficiency.
