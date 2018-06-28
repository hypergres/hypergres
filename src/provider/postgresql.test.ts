import * as pgPromise from 'pg-promise'; // Mock

import { PostgreSQL } from './postgresql';
import { Provider as ProviderConfig } from '../config';
import * as queryBuilders from './postgresql/queryBuilders';

const pgp = pgPromise();

describe('PostgreSQL', () => {
  const config = {
    id: 'test',
    driver: 'postgresql',

    options: {
      hostname: 'test'
    }
  } as any as ProviderConfig;

  let pg: PostgreSQL;

  beforeEach(() => {
    pg = new PostgreSQL(config);
  });

  describe('constructor', () => {
    it('initializes a pg-promise connection using `options`', () => {
      expect(pgp).toHaveBeenCalledWith(config.options);
      expect(pg.db).toBe(pgp(config.options));
    });
  });

  describe('#create', () => {
    it('performs an INSERT query', () => {
      jest.spyOn(queryBuilders, 'createQuery')
        .mockReturnValue(({
          toParam: () => ({
            text: 'mock INSERT query',
            values: 'mock INSERT values'
          })
        }));

      const expected = [{ id: 10 }];
      (pg.db.manyOrNone as jest.Mock).mockReturnValue(expected);

      const result = pg.withContext(ctx => pg.create(ctx, {
        source: {
          name: 'test',
          identifyingProperties: ['id'],
          has: [],
          belongsTo: []
        },
        returning: ['id'],
        schema: {} as any,
        data: {
          name: 'test',
          owner: {
            name: 'new user'
          }
        }
      }));

      expect(pg.db.manyOrNone).toHaveBeenCalledWith(
        'mock INSERT query',
        'mock INSERT values'
      );

      expect(result).toBe(expected);
    });
  });

  describe('#read()', () => {
    it('performs a SELECT query', () => {
      jest.spyOn(queryBuilders, 'readQuery')
        .mockReturnValue(({
          toParam: () => ({
            text: 'mock SELECT query',
            values: 'mock SELECT values'
          })
        }));

      const expected = [{
        name: 'test',
        description: 'test record'
      }];
      (pg.db.manyOrNone as jest.Mock).mockReturnValue(expected);

      const result = pg.withContext(ctx => pg.read(ctx, {
        source: {
          name: 'test',
          identifyingProperties: ['id'],
          has: [],
          belongsTo: []
        },
        fields: ['id'],
        schema: {} as any,
      }));

      expect(pg.db.manyOrNone).toHaveBeenCalledWith(
        'mock SELECT query',
        'mock SELECT values'
      );

      expect(result).toBe(expected);
    });
  });

  describe('#update()', () => {
    it('performs an UPDATE query', () => {
      jest.spyOn(queryBuilders, 'updateQuery')
        .mockReturnValue(({
          toParam: () => ({
            text: 'mock UPDATE query',
            values: 'mock UPDATE values'
          })
        }));

      const expected = [{ id: 10 }];
      (pg.db.manyOrNone as jest.Mock).mockReturnValue(expected);

      const result = pg.withContext(ctx => pg.update(ctx, {
        source: {
          name: 'test',
          identifyingProperties: ['id'],
          has: [],
          belongsTo: []
        },
        returning: ['id'],
        schema: {} as any,
        data: {
          name: 'newtest'
        }
      }));

      expect(pg.db.manyOrNone).toHaveBeenCalledWith(
        'mock UPDATE query',
        'mock UPDATE values'
      );

      expect(result).toBe(expected);
    });
  });

  describe('#delete()', () => {
    it('performs a DELETE query', async () => {
      jest.spyOn(queryBuilders, 'deleteQuery')
        .mockReturnValue(({
          toParam: () => ({
            text: 'mock DELETE query',
            values: 'mock DELETE values'
          })
        }));

      (pg.db.result as jest.Mock).mockReturnValue({ rowCount: 1 });

      const result = await pg.withContext(ctx => pg.delete(ctx, {
        source: {
          name: 'test',
          identifyingProperties: ['id'],
          has: [],
          belongsTo: []
        },
      }));

      expect(pg.db.result).toHaveBeenCalledWith(
        'mock DELETE query',
        'mock DELETE values'
      );

      expect(result).toBe('1');
    });
  });

  describe('#count()', () => {
    it('performs a SELECT COUNT(*) query', async () => {
      jest.spyOn(queryBuilders, 'countQuery')
        .mockReturnValue(({
          toParam: () => ({
            text: 'mock COUNT query',
            values: 'mock COUNT values'
          })
        }));

      (pg.db.one as jest.Mock).mockReturnValue({ count: 99 });

      const result = await pg.withContext(ctx => pg.count(ctx, {
        source: {
          name: 'test',
          identifyingProperties: ['id'],
          has: [],
          belongsTo: []
        },
        schema: {} as any
      }));

      expect(pg.db.result).toHaveBeenCalledWith(
        'mock DELETE query',
        'mock DELETE values'
      );

      expect(result).toBe(99);
    });
  });
});
