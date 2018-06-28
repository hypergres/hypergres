// tslint:disable:completed-docs
import { Args } from '../cli';
import { init as initConfig } from '../config';
import { handleError } from '../common';

export const command = 'init';

export const desc = 'Initializes a Hypergres project by creating an hgconfig file';

export const handler = async (args: Args) => {
  try {
    const dest = await initConfig(args.hgconfig);
    console.log(`Wrote config file to '${dest}'.`);
  } catch (err) {
    return handleError(err);
  }
};
