import { flatten, identity, merge, mergeAll } from 'ramda';

import { Schema, SchemaProperties, PropertyAttributes } from '../../../source';
import { Table, Column, Options } from '../discovery';

/**
 * Allows Integer columns to be represented as a String when the `strictNumbers`
 * option is not in use.
 */
const TYPE_STRING_INTEGER = {
  type: 'string',
  pattern: '^\\d+$'
};

/**
 * Allows Decimal columns to be represented as a String when the `strictNumbers`
 * option is not in use.
 */
const TYPE_STRING_DECIMAL = {
  type: 'string',
  pattern: '^[1-9]\d*(\.\d+)?$'
};

/**
 * Allows any numerical Column to be represented as a Number when the
 * `strictNumbers` option is in use.
 */
const TYPE_NUMBER = {
  type: 'number'
};

/**
 * An keyed dictionary of Property Attribute defintions, to aid type lookups
 */
interface PropertyAttributeDictionary {
  [key: string]: PropertyAttributes;
}

/**
 * The lookup table for translating common PostgreSQL column types to their JSON
 * Schema counterpart. 'big' (64-bit) numbers are always expressed as strings to
 * prevent accidental truncation by JavaScript.
 */
const BASE_TYPES: PropertyAttributeDictionary = {
  'bigserial': TYPE_STRING_INTEGER,
  'boolean': { type: 'boolean' },
  'character': { type: 'string' },
  'bigint': TYPE_STRING_INTEGER,
  'json': { type: 'object' },
  'jsonb': { type: 'object' },

  'text': { type: 'string' },

  'interval': {
    type: 'object',
    format: 'interval',
    minProperties: 1,
    additionalProperties: false,
    properties: {
      milliseconds: { type: 'number' },
      seconds: { type: 'number' },
      minutes: { type: 'number' },
      hours: { type: 'number' },
      days: { type: 'number' },
      months: { type: 'number' },
      years: { type: 'number' }
    }
  },

  'character varying': { type: 'string' },
  'date': { type: 'string', format: 'date-time' },
  'time without time zone': { type: 'string', format: 'date-time' },
  'time with time zone': { type: 'string', format: 'date-time' },
  'timestamp without time zone': { type: 'string', format: 'date-time' },
  'timestamp with time zone': { type: 'string', format: 'date-time' }
};

/**
 * Used by `isEnumConstraint` to determine if a Column's contraints can be
 * expressed as an Enum.
 */
const ENUM_CHECK_REGEX = /^\(.* = ANY \(ARRAY\[(.*)\]\)\)/;

/**
 * Used by `isEnumConstraint` to extract the allowed values from a Column's
 * contraints when it can be expressed as an Enum.
 */
const ENUM_EXTRACT_VALUE_REGEX = /^'(.*)'::.*/;

/**
 * Inspects a given Table definition and its Columns and generates a JSON Schema
 * document
 *
 * @param name The name of the table to generate a schema for
 * @param options Options to use for schema creation
 * @returns A promise that will resolve to the schema for the given table
 */
export const schema = (table: Table, columns: Column[], options: Options = {}): Schema => ({
  $schema: 'http://json-schema.org/draft-04/schema#',
  title: table.name,
  type: 'object',
  properties: properties(columns, options),
  required: required(columns, options)
});

/**
 * Maps over an array of `columns` to generate a schema definition for each
 * column, keyed by name
 *
 * @param columns The columns to document
 * @param options Options to use for schema creation
 * @returns A map of JSON Schema property definitions, keyed by column name
 */
export const properties = (columns: Column[], options: Options = {}): SchemaProperties =>
  mergeAll(columns.map(column => property(column, options))) as SchemaProperties;

/**
 * Documents the Type and other attributes of a single column according to JSON
 * Schema semantics
 *
 * @param column The column to document
 * @param options Options to use for schema creation
 * @returns A JSON Schema property definition
 */
export const property = (column: Column, options: Options = {}): SchemaProperties => {
  return {
    [column.name]: mergeAll([
      columnType(column, options),
      isReadOnly(column),
      isEnumConstraint(column)
    ]) as PropertyAttributes
  };
};

/**
 * Expressed the PostgreSQL type information about a Column using JSON Schema
 * type semantics. `options.strictNumbers` is used to determine if a numeric
 * column type should be reported as a simple `number` type, or a String with a
 * corresponding regular expression.
 *
 * @param column The Column to document
 * @param options Options to use for schema creation
 * @returns An object containing `type`, `format` and other properties that
 * adequately express PostgreSQL type information.
 */
export const columnType = (column: Column, options: Options = {}): PropertyAttributes => {
  const TYPE_INTEGER = options.strictNumbers ?
    TYPE_NUMBER :
    { oneOf: [TYPE_NUMBER, TYPE_STRING_INTEGER] };

  const TYPE_DECIMAL = options.strictNumbers ?
    TYPE_NUMBER :
    { oneOf: [TYPE_NUMBER, TYPE_STRING_DECIMAL] };

  const types = merge(BASE_TYPES, {
    'integer': TYPE_INTEGER,
    'numeric': TYPE_DECIMAL,
    'real': TYPE_DECIMAL,
    'smallint': TYPE_INTEGER,
    'smallserial': TYPE_INTEGER,
    'serial': TYPE_INTEGER,
    'double precision': TYPE_DECIMAL,
  } as PropertyAttributeDictionary);

  return types[column.type];
};

/**
 * Determines if a column should be declared read-only by determining if the
 * column is a primary key that uses a sequence
 *
 * @param column The column to inspect
 * @returns `{readOnly: true}` if the column should be marked read-only
 */
export const isReadOnly = (column: Column): Partial<PropertyAttributes> => {
  const isPrimary = column.isprimarykey &&
    column.nullable === false &&
    typeof column.default === 'string' &&
    (column.default as string).startsWith('nextval');

  return isPrimary ? { readOnly: true } : {};
};

/**
 * Determines if a column should be declared an enumeration by determining if
 * the column contains a suitable CHECK constraint
 *
 * @param column the column to inspect
 * @returns `{enum: [values]}` if the column contains a suitable CHECK contraint
 */
export const isEnumConstraint = (column: Column): Partial<PropertyAttributes> => {
  if (!column.constraints || !column.constraints.length) {
    return {};
  }

  const values = column.constraints
    .map(constraint => {
      if (!constraint) {
        return [];
      }

      const result = constraint.match(ENUM_CHECK_REGEX);
      if (!result || !result[1]) {
        return [];
      }

      return result[1].split(', ')
        .map(value => {
          const matches = value.match(ENUM_EXTRACT_VALUE_REGEX);
          return matches && matches[1];
        })
        .filter(identity) as string[];
    })
    .filter(identity);

  if (!values.length) {
    return {};
  }

  return { enum: flatten(values) };
};

/**
 * Determines if a Column requires a value to be given explicitly. It is assumed
 * that a column requires an explicit value to be given if:
 * - It is not nullable
 * - It does not specify a default value
 *
 * @param column The Column to inspect
 * @returns `true` if a value is required, otherwise `false`.
 */
export const isRequired = (column: Column) =>
  column.nullable === false && column.default === null;

/**
 * Determines the required properties by looking for `columns` that are not
 * nullable and do not specify a default value
 *
 * @param columns The columns to document
 * @returns A list of property names that are required
 */
export const required = (columns: Column[], options: Options = {}): string[] =>
  columns
    .filter(isRequired)
    .map(column => column.name);
