/**
* Get the Schema, Name and list of Primary Keys for each Table
*/
WITH tables AS (
  SELECT
    t.table_schema,
    t.table_name,
    array_agg(ccu.column_name::text) AS primary_keys

  FROM information_schema.tables
    AS t

  JOIN information_schema.table_constraints
    AS tc
    ON tc.table_name = t.table_name
    AND tc.constraint_type = 'PRIMARY KEY'

  JOIN information_schema.constraint_column_usage
    AS ccu
    ON ccu.constraint_name = tc.constraint_name

  GROUP BY
    t.table_schema,
    t.table_name
)

SELECT
  tables.table_schema AS schema,
  tables.table_name AS name,
  tables.primary_keys,
  COALESCE(columns.columns, '[]') AS columns,
  COALESCE(has.relationships, '[]') AS has,
  COALESCE(belongs_to.relationships, '[]') AS belongs_to

FROM tables

LEFT JOIN (${queries.has}) AS has USING (table_schema, table_name)
LEFT JOIN (${queries.belongsTo}) AS belongs_to USING (table_schema, table_name)
LEFT JOIN (${queries.columns}) AS columns USING (table_schema, table_name)

WHERE ${conditions:raw}
