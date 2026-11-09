select tablename, rowsecurity
from pg_tables
where schemaname = 'public';