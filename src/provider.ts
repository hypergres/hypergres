import { Provider as ProviderConfig } from './config';
import { PostgreSQL } from './provider/postgresql';
import { WrappedError, ErrorCode } from './common';
import { Source } from './source';
import { Query, Create, Read, Update, Delete } from './query';

/**
 * A generic type alias for a method that executes a Query within a Context.
 */
type ContextualQuery<Context, Result, Q extends Query> = (context: Context, query: Q) => Promise<Result>;

/**
 * A Provider is the means by which Hypergres communicates with an external data
 * store. For example, a file on disk or a database service. Hypergres ships
 * with a PostgreSQL provider, but consumers may implement custom drivers for
 * other data stores by creating a class the implements this interface.
 *
 * @type Context The Type of the Context object that this Provider expects.
 */
export interface Provider<Context extends any> {
  /**
   * A Provider should make the original Configuration object that was supplied
   * publicly visible, so that consumers may access it directly.
   */
  config: ProviderConfig;

  /**
   * Obtains the Context object and applies it to the callback. This allows
   * built-in methods to work against a consumer-supplied custom context where
   * desired.
   *
   * @param callback A function to invoke with a Context object.
   * @param caller Allows consumers to conditionally replace Context depending
   * on the intended usage for it.
   */
  withContext: (callback: (context: Context) => any, caller?: any) => Promise<any>;

  /**
   * Executes a Create query within a Context
   */
  create: ContextualQuery<Context, any, Create>;

  /**
   * Executes a Read query within a Context
   */
  read: ContextualQuery<Context, any, Read>;

  /**
   * Executes an Update query within a Context
   */
  update: ContextualQuery<Context, any, Update>;

  /**
   * Executes a Delete query within a Context
   */
  delete: ContextualQuery<Context, string, Delete>;

  /**
   * Executes a Count query within a Context
   */
  count: ContextualQuery<Context, string, Read>;

  /**
   * Performs automatic discovery of Source configurations by inspecting the
   * associated data structure. For Providers that do not support this concept,
   * a Promise that resolves to an empty array should be returned.
   */
  discover: (context: Context) => Promise<Source[]>;
}

/**
 * Assists in locating a Provider implementation based on a configuration
 * object. Currently, it only supports the `postgresql` driver and will throw an
 * Error if any other driver name is given.
 */
export const create = (config: ProviderConfig): Provider<any> => {
  if (config.driver === 'postgresql') {
    return new PostgreSQL(config);
  }

  throw new WrappedError({
    code: ErrorCode.PROVIDER_DRIVER_NOT_FOUND,
    message: `A data provider driver with name '${config.driver}' could not be found`
  });
};

/**
 * Instructs a Provider instance to perform automatic discovery of all Source
 * configurations according to the rules given in `config.discovery`.
 *
 * @param provider The Provider instance to perform discovery against.
 *
 * @return A Promise that will resolve to a list of Source configurations.
 */
export const discoverSources = async (provider: Provider<any>): Promise<Source[]> => {
  const results = await provider.withContext(provider.discover) as Source[];
  return Promise.all(results);
};
