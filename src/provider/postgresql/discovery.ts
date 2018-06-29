import { QueryFile, as } from 'pg-promise';
import { resolve } from 'path';
import { curry, identity, memoizeWith } from 'ramda';

import { Source } from '../../source';
import { Context } from '../postgresql';
import { schema } from './discovery/schema';

/**
 * Restricts discovery scope:
 *
 * - If `true`, then *all* matching entities are enumerated
 * - If an `only` key and list of Names is given, then only entities whose name
 *   is in that list will be enumerated
 * - If an `except` key and list of Names is given, then only entities whose name
 *   is not in that list will be enumerated
 */
type Scope = true | { only: string[] } | { except: string[] };

/**
 * Represents the discovery configuration parameters that `inspect` accepts.
 */
export interface Config {
  /**
   * Restricts the discovery scope to a list of Schemas.
   */
  schemas: Scope;
  /**
   * Restricts the Source discovery scope regarding Tables.
   */
  tables?: Scope;
  /**
   * Controls the discovery scope regarding Views.
   */
  views?: Scope;
  /**
   * A list of Actions that should be configured against the Source
   * configurations that are created for the discovered entities.
   */
  actions: string[];
  /**
   * Discovery options that should be applied when creating a Source
   * configuration from enumerated entities.
   */
  options?: Options;
}

/**
 * Represents the discovery options that should be applied when creating Source
 * configurations from enumerated entities.
 */
export interface Options {
  /**
   * Prevents strings from being considered a valid input on numerical columns.
   */
  strictNumbers?: boolean;
}

/**
 * Represents the results returned by the query contained in `tables.sql`
 */
export interface Table {
  table_schema: string;
  table_name: string;
  primary_keys: string[];
  columns: Column[];
  has: Relationship[];
  belongs_to: Relationship[];
}

/**
 * Represents the results returned by the query contained in `views.sql`
 */
export interface View {
  table_schema: string;
  table_name: string;
  columns: Column[];
}

/**
 * Represents each element in the `columns` array returned by the query
 * contained in `columns.sql`
 */
export interface Column {
  name: string;
  type: string;
  nullable: boolean;
  default: string | number | null;
  isPrimaryKey: boolean;
  constraints?: Array<string | null>;
}

/**
 * Represents the Relationship data returned by the queries contained in
 * `has.sql` and `belongsTo.sql`
 */
export interface Relationship {
  schema: string;
  name: string;
  from: string;
  to: string;
}

/**
 * Creates a `QueryFile` instance of named query file. Memoized to ensure that
 * only one instance is created for optimal reuse by pg-promise.
 */
const queryFile = memoizeWith(identity, (name: string) =>
  new QueryFile(resolve(__dirname, 'discovery', `${name}.sql`))
);

/**
 * Generates Source configurations for each Table within a PostgreSQL database
 * based upon enumerated tables, foreign key relationships and column types.
 *
 * @param context The Context to use for executing queries used to inspect the Schema.
 * @param configs The Config object to use to determine the scope of the inspection queries.
 * @param options Options to supply to the post-processing functions to
 * customise automatic JSON Schema generation, etc.
 *
 * @return A Promise that will resolve to a list of Source configurations, one
 * for each enumerated Table.
 */
export const inspect = async (context: Context, configs: Config[], options: Options = {}): Promise<Source[]> => {
  const [tables, views] = await context.batch([
    context.manyOrNone(queryFile('tables'), {
      conditions: conditions('tables', configs),
      queries: {
        columns: queryFile('columns'),
        has: queryFile('has'),
        belongsTo: queryFile('belongsTo')
      }
    }),

    context.manyOrNone(queryFile('views'), {
      conditions: conditions('views', configs),
      queries: {
        columns: queryFile('columns')
      }
    })
  ]) as any as [Table[], View[]];

  return [
    ...mapTables(configs, options, tables),
    ...mapViews(configs, options, views)
  ];
};

/**
 * Builds a WHERE clause that restricts entities enumerated to the rules
 * specified in discovery conditions.
 */
export const conditions = (type: 'tables' | 'views', configs: Config[]) =>
  configs
    .map(config => `(${scopeTerm('table_schema', config.schemas)} AND ${scopeTerm('table_name', config[type])})`)
    .join(' OR ');

/**
 * Creates a WHERE term that matches against a specific field name for a given
 * scope. This function uses pg-promise's `as.format` helper as Squel doesn't
 * seem to handle parameter placeholders in expressions correctly.
 *
 * @param name The field name to match against in the inspect query result
 * @param scope The Scope matching rule to compare `name` against
 *
 * @return A string representing a term in a WHERE clause
 */
const scopeTerm = (name: string, scope?: Scope): string => {
  if (!scope) {
    return as.format('FALSE', [name]);
  }

  if (scope === true) {
    return as.format('TRUE', [name]);
  }

  if ('only' in scope) {
    return as.format('$1:name IN ($2:csv)', [name, scope.only]);
  }

  if ('except' in scope) {
    return as.format('$1:name NOT IN ($2:csv)', [name, scope.except]);
  }

  throw new Error('Invalid scope');
};

/**
 * Creates a Soruce configuration from an inspected Table.
 */
export const mapTables = curry((configs: Config[], options: Options, tables: Table[]): Source[] =>
  tables.map<Source>(table => ({
    name: table.table_name,
    identifyingProperties: table.primary_keys,
    has: [],
    belongsTo: [],
    schema: schema(table.table_name, table.columns, options)
  }))
);

/**
 * Creates a Source configuration from an inspected View.
 */
export const mapViews = curry((configs: Config[], options: Options, views: View[]): Source[] =>
  views.map<Source>(view => ({
    name: view.table_name,
    identifyingProperties: [],
    has: [],
    belongsTo: [],
    schema: schema(view.table_name, view.columns, options)
  })));
