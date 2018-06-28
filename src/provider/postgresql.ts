import * as pgPromise from 'pg-promise';
import { flatten } from 'ramda';

import { Provider as ProviderConfig } from '../config';
import { Provider } from '../provider';
import * as query from '../query';
import { inspect } from './postgresql/discovery';
import * as queryBuilders from './postgresql/queryBuilders';
import { create as createLogger } from './postgresql/logger';

/**
 * Describes the configuration parameters that the PostgreSQL data provider
 * accepts.
 */
export interface Config {
  /**
   * The hostname (or path to a Unix socket) of the PostgreSQL server to connect
   * to.
   */
  host: string;
  /**
   * The TCP port of the PostgreSQL server to connect to.
   */
  port: number;
  /**
   * The username to use for authentication.
   */
  user: string;
  /**
   * The password to use for authentication.
   */
  password: string;
  /**
   * The name of the Database to connect to.
   */
  database: string;
}

/**
 * Acts as a separator in column names where a parent entity is to be embedded
 * via a JOIN. The segments of an embedded resources' nesting path are joined
 * using this separator so that they can be correctly identified when processing
 * the query result.
 */
export const JOIN_MARKER = 'Δ';

/**
 * Describes the Context that the PostgreSQL Provider executes queries against.
 * This is typically a pg-promise Task, which ensures proper connection usage
 * during a request/response cycle. However, consumers can opt to use an
 * alternative in custom Actions or Filters. For example, to use existing
 * provider methods within the context of a nested Task or Transaction.
 */
export type Context = pgPromise.ITask<any>;

/**
 * Implements a Data Provider that connects to a PostgreSQL database.
 *
 * Supports automatic discovery of database entities such as Tables and Views,
 * including relationship and JSON Schema generation.
 */
export class PostgreSQL implements Provider<Context> {
  /**
   * The internal pg-promise instance. It is never directly accessed by
   * Hypergres internally, but is exposed to allow access to consumers where the
   * built-in 'source' mechanism is insufficient or innappropriate.
   */
  db: pgPromise.IDatabase<any>;

  constructor(public config: ProviderConfig) {
    const pgpOptions = {
      ...createLogger(config)
    };

    this.db = pgPromise(pgpOptions)(config.options);
  }

  /**
   * Creates a context in which Actions may call database methods. By default,
   * it simply creates a pgPromise task. It is possible to create nested tasks
   * or Transactions by overriding this implementation, using a filter on
   * either:
   *
   * 1. The `withContext` method on an instance of this class
   * 2. A method on an instance of an Action that calls `withContext`
   *
   * @param callback The function to be invoked with the `Context` that was
   * created.
   * @param caller An explicit reference to the instance that called this
   * method. Although not used internally, this may be useful to implment
   * differentiating logic in user-defined filters on this method.
   * @return The result of calling `callback` with `Context`.
   */
  withContext = (callback: (context: Context) => any, caller?: any) =>
    this.db.task(callback)

  /**
   * Creates records based on a Create query.
   *
   * @param context A Context object. It is assumed that the context will be
   * obtained using `withContext`, but filters may optionally supply a different
   * context.
   * @param q The Create query to build and execute.
   * @return The result of executing the Create query within the given Context.
   */
  create = (context: Context, q: query.Create) => {
    const { text, values } = queryBuilders.createQuery(q).toParam();
    return context.manyOrNone(text, values);
  }

  /**
   * Reads records based on a Read query.
   *
   * @param context A Context object. It is assumed that the context will be
   * obtained using `withContext`, but filters may optionally supply a different
   * context.
   * @param q The Read query to build and execute.
   * @return The result of executing the Read query within the given Context.
   */
  read = (context: Context, q: query.Read) => {
    const { text, values } = queryBuilders.readQuery(q).toParam();
    return context.manyOrNone(text, values);
  }

  /**
   * Updates records based on an Update query
   *
   * @param context A Context object. It is assumed that the context will be
   * obtained using `withContext`, but filters may optionally supply a different
   * context.
   * @param q The Update query to build and execute.
   * @return The result of executing the Update query within the given Context.
   */
  update = (context: Context, q: query.Update) => {
    const { text, values } = queryBuilders.updateQuery(q).toParam();
    return context.manyOrNone(text, values);
  }

  /**
   * Deletes records based on a Delete query.
   *
   * @param context A Context object. It is assumed that the context will be
   * obtained using `withContext`, but filters may optionally supply a different
   * context.
   * @param q The Read query to build and execute.
   * @return The number of rows that were deleted.
   *
   * @note Although pgPromise returns the number of deleted rows as a number, it
   * is cast to a string to maintain symmetry with `count`
   */
  delete = async (context: Context, q: query.Delete) => {
    const { text, values } = queryBuilders.deleteQuery(q).toParam();

    const result = await context.result(text, values);
    return result.rowCount.toString();
  }

  /**
   * Counts the number of records matching a Read query.
   *
   * @param context A Context object. It is assumed that the context will be
   * obtained using `withContext`, but filters may optionally supply a different
   * context.
   * @param q The Read query to build and execute.
   * @return The number of rows matching the criteria specified in a Read query.
   */
  count = async (context: Context, q: query.Read) => {
    const { text, values } = queryBuilders.countQuery(q).toParam();

    const result = await context.one(text, values);
    return result.count;
  }

  /**
   * Performs automatic discovery of Source configurations by inspecting the
   * database schema according to rules given in `config.discovery`.
   *
   * @param context The Context to use for executing queries used to inspect
   * the Schema.
   *
   * @return A Promise that will resolve to a list of Source configurations.
   */
  discover = async (context: Context) => {
    const sources = this.config.discovery.map(config => inspect(context, config));

    return Promise.all(sources)
      .then(flatten);
  }
}
