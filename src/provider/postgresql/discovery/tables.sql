SELECT
  t.table_schema as schema,
  t.table_name as name,
  array_agg(ccu.column_name::text) AS primary_keys

FROM information_schema.tables AS t

JOIN information_schema.table_constraints AS tc
ON tc.table_name = t.table_name AND tc.constraint_type = 'PRIMARY KEY'

JOIN information_schema.constraint_column_usage AS ccu
ON ccu.constraint_name = tc.constraint_name

GROUP BY t.table_schema, t.table_name;
