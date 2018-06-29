import * as schema from './schema';
import { Column } from '../discovery';

const id: Column = {
  name: 'id',
  nullable: false,
  default: `nextval('test_id_seq'::regclass)`,
  type: 'integer',
  isPrimaryKey: true,
};

const forename: Column = {
  name: 'forename',
  nullable: false,
  default: null,
  type: 'character varying',
  isPrimaryKey: true,
};

const surname: Column = {
  name: 'surname',
  nullable: false,
  default: null,
  type: 'character varying',
  isPrimaryKey: true,
};

const age: Column = {
  name: 'age',
  nullable: false,
  default: 30,
  type: 'smallint',
  isPrimaryKey: false,
  constraints: [
    '(age > 16)'
  ]
};

const gender: Column = {
  name: 'gender',
  nullable: true,
  default: null,
  type: 'character',
  isPrimaryKey: false,
};

const rating: Column = {
  name: 'rating',
  nullable: true,
  default: null,
  type: 'character',
  isPrimaryKey: false,
  constraints: [
    `(rating = ANY (ARRAY['good'::text, 'average'::text, 'bad'::text]))`
  ]
};

const columns = [id, forename, surname, age, gender, rating];

describe('properties', () => {
  it('fully documents a list of Columns as JSON Schema object properties', () => {
    expect(schema.properties([forename, surname])).toEqual({
      forename: { type: 'string' },
      surname: { type: 'string' }
    });
  });
});

describe('columnType', () => {
  it('returns a JSON Schema compatible type', () => {
    expect(schema.columnType(rating)).toEqual({ type: 'string' });
  });

  describe('when `options.strictNumbers` is false', () => {
    it('allows a number or string matching a pattern', () => {
      expect(schema.columnType(age)).toEqual({
        oneOf: [{
          type: 'number'
        }, {
          type: 'string',
          pattern: jasmine.any(String)
        }]
      });
    });
  });
});

describe('isReadOnly', () => {
  describe('when a column is a primary key', () => {
    it('returns an object containing a `readOnly` property', () => {
      expect(schema.isReadOnly(id)).toEqual({ readOnly: true });
    });
  });

  describe('when a column is not a primary key', () => {
    it('returns an empty object', () => {
      expect(schema.isReadOnly(forename)).toEqual({});
    });
  });
});

describe('isEnumConstraint', () => {
  describe('when a column has no constraints', () => {
    it('returns an empty object', () => {
      expect(schema.isEnumConstraint(forename)).toEqual({});
    });
  });

  describe(`when a column has a constraint that doesn't match`, () => {
    it('returns an empty object', () => {
      expect(schema.isEnumConstraint(age)).toEqual({});
    });
  });

  describe('when a column has a constraint that matches', () => {
    it('returns an object containing an array of extracted values', () => {
      expect(schema.isEnumConstraint(rating)).toEqual({
        enum: [
          'good',
          'average',
          'bad'
        ]
      });
    });
  });
});

describe('required', () => {
  it('returns a list of column names that are not nullable and do not supply a default value', () => {
    expect(schema.required(columns)).toEqual(['forename', 'surname']);
  });
});
