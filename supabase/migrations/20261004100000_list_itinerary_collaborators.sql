-- ErbilGo: the sharing backend already exists in your database.
-- This adds the ONE missing function (list of people on a plan, with names).
-- Safe to run more than once. Does not touch any existing table, policy or function.

create or replace function public.list_itinerary_collaborators(p_itinerary_id uuid)
returns table (
  id uuid, itinerary_id uuid, user_id uuid, invited_by uuid, role text, status text,
  created_at timestamptz, updated_at timestamptz, accepted_at timestamptz,
  full_name text, avatar_url text
)
language sql stable security definer set search_path = public as $$
  select c.id, c.itinerary_id, c.user_id, c.invited_by, c.role::text, c.status::text,
         c.created_at, c.updated_at, c.accepted_at, p.full_name, p.avatar_url
  from public.itinerary_collaborators c
  left join public.profiles p on p.id = c.user_id
  where c.itinerary_id = p_itinerary_id
    and auth.uid() is not null
    and (
      exists (select 1 from public.user_itineraries i
              where i.id = p_itinerary_id and i.user_id = auth.uid())
      or exists (select 1 from public.itinerary_collaborators m
                 where m.itinerary_id = p_itinerary_id and m.user_id = auth.uid()
                   and m.status::text = 'accepted')
    )
  order by c.created_at;
$$;

revoke all on function public.list_itinerary_collaborators(uuid) from public, anon;
grant execute on function public.list_itinerary_collaborators(uuid) to authenticated;
