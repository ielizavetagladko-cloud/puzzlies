-- Privileges for the trusted server key.
--
-- Safe to run more than once.
--
-- service_role is the key that server-side code uses: the picture pipeline
-- today, the Stripe webhook later. It bypasses row level security by design —
-- but new Supabase projects grant nothing on the public schema, so it still hit
-- "permission denied for table categories" like every other role before it.
--
-- Anyone holding this key is trusted absolutely, so narrowing it further would
-- buy no safety, only friction. It is kept out of the browser instead: the key
-- lives in .env.local and in server environment variables, never in
-- NEXT_PUBLIC_ anything.

grant usage on schema public to service_role;

grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant all privileges on all functions in schema public to service_role;

-- Tables added later should not need this migration run again.
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant all on functions to service_role;
