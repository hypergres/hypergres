declare module 'koa-bunyan-logger' {
  interface KoaBunyanLogger {
    (options: any): any;
    requestLogger: (...args: any[]) => any;
  }

  const createLogger: KoaBunyanLogger;

  export = createLogger;
}
