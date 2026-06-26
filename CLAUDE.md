# Hello-Pioneer — Claude Instructions

## Always explain what we did and why

After completing any task, always include a short plain-English paragraph explaining what was done and why. The user is learning as we build — treat every task as a teaching moment. Keep it simple, no jargon without definition, and focused on building a mental model rather than just describing steps.

## Supabase CLI — database connection

The Supabase CLI does not automatically read `SUPABASE_DB_PASSWORD` from `.env`. For any command that connects directly to Postgres (e.g. `db push`, `migration list`, `migration repair`), always use one of:

- `SUPABASE_DB_PASSWORD='...' supabase db push` (env var prefix), or
- `supabase db push --db-url "postgresql://postgres.xpvhcstmccjozunrweyf:PASSWORD@aws-1-us-west-1.pooler.supabase.com:5432/postgres"`

Read the password from `.env` (`SUPABASE_DB_PASSWORD`) before running — never ask the user to paste it into chat.

The project is already linked (`supabase link` has been run). Direct IPv6 connections to `db.xpvhcstmccjozunrweyf.supabase.co` do not work on this machine — always use the session pooler (`aws-1-us-west-1.pooler.supabase.com:5432`).
