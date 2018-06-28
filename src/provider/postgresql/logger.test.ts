import { createLogger } from 'bunyan'; // Mock

import * as logger from './logger';

const bunyan = createLogger({ name: 'test' });

describe('create', () => {
  const events = logger.create({ id: 'default' } as any);

  it('logs PostgreSQL events', () => {
    expect(createLogger).toHaveBeenCalledWith({
      name: 'postgresql',
      id: 'default'
    });

    events.connect({ database: 'test' } as any, undefined, false);

    expect(bunyan.info).toHaveBeenCalledWith({
      event: 'connect',
      database: 'test'
    });

    events.disconnect({ database: 'test' } as any, undefined);
    expect(bunyan.info).toHaveBeenCalledWith({
      event: 'disconnect',
      database: 'test'
    });

    const err = new Error('db error');
    events.error(err, undefined);
    expect(bunyan.error).toHaveBeenCalledWith(err);

    events.query({ query: 'SELECT * FROM widgets' } as any);
    expect(bunyan.info).toHaveBeenCalledWith({
      event: 'query',
      query: 'SELECT * FROM widgets'
    });

    events.receive({} as any, {} as any, { ctx: { duration: 12 } } as any);
    expect(bunyan.info).toHaveBeenCalledWith({
      event: 'receive',
      duration: 12
    });

    events.task({ ctx: { finish: false } } as any);
    expect(bunyan.info).toHaveBeenCalledWith({
      event: 'task:start'
    });

    events.task({ ctx: { finish: true, duration: 12 } } as any);
    expect(bunyan.info).toHaveBeenCalledWith({
      event: 'task:finish',
      duration: 12
    });
  });
});
