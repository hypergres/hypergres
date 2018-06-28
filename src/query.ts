import { JsonSchema } from 'tv4';

import { Source } from './source';

/**
 * For more complicated and specific query terms, consumers may express them in
 * Provider-specifc language. For example, a raw SQL fragment.
 *
 * It is assumed that each Provider implementation is responsible for accepting
 * and executing Raw queries safely.
 */
export interface Raw {
  $raw: {
    /**
     * A fragment of a Provider-specific condition. For example, a SQL string.
     */
    fragment: any;
    /**
     * Additional values to be supplied to the Provider along with `fragment`.
     * Using placeholders in `fragment` and explicitly supplying `values` is
     * preferred, as it allows the Provider to properly escape and quote data.
     */
    values?: any;
  };
}

/**
 * A Property to return from a Resource Item in a `Read` query. A property name
 * may be expressed directly as a String, or by using a Raw query fragment.
 */
export type Field = string | Raw;

/**
 * Used to contrain a query. May be a `ConditionTerm`, an and/or combination of
 * `ConditionTerm`s, or a `Raw` fragment.
 */
export type Condition = ConditionAnd | ConditionOr | ConditionTerm | Raw;

/**
 * Combines multiple Conditions using an AND-style operator.
 */
export interface ConditionAnd {
  $and: Condition[];
}

/**
 * Combines multiple Conditions using an OR-style operator.
 */
export interface ConditionOr {
  $or: Condition[];
}

/**
 * Compares a named property to a given value using a comparison operator.
 */
export interface ConditionTerm {
  /**
   * The name of the Resource Item property to compare.
   */
  field: string;
  /**
   * The value to compare against
   */
  value: any;
  /**
   * The operator to use for the comparison.
   */
  operator?: string;
}

/**
 * Allows Providers to perform Query operations against related Sources, where
 * supported. For example, retrieving 'parent' Resources in a `belongsTo`
 * relationship.
 */
export interface Join {
  source: string;
  path: string[];
  from: string;
  to: string;
  nest?: boolean;
}

/**
 * Allows the order of Resource Items within a Collection to be controlled.
 */
export interface Order {
  /**
   * The name of the Resource Item property to order by.
   */
  field: string;
  /**
   * The direction to order results by.
   */
  direction: string;
}

/**
 * Controls pagination when reading a Resource Collection from a Source.
 */
export interface Page {
  /**
   * The number of items per page.
   */
  size: number;
  /**
   * The page number.
   */
  number: number;
}

/**
 * A Query describes a operation to be executed by a Provider against a Source.
 * The structure and terminology of a Query object should be generic to all
 * potential Provider implementations.
 */
export interface Query {
  /**
   * The name of a Source exposed by a particular Provider instance to be
   * operated upon.
   */
  source: Source;
}

/**
 * Describes how a Provider should insert a Resource Item into a Source.
 */
export interface Create extends Query {
  /**
   * A list of properties to return from the created Resource Item.
   */
  returning: string[];
  /**
   * A JSON Schema document that describes the Resource being created, in case a
   * Provider needs to perform additional transformation or sanitisation on
   * `data` while executing this Query.
   */
  schema: JsonSchema;
  /**
   * Join directives to assist in creating nested Resource Items for Providers
   * that support Relationships.
   */
  joins?: Join[];
  /**
   * The Resource Item data to create.
   */
  data: any;
}

/**
 * Describes how a Provider should retrieve a Resource Item or Collection from a
 * Source.
 */
export interface Read extends Query {
  /**
   * A list of properties to return from a Resource Item, or each Item in a
   * Collection. If omitted, the Provider should assume that all fields are to
   * be returned.
   */
  fields?: Field[];
  /**
   * A list of Condition criteria to apply when determining Resources to match
   * against.
   */
  conditions?: Condition[];
  /**
   * A JSON Schema Document that describes Resources returned by this Query, in
   * case a Provider needs to perform additional transformation on the results
   * before returning them.
   */
  schema: JsonSchema;
  /**
   * Join directives to assist in locating nested Resources for Providers that
   * support Relationships.
   */
  joins?: Join[];
  /**
   * A list of Order clauses to apply. Only relevant when querying for a
   * Resource Collection.
   */
  order?: Order[];
  /**
   * The page size and number to return. Only relevant when querying for a
   * Resource Collection.
   */
  page?: Page;
}

/**
 * Describes how a Provider should update an existing Resource Item within a
 * Source.
 */
export interface Update extends Query {
  /**
   * A list of Condition criteria to determine which Resource Item should be
   * updated.
   */
  conditions?: Condition[];
  /**
   * A list of properties to return from the modified Resource Item.
   */
  returning: string[];
  /**
   * A JSON Schema document that describes the Resource being updated, in case a
   * Provider needs to perform additional transformation or sanitisation on
   * `data` while executing this Query.
   */
  schema: JsonSchema;
  /**
   * Join directives to assist in creating nested Resource Items for Providers
   * that support Relationships.
   */
  joins?: Join[];
  /**
   * The Resource Item data to update.
   */
  data: any;
}

/**
 * Describes how a Provider should delete an existing Resource Item from a
 * Source.
 */
export interface Delete extends Query {
  /**
   * A list of Condition criteria to determine which Resource Item(s) should be
   * deleted.
   */
  conditions?: Condition[];
}
