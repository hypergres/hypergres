import { Insert, Select, Update, Delete } from 'squel';
import { assocPath, clone, map, path } from 'ramda';

import * as query from '../../query';
import { squel } from './queryBuilders';
import { JOIN_MARKER } from '../postgresql';
import { Source } from '../../source';

/**
 * Adds Common Table Expressions to a query to allow records to be created
 * across multiple columns when INSERTing or UPDATEing a data structure that
 * spans multiple tables.
 *
 * Returns an Object which represents the data to use for the query after
 * substituting nested objects for SELECT queries against the CTEs.
 */
export const addQueryJoinCTEs = (sql: Insert | Update, q: query.Create | query.Update) => {
  if (!q.joins) {
    return q.data;
  }

  let transformedData = clone(q.data);

  q.joins
    .sort(join => join.path.length)
    .forEach(join => {
      const nestedData = path(join.path, q.data);

      if (typeof nestedData !== 'object') {
        return;
      }

      const alias = join.path.join(JOIN_MARKER);

      const nestedInsert = squel
        .insert()
        .into(join.source)
        .returning(join.to);

      addQueryValues(nestedInsert, nestedData);

      (sql as any).with(alias, nestedInsert);

      const nestedSelect = squel
        .select()
        .from(alias)
        .field(join.to);

      transformedData = assocPath(join.path, nestedSelect, transformedData);
    });

  return transformedData;
};

/**
 * Sets data values for INSERT and UPDATE queries. This function exists really
 * just to work around the fact that Squel flattens top-level array values in
 * `#setFields()`, so they need to be wrapped in an additional array.
 */
export const addQueryValues = (sql: Insert | Update, data: { [key: string]: any } = {}) => {
  const values = map(value => value instanceof Array ? [value] : value, data);
  sql.setFields(values);
};

/**
 * Adds columns to a query's SELECT clause based on the `fields` property of a query.
 * If no fields are explicitly given in the query, then default to selecting all
 * columns from the source table
 */
export const addQueryFields = (sql: Select, q: query.Read) => {
  if (!q.fields) {
    sql.field(`${q.source.name}.*`);
    return;
  }

  q.fields.forEach(field => {
    const value = (field as query.Raw).$raw ?
      (field as query.Raw).$raw.fragment :
      `${q.source.name}.${field}`;

    sql.field(value);
  });
};

/**
 * Adds JOIN clauses to a query based on the `joins` property of a query. If the
 * query being used is ultimately going to be used for the purposes of counting,
 * then there is no need to add any columns to the SELECT clause. Otherwise, add
 * all columns from the JOINed table as a JSON object using the `row_to_json`
 * database function.
 */
export const addQueryJoins = (sql: Select, q: query.Read, counting = false) => {
  if (!q.joins) {
    return;
  }

  q.joins.forEach(join => {
    const alias = join.path.join(JOIN_MARKER);
    const self = join.path.slice(0, -1).join(JOIN_MARKER);

    sql.left_join(join.source, alias, `${alias}.${join.to} = ${self}.${join.from}`);

    if (counting) {
      return;
    }

    sql.field(`row_to_json(${alias}.*) AS ${alias}`);
  });
};

/**
 * Adds WHERE clause to a SELECT, UPDATE or DELETE query based on `conditions`
 * property of a query. Delegates to `addQueryCondition` for each condition
 * specified. This is to allow recursive application of deeply nested
 * conditions.
 */
export const addQueryConditions = (sql: Select | Update | Delete, q: query.Read | query.Update | query.Delete) => {
  if (!q.conditions) {
    return;
  }

  q.conditions.forEach(condition => {
    const expr = addQueryCondition(q.source, condition);
    sql.where(expr);
  });
};

/**
 * Adds a WHERE term for each condition in a query. This function is designed to
 * be called recursively so that it may apply to the top-level WHERE clause, or
 * groups of terms when working with deeply nested queries.
 */
export const addQueryCondition = (source: Source, condition: query.Condition) => {
  const result = squel.expr();

  const { $and } = (condition as query.ConditionAnd);
  if ($and) {
    $and.forEach(andCondition => {
      const andExpr = addQueryCondition(source, andCondition);
      result.and(andExpr);
    });

    return result;
  }

  const { $or } = (condition as query.ConditionOr);
  if ($or) {
    $or.forEach(orCondition => {
      const orExpr = addQueryCondition(source, orCondition);
      result.or(orExpr);
    });

    return result;
  }

  const { $raw } = (condition as query.Raw);
  if ($raw) {
    result.and($raw.fragment, ...($raw.values || []));

    return result;
  }

  const { field, operator = '=', value } = (condition as query.ConditionTerm);

  return squel
    .expr()
    .and(`${source.name}.${field} ${operator} ?`, value);
};

/**
 * Adds an ORDER BY clause(s) to a query based on the `order` property of a Read
 * query.
 */
export const addQueryOrder = (sql: Select, q: query.Read) => {
  if (!q.order) {
    return;
  }

  q.order.forEach(order => {
    sql.order(order.field, order.direction.toLowerCase() === 'asc');
  });
};

/**
 * Adds an OFFSET and LIMIT clause to a query based on `page` property of a Read
 * query.
 */
export const addQueryPagination = (sql: Select, q: query.Read) => {
  if (!q.page) {
    return;
  }

  sql.limit(q.page.size);
  sql.offset(q.page.size * (q.page.number - 1));
};
