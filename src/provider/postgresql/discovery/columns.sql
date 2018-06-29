
WITH constraints AS (
  SELECT
    conrelid,
    conkey,
    array_agg(consrc) AS constraints

  FROM pg_catalog.pg_constraint

  WHERE contype = 'c'

  GROUP BY
    conrelid,
    conkey
)

SELECT
  columns.table_schema,
  columns.table_name,
  array_to_json(
    array_agg(
      json_build_object(
        'name', columns.column_name,
        'type', columns.data_type,
        'nullable', columns.is_nullable::boolean,
        'default', columns.column_default,
        'isPrimaryKey', COALESCE(indexes.indisprimary, false),
        'constraints', COALESCE(constraints, '{}')
      )
    )
  ) AS columns

FROM information_schema.columns

JOIN pg_catalog.pg_attribute AS attributes
  ON attributes.attrelid = columns.table_name::regclass
  AND attributes.attname = columns.column_name
  AND NOT attributes.attisdropped

LEFT JOIN pg_catalog.pg_index AS indexes
  ON indexes.indrelid = attributes.attrelid
  AND attributes.attnum = ANY(indexes.indkey)

LEFT JOIN constraints
  ON conrelid = attributes.attrelid
  AND attributes.attnum = ANY(conkey)

WHERE columns.table_schema NOT IN ('information_schema')

GROUP BY
  columns.table_schema,
  columns.table_name
