-- Grants required for local reference-data imports using the Supabase service role key.
-- This does not grant any privileges to anon or authenticated client roles.
-- RLS policies remain unchanged.

begin;

grant usage on schema public to service_role;

grant select, insert, update on public.machine_manufacturers to service_role;
grant select, insert, update on public.machine_models to service_role;
grant select, insert, update on public.machine_aliases to service_role;

grant select, insert, update on public.grinder_manufacturers to service_role;
grant select, insert, update on public.grinder_models to service_role;
grant select, insert, update on public.grinder_aliases to service_role;

commit;
