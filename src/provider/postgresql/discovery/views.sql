SELECT
  table_schema,
  table_name,
  COALESCE(columns.columns, '[]') AS columns

FROM information_schema.views

LEFT JOIN (${queries.columns}) AS columns USING (table_schema, table_name)

WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
  AND (
    ${conditions:raw}
  )
