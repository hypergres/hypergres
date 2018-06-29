SELECT
  tc.table_schema,
  tc.table_name,
  array_to_json(
    array_agg(
      json_build_object(
        'schema', ccu.table_schema,
        'name', ccu.table_name,
        'from', kcu.column_name,
        'to', ccu.column_name
      )
    )
  ) AS relationships

FROM information_schema.table_constraints
  AS tc

JOIN information_schema.key_column_usage
  AS kcu
  ON tc.constraint_name = kcu.constraint_name

JOIN information_schema.constraint_column_usage
  AS ccu
  ON ccu.constraint_name = tc.constraint_name

WHERE constraint_type = 'FOREIGN KEY'

GROUP BY
  tc.table_schema,
  tc.table_name
