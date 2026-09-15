CREATE TABLE monitors (id serial PRIMARY KEY, name text NOT NULL, url text NOT NULL);
INSERT INTO monitors(name,url) VALUES ('Demo website','http://fixture/');
CREATE TABLE runs (
 id text PRIMARY KEY, monitor_id integer NOT NULL REFERENCES monitors(id),
 state text NOT NULL DEFAULT 'queued' CHECK (state IN ('queued','running','completed','failed')),
 attempts integer NOT NULL DEFAULT 0, lease_token text, lease_until timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz, error text
);
CREATE INDEX runs_queue ON runs(state, created_at);
