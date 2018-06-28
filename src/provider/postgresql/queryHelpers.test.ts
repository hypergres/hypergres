import * as queryHelpers from './queryHelpers';
import * as query from '../../query';
import { squel } from './queryBuilders';

describe('addQueryJoinCTEs', () => {
  const test = (data: {}, joins: query.Join[]) => {
    const q: query.Create = {
      source: {
        name: 'tasks',
        identifyingProperties: ['id'],
        has: [],
        belongsTo: []
      },
      schema: {} as any,
      returning: [],
      data,
      joins,
    };

    const result = squel
      .insert()
      .into('tasks');

    const newData = queryHelpers.addQueryJoinCTEs(result, q);
    queryHelpers.addQueryValues(result.setFields(newData));

    return result.toParam();
  };

  describe('when `query.joins` defines nested data', () => {
    it('uses Common Table Expressions to insert all rows in a single query', () => {
      const { text, values } = test({
        name: 'new task',
        project: {
          name: 'new project'
        },
        owner: {
          name: 'new user'
        }
      }, [{
        source: 'users',
        path: ['owner'],
        from: 'owner',
        to: 'id'
      }, {
        source: 'projects',
        path: ['project'],
        from: 'project',
        to: 'id'
      }]);

      expect(text).toBe(
        `WITH project AS (`
        + `INSERT INTO projects (name) VALUES ($1) RETURNING id`
        + `), owner AS (`
        + `INSERT INTO users (name) VALUES ($2) RETURNING id`
        + `) INSERT INTO tasks (name, project, owner)`
        + ` VALUES ($3, (SELECT id FROM project), (SELECT id FROM owner))`
      );

      expect(values).toEqual(['new project', 'new user', 'new task']);
    });
  });

  describe('when nested data is missing', () => {
    it('does not add a CTE or modify query data', () => {
      const { text, values } = test({
        name: 'new task',
        project: 10,
        owner: {
          name: 'new user'
        }
      }, [{
        source: 'users',
        path: ['owner'],
        from: 'owner',
        to: 'id'
      }, {
        source: 'projects',
        path: ['project'],
        from: 'project',
        to: 'id'
      }]);

      expect(text).toBe(
        `WITH owner AS (`
        + `INSERT INTO users (name) VALUES ($1) RETURNING id`
        + `) INSERT INTO tasks (name, project, owner)`
        + ` VALUES ($2, $3, (SELECT id FROM owner))`
      );

      expect(values).toEqual(['new user', 'new task', 10]);
    });
  });
});

describe('addQueryFields', () => {
  const test = (fields?: query.Field[]) => {
    const q = squel
      .select()
      .from('test');

    queryHelpers.addQueryFields(q, {
      source: {
        name: 'test',
        identifyingProperties: ['id'],
        has: [],
        belongsTo: []
      },
      schema: {} as any,
      fields
    });

    return q.toParam();
  };

  describe('when no fields are defined', () => {
    it('adds all fields from source table', () => {
      const { text, values } = test();

      expect(text).toBe(
        'SELECT test.* FROM test'
      );

      expect(values).toEqual([]);
    });
  });

  it('adds explcitly defined fields', () => {
    const { text, values } = test(['id', 'name']);

    expect(text).toBe(
      'SELECT test.id, test.name FROM test'
    );

    expect(values).toEqual([]);
  });

  it('adds $raw fields`', () => {
    const { text, values } = test(['id', {
      $raw: {
        fragment: 'COUNT(test.project) OVER ()'
      }
    }]);

    expect(text).toBe(
      'SELECT test.id, COUNT(test.project) OVER () FROM test'
    );

    expect(values).toEqual([]);
  });
});

describe('addQueryValues', () => {
  const test = (data: {}) => {
    const q = squel
      .insert()
      .into('test');

    queryHelpers.addQueryValues(q, data);

    return q.toParam();
  };

  it('adds simple objects', () => {
    const { text, values } = test({
      name: 'test',
      description: 'testing...'
    });

    expect(text).toBe(
      `INSERT INTO test (name, description) VALUES ($1, $2)`
    );

    expect(values).toEqual(['test', 'testing...']);
  });

  it('passes array values straight through to DB driver', () => {
    const { text, values } = test({
      name: 'test',
      tags: ['one', 'two']
    });

    expect(text).toBe(
      `INSERT INTO test (name, tags) VALUES ($1, ($2))`
    );

    expect(values).toEqual(['test', ['one', 'two']]);
  });
});

