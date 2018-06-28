import { createLogger } from 'bunyan';
import { IOptions } from 'pg-promise';

import { Provider as ProviderConfig } from '../../config';

/**
 * Creates a pg-promise Options object that logs key events to a Bunyan logger instance.
 *
 * @param config The Provider configuration to use for creating the Logger instance.
 * @returns An object containing event handlers that may be passed to pg-promise.
 */
export const create = (config: ProviderConfig): Partial<IOptions<any>> => {
  const log = createLogger({
    name: 'postgresql',
    id: config.id
  });

  return {
    connect: ({ database }) => log.info({
      event: 'connect',
      database
    }),

    disconnect: ({ database }) => log.info({
      event: 'disconnect',
      database
    }),

    error: err => log.error(err),

    query: ({ query }) => log.info({
      event: 'query',
      query
    }),

    receive: ({ }, { }, { ctx }) => log.info({
      event: 'receive',
      duration: ctx.duration
    }),

    task: ({ ctx }) => {
      const msg = ctx.finish ?
        { event: 'task:finish', duration: ctx.duration } :
        { event: 'task:start' };

      log.info(msg);
    }
  };
};
