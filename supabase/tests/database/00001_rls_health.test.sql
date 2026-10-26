begin;
select plan(1);

-- Verify pgTAP extension works and database is online
select pass('Supabase database and pgTAP test suite is operational');

select * from finish();
rollback;