describe('addQueryFields', () => {
  const test = (fields?: query.Field[]) => {
    const q = squel
      .select()
      .from('test');

    queryHelpers.addQueryFields(q, {
      source: {
        name: 'test',
        identifyingProperties: ['id'],
        has: [],
        belongsTo: []
      },
      schema: {} as any,
      fields
    });

    return q.toParam();
  };

  describe('when no fields are defined', () => {
    it('adds all fields from source table', () => {
      const { text, values } = test();

      expect(text).toBe(
        'SELECT test.* FROM test'
      );

      expect(values).toEqual([]);
    });
  });

  it('adds explcitly defined fields', () => {
    const { text, values } = test(['id', 'name']);

    expect(text).toBe(
      'SELECT test.id, test.name FROM test'
    );

    expect(values).toEqual([]);
  });

  it('adds $raw fields`', () => {
    const { text, values } = test(['id', {
      $raw: {
        fragment: 'COUNT(test.project) OVER ()'
      }
    }]);

    expect(text).toBe(
      'SELECT test.id, COUNT(test.project) OVER () FROM test'
    );

    expect(values).toEqual([]);
  });
});

describe('addQueryJoins', () => {
  const test = (joins?: query.Join[], counting = false) => {
    const q = squel
      .select()
      .field('test.*')
      .from('test');

    queryHelpers.addQueryJoins(q, {
      source: {
        name: 'test',
        identifyingProperties: ['id'],
        has: [],
        belongsTo: []
      },
      schema: {} as any,
      joins
    }, counting);

    return q.toParam();
  };

  it('adds JOIN clauses using `query.joins`', () => {
    const { text, values } = test([{
      source: 'users',
      path: ['test', 'users'],
      from: 'owner_id',
      to: 'id'
    }]);

    expect(text).toBe(
      `SELECT test.*, row_to_json(testΔusers.*) AS testΔusers`
      + ` FROM test`
      + ` LEFT JOIN users AS testΔusers ON`
      + ` (testΔusers.id = test.owner_id)`
    );

    expect(values).toEqual([]);
  });

  describe('when counting using a join', () => {
    it('does not add JOINed columns to SELECT clause', () => {
      const { text, values } = test([{
        source: 'users',
        path: ['test', 'users'],
        from: 'owner_id',
        to: 'id'
      }], true);

      expect(text).toBe(
        `SELECT test.*`
        + ` FROM test`
        + ` LEFT JOIN users AS testΔusers ON`
        + ` (testΔusers.id = test.owner_id)`
      );

      expect(values).toEqual([]);
    });
  });
});

