import * as Koa from 'koa';
import koaBunyanLogger = require('koa-bunyan-logger');

import { Config } from './config';

/**
 * Responsible for initializing and managing a Koa HTTP Server.
 */
export class Server<T extends Config> {
  /**
   * The internal Koa instance. It is never directly accessed by Hypergres
   * internally, but is exposed to allow consumers to supply their own
   * middleware if desired.
   */
  koa: Koa;

  constructor(public config: T) {
    this.koa = new Koa();
    this.koa.use(koaBunyanLogger({
      name: 'server'
    }));
    this.koa.use(koaBunyanLogger.requestLogger());
  }

  /**
   * Starts the Koa server on the configured port
   */
  start() {
    this.koa.listen(this.config.server.port);
  }
}
