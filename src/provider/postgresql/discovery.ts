import { QueryFile } from 'pg-promise';
import { resolve } from 'path';
import { memoize } from 'ramda';

import { Source, Relationship } from '../../source';
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
   * Controls the discovery scope to a list of Schemas.
   */
  schemas: Scope;
  /**
   * Controls the discovery scope regarding Tables. If omitted, no Tables will
   * be enumerated.
   */
  tables?: Scope;
  /**
   * Controls the discovery scope regarding Views. If omitted, no Tables are
   * inspected. If `true`, all Tables are inspected. If a list of Table names,
   * only Tables with those names are inspected.
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
  schema: string;
  name: string;
  identifyingProperties: string[];
}

/**
 * Represents the results returned by the query contained in `columns.sql`
 */
export interface Column {
  name: string;
  type: string;
  nullable: boolean;
  default: string | number;
  isprimarykey: boolean;
  constraints?: Array<string | null>;
}

/**
 * Creates a `QueryFile` instance from a query stored on disk.
 *
 * @param name The name of the file containing the query, excluding path and
 * file extension.
 */
const queryFile = (name: string) =>
  new QueryFile(resolve(__dirname, 'discovery', `${name}.sql`));

/**
 * Creates an Object containing `QueryFile` instances for each inspection query.
 * Memoized to ensure that only instance of `QueryFile` is ever created for each
 * query.
 */
const queries = memoize(() => ({
  tables: queryFile('tables'),
  has: queryFile('has'),
  belongsTo: queryFile('belongsTo'),
  columns: queryFile('columns')
}));

/**
 * Generates Source configurations for each Table within a PostgreSQL database
 * based upon enumerated tables, foreign key relationships and column types.
 *
 * @param context The Context to use for executing queries used to inspect the Schema.
 * @param config The Config object to use to determine the scope of the inspection queries.
 * @param options Options to supply to the post-processing functions to
 * customise automatic JSON Schema generation, etc.
 *
 * @return A Promise that will resolve to a list of Source configurations, one
 * for each enumerated Table.
 */
export const inspect = async (context: Context, config: Config, options: Options = {}): Promise<Source[]> => {
  const sql = queries();

  const tables = await context.manyOrNone<Table>(sql.tables);

  const results = filterTablesByScope(config, tables)
    .map(async table => {
      const [has, belongsTo, columns]: [
        Relationship[],
        Relationship[],
        Column[]
      ] = await context.batch([
        context.manyOrNone(sql.has, table),
        context.manyOrNone(sql.belongsTo, table),
        context.manyOrNone(sql.columns, table)
      ]) as any;

      return {
        name: table.name,
        identifyingProperties: table.identifyingProperties,
        has,
        belongsTo,
        schema: schema(table, columns, options)
      } as Source;
    });

  return Promise.all(results);
};

/**
 * Determines if an Entity identified by `name` falls within a discovery scope
 *
 * @param scope The Scope to compare against
 * @param name The name of the Entity being compared
 *
 * @return `true` if `name` falls within `scope`, otherwise `false`.
 */
const matchesScope = (scope: Scope | undefined, name: string) => {
  if (!scope) {
    return false;
  }

  if (scope === true) {
    return true;
  }

  if ('only' in scope) {
    return scope.only.includes(name);
  }

  if ('except' in scope) {
    return !scope.except.includes(name);
  }

  throw Error('Invalid scope');
};

/**
 * Filters a list of Table query results to only contain those in the scope of
 * `config.schemas` and `config.tables`.
 *
 * @param config The Discovery configuration to extract Schema and Table scopes
 * from.
 * @param tables A list of Tables to filter by scope
 *
 * @return A list of Tables that have been filtered by scope.
 */
const filterTablesByScope = (config: Config, tables: Table[]) => {
  if (config.schemas === true && config.tables === true) {
    return tables;
  }

  return tables
    .filter(table => (
      matchesScope(config.tables, table.name) &&
      matchesScope(config.schemas, table.schema)
    ));
};
