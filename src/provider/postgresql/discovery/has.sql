SELECT
  ccu.table_schema,
  ccu.table_name,
  array_to_json(
    array_agg(
      json_build_object(
        'schema', tc.table_schema,
        'name', tc.table_name,
        'from', ccu.column_name,
        'to', kcu.column_name
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
  ccu.table_schema,
  ccu.table_name
