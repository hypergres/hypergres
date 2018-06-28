import * as yargs from 'yargs';

/**
 * Describes all of the arguments that the CLI accepts. See each corresponding
 * `yargs.option` call for a description.
 */
export interface Args {
  hgconfig: string;
}

// tslint:disable-next-line:no-unused-expression
yargs
  .option('hgconfig', {
    desc: 'Path to the hgconfig to use',
    default: 'hgconfig.yaml'
  })
  .commandDir('cli', {
    extensions: ['js', 'ts'],
    exclude: /\.test.*$/
  })
  .demandCommand()
  .help()
  .argv;
