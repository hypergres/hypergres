import * as queryBuilders from './queryBuilders';

describe('createQuery', () => {
  it('creates an INSERT query', () => {
    const { text, values } = queryBuilders
      .createQuery({
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
          description: 'testing...'
        }
      })
      .toParam();

    expect(text).toBe('INSERT INTO test (name, description) VALUES ($1, $2) RETURNING id');

    expect(values).toEqual(['test', 'testing...']);
  });
});

describe('readQuery', () => {
  it('creates a SELECT query', () => {
    const { text, values } = queryBuilders
      .readQuery({
        source: {
          name: 'test',
          identifyingProperties: ['id'],
          has: [],
          belongsTo: []
        },
        schema: {} as any,
      })
      .toParam();

    expect(text).toBe('SELECT test.* FROM test');
    expect(values).toEqual([]);
  });
});

describe('updateQuery', () => {
  it('creates an UPDATE query', () => {
    const { text, values } = queryBuilders
      .updateQuery({
        source: {
          name: 'test',
          identifyingProperties: ['id'],
          has: [],
          belongsTo: []
        },
        returning: ['id'],
        schema: {} as any,
        data: {
          name: 'test2',
        },
        conditions: [{
          field: 'id',
          value: 2
        }]
      })
      .toParam();

    expect(text).toBe('UPDATE test SET name = $1 WHERE (test.id = $2) RETURNING id');
    expect(values).toEqual(['test2', 2]);
  });
});

describe('deleteQuery', () => {
  it('creates a DELETE query', () => {
    const { text, values } = queryBuilders
      .deleteQuery({
        source: {
          name: 'test',
          identifyingProperties: ['id'],
          has: [],
          belongsTo: []
        },
        conditions: [{
          field: 'id',
          value: 2
        }]
      })
      .toParam();

    expect(text).toBe('DELETE FROM test WHERE (test.id = $1)');
    expect(values).toEqual([2]);
  });
});

describe('countQuery', () => {
  it('creates a SELECT COUNT(*) query', () => {
    const { text, values } = queryBuilders
      .countQuery({
        source: {
          name: 'test',
          identifyingProperties: ['id'],
          has: [],
          belongsTo: []
        },
        schema: {} as any,
        conditions: [{
          field: 'active',
          value: true
        }]
      })
      .toParam();

    expect(text).toBe('SELECT COUNT(*) FROM test WHERE (test.active = $1)');
    expect(values).toEqual([true]);
  });
});