describe('addQueryConditions', () => {
  const test = (conditions?: query.Condition[]) => {
    const q = squel
      .select()
      .from('test');

    queryHelpers.addQueryConditions(q, {
      source: {
        name: 'test',
        identifyingProperties: ['id'],
        has: [],
        belongsTo: []
      },
      conditions
    });

    return q.toParam();
  };

  it('adds WHERE clause using `query.conditions`', () => {
    const { text, values } = test([{
      field: 'id',
      value: 1
    }]);

    expect(text).toBe(
      'SELECT * FROM test WHERE (test.id = $1)'
    );

    expect(values).toEqual([1]);
  });

  it('supports custom operators in WHERE terms', () => {
    const { text, values } = test([{
      field: 'id',
      operator: '>',
      value: 5
    }]);

    expect(text).toBe('SELECT * FROM test WHERE (test.id > $1)');
    expect(values).toEqual([5]);
  });

  describe('when conditions contain multiple elements at the top level', () => {
    it('generates AND terms in WHERE clause', () => {
      const { text, values } = test([{
        field: 'id',
        value: 5
      }, {
        field: 'name',
        value: 'test'
      }]);

      expect(text).toBe(
        'SELECT * FROM test WHERE (test.id = $1) AND (test.name = $2)'
      );

      expect(values).toEqual([5, 'test']);
    });
  });

  describe('when conditions contain multiple elements using $and', () => {
    it('generates AND terms in WHERE clause', () => {
      const { text, values } = test([{
        $and: [{
          field: 'id',
          value: 5
        }, {
          field: 'name',
          value: 'test'
        }]
      }]);

      expect(text).toBe(
        'SELECT * FROM test WHERE ((test.id = $1) AND (test.name = $2))'
      );

      expect(values).toEqual([5, 'test']);
    });
  });

  describe('when conditions contain multiple elements using $or', () => {
    it('generates OR terms in WHERE clause', () => {
      const { text, values } = test([{
        $or: [{
          field: 'id',
          value: 5
        }, {
          field: 'name',
          value: 'test'
        }]
      }]);

      expect(text).toBe(
        'SELECT * FROM test WHERE ((test.id = $1) OR (test.name = $2))'
      );

      expect(values).toEqual([5, 'test']);
    });
  });

  describe('when conditions contain a mixture of $and and $or terms', () => {
    it('generates grouped AND/OR terms', () => {
      const { text, values } = test([{
        $or: [{
          field: 'id',
          value: 5
        }, {
          field: 'name',
          value: 'test'
        }]
      }, {
        field: 'description',
        value: '%test%',
        operator: 'LIKE'
      }]);

      expect(text).toBe(
        'SELECT * FROM test WHERE ((test.id = $1) OR (test.name = $2)) AND (test.description LIKE $3)'
      );

      expect(values).toEqual([5, 'test', '%test%']);
    });
  });

  it('generates raw WHERE terms when using `$raw`', () => {
    const { text, values } = test([{
      $raw: {
        fragment: 'CONCAT(test.name, test.description) LIKE ?',
        values: ['%test%']
      }
    }]);

    expect(text).toBe(
      'SELECT * FROM test WHERE (CONCAT(test.name, test.description) LIKE $1)'
    );

    expect(values).toEqual(['%test%']);
  });

  it('handles `$raw` terms without values', () => {
    const { text, values } = test([{
      $raw: {
        fragment: 'CONCAT(test.name, test.description) LIKE %test%'
      }
    }]);

    expect(text).toBe(
      'SELECT * FROM test WHERE (CONCAT(test.name, test.description) LIKE %test%)'
    );

    expect(values).toEqual([]);
  });

  it('combines $raw, $and and $or', () => {
    const { text, values } = test([{
      $or: [{
        $raw: {
          fragment: 'CONCAT(test.name, test.description) LIKE ?',
          values: ['%test%']
        }
      }, {
        field: 'id',
        value: 1
      }, {
        field: 'name',
        value: 'test'
      }]
    }]);

    expect(text).toEqual(
      'SELECT * FROM test WHERE ((CONCAT(test.name, test.description) LIKE $1)'
      + ' OR (test.id = $2) OR (test.name = $3))'
    );

    expect(values).toEqual(['%test%', 1, 'test']);
  });
});

describe('addQueryOrder', () => {
  const test = (order: query.Order[]) => {
    const q = squel
      .select()
      .from('test');

    queryHelpers.addQueryOrder(q, {
      source: {
        name: 'test',
        identifyingProperties: ['id'],
        has: [],
        belongsTo: []
      },
      schema: {} as any,
      order
    });

    return q.toParam();
  };

  it('adds ORDER clauses', () => {
    const { text, values } = test([{
      field: 'name',
      direction: 'asc'
    }]);

    expect(text).toBe('SELECT * FROM test ORDER BY name ASC');

    expect(values).toEqual([]);
  });

  it('respects `desc` direction', () => {
    const { text, values } = test([{
      field: 'name',
      direction: 'desc'
    }]);

    expect(text).toBe('SELECT * FROM test ORDER BY name DESC');

    expect(values).toEqual([]);
  });
});

describe('addQueryPagination', () => {
  const test = (page?: query.Page) => {
    const q = squel
      .select()
      .from('test');

    queryHelpers.addQueryPagination(q, {
      source: {
        name: 'test',
        identifyingProperties: ['id'],
        has: [],
        belongsTo: []
      },
      schema: {} as any,
      page
    });

    return q.toParam();
  };

  it('adds LIMIT and OFFSET clauses based on `query.page`', () => {
    const { text, values } = test({
      size: 5,
      number: 4
    });

    expect(text).toBe('SELECT * FROM test LIMIT $1 OFFSET $2');

    expect(values).toEqual([5, 15]);
  });
});
