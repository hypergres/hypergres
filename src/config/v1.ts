import { Config as PGOptions } from '../provider/postgresql';
import { Config as PGDiscoveryConfig } from '../provider/postgresql/discovery';

/**
 * Describes a Provider configuration.
 */
export interface Provider {
  /**
   * Each Provider must specific a unique identifying name.
   */
  id: string;

  /**
   * The type of Provider to instantiate. Currently, only the `postgresql`
   * driver is supported.
   */
  driver: 'postgresql';

  /**
   * Connection options to pass to the Driver on instantiation. Currently, only
   * configuration options accepted by pg-promise are supported.
   */
  options: PGOptions;

  /**
   * Automatic Source discovery options. Currently, only discovery rules
   * accepted by the PostgreSQL driver are supported.
   */
  discovery: PGDiscoveryConfig[];
}

/**
 * Describes the Authentication parameters for a Hypergres server.
 */
export interface Authentication {
  /**
   * The Strategy to use for generating and parsing credentials. Currently, only
   * the `jwt` strategy is supported, which parses JSON Web Tokens from the
   * `Authorization` HTTP Header.
   */
  strategy: 'jwt';
  /**
   * The Adapter to use for verifying credentials passed by the associated
   * Strategy. Currently, only the `source` adapter is supported, which performs
   * a lookup against a data Source.
   */
  adapter: 'source';
}

/**
 * Describes Version 1 of the top-level Configuration that the Hypergres core
 * accepts. Until the official release of Hypergres Version 1, this format is
 * subject to change.
 */
export interface V1 {
  version: 'v1';

  /**
   * A list of Provider configurations to instantiate during Core
   * initialisation.
   */
  providers: Provider[];

  /**
   * Authentication configuration(s) to apply to all exposed Actions. May be
   * `false` to explicitly disable authentication, or an Authentication
   * configuration.
   */
  authentication: false | Authentication;

  server: {
    port: number
  };
}
