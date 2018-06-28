import * as Logger from 'bunyan';
import { pick, flatten } from 'ramda';

import { Config } from './config';
import { create as createProvider, discoverSources, Provider } from './provider';
import { Source } from './source';
import { WrappedError, ErrorCode } from './common';
import { Server } from './server';

/**
 * Exposes helpful properties from a Provider configuration to improve the
 * comprehension of log entries.
 */
const providerConfigLogProps = pick(['id', 'driver']);

/**
 * Responsible for intializing and coordinating each of Hypergres' distinct
 * components, such as the HTTP Server and data Providers.
 */
export class Core {
  /**
   * The Configuration data that the Core received during instantiation.
   */
  config?: Config;

  /**
   * An instance of a Bunyan logger.
   */
  log: Logger;

  /**
   * A list of Provider instances that will be created for each entry in
   * `config.providers`.
   */
  providers?: Array<Provider<any>>;

  /**
   * A list of Source configurations. Custom sources may be added to this list
   * after calling `configure()` and before calling `start()`.
   */
  sources?: Source[];

  constructor() {
    this.log = Logger.createLogger({
      name: 'hypergres'
    });
  }

  /**
   * Applies a configuration to the Core instance.
   *
   * @param config The configuration object to apply.
   *
   * @return A Promise that is resolved when configuration is complete.
   */
  configure = async (config: Config) => {
    this.config = config;

    this._createProviders();
    await this._createSources();
  }

  /**
   * Initializes and starts the HTTP Server components according to
   * configuration previously applied by `configure()`.
   */
  start = () => {
    if (!this.config) {
      return;
    }

    console.log(this.sources);
    const server = new Server(this.config);
    server.start();
  }

  /**
   * Creates Provider instances for each configuration specified in
   * `config.providers` and stores them in `providers`.
   *
   * @throws WrappedError When a configuration has not been provided via
   * `configure()`.
   */
  protected _createProviders = () => {
    if (!this.config) {
      throw new WrappedError({
        code: ErrorCode.CORE_NOT_CONFIGURED,
        message: 'Core has not been configued using `configure()` yet.'
      });
    }

    this.providers = this.config.providers.map(providerConfig => {
      this.log.info(providerConfigLogProps(providerConfig), 'Creating data provider');

      return createProvider(providerConfig);
    });
  }

  /**
   * Creates Source configurations by calling `discover` on each configured
   * Provider instance and stores them in `sources`.
   *
   * @throws WrappedError When Providers have not been configured as a result of
   * calling `configure()`.
   */
  protected _createSources = async () => {
    if (!this.providers) {
      throw new WrappedError({
        code: ErrorCode.CORE_NO_PROVIDERS,
        message: 'Core does not have any providers created using `createProviders()` yet.'
      });
    }

    this.sources = await Promise
      .all(this.providers.map(provider => {
        this.log.info(providerConfigLogProps(provider.config), 'Discovering data sources');
        return discoverSources(provider);
      }))
      .then(flatten as (x: Source[][]) => Source[]);
  }
}
