-- Docker-only approximation of the Supabase roles and authentication helpers.
create role anon nologin;

create role authenticated nologin;

create role service_role nologin bypassrls;

create schema auth;

create schema extensions;

create extension pgcrypto with schema extensions;

-- Read the same transaction-local JWT claim setting used by the checks.
create function auth.jwt ()
    returns jsonb
    language sql
    stable
    as $$
    select
        coalesce(nullif (current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb)
$$;

create function auth.uid ()
    returns uuid
    language sql
    stable
    as $$
    select
        (auth.jwt () ->> 'sub')::uuid
$$;

grant usage on schema public, auth, extensions to anon, authenticated, service_role;

grant execute on all functions in schema auth to anon, authenticated, service_role;

-- Model Supabase default grants so the migration must revoke them explicitly.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;

alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
