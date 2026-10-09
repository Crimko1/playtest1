revoke execute on function public.deposit_scrap(integer) from anon, public;
grant execute on function public.deposit_scrap(integer) to authenticated;

revoke execute on function public.claim_hourly_scrap(bigint, integer) from anon, public;
grant execute on function public.claim_hourly_scrap(bigint, integer) to authenticated;

grant execute on function public.get_today_quota() to anon, authenticated;