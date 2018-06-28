// tslint:disable:completed-docs
import { createLogger } from 'bunyan';
import { pick } from 'ramda';

import { Args } from '../cli';
import { handleError } from '../common';
import { load as loadConfig } from '../config';
import { Core } from '../core';

const log = createLogger({
  name: 'start'
});

export const command = 'start';

export const desc = 'Starts the Hypergres server using an hgconfig file';

export const aliases = ['up', 'serve', 'server', 'run'];

export const handler = async (args: Args) => {
  log.info(pick(['hgconfig'], args), 'Loading hgconfig');

  try {
    const config = await loadConfig(args.hgconfig);
    const core = new Core();
    await core.configure(config);
    core.start();
  } catch (err) {
    return handleError(err, log);
  }
};
