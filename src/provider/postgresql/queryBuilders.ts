import * as _squel from 'squel';
import { identity } from 'ramda';

import * as helpers from './queryHelpers';
import * as query from '../../query';

/**
 * An instance of the Squel query builder that is pre-configured to use
 * Postgresql and pass Array values directly through to the DB driver
 */
export const squel = _squel.useFlavour('postgres');

squel.registerValueHandler(Array, identity);

/**
 * Creates an `INSERT...` query
 */
export const createQuery = (q: query.Create) => {
  const result = squel
    .insert()
    .into(q.source.name)
    .returning(q.returning.join(','));

  const data = helpers.addQueryJoinCTEs(result, q);
  helpers.addQueryValues(result, data);

  return result;
};

/**
 * Creates a `SELECT...` query
 */
export const readQuery = (q: query.Read) => {
  const result = squel
    .select()
    .from(q.source.name);

  helpers.addQueryFields(result, q);
  helpers.addQueryJoins(result, q);
  helpers.addQueryConditions(result, q);
  helpers.addQueryOrder(result, q);
  helpers.addQueryConditions(result, q);
  helpers.addQueryPagination(result, q);

  return result;
};

/**
 * Creates an `UPDATE...` query
 */
export const updateQuery = (q: query.Update) => {
  const result = squel
    .update()
    .table(q.source.name)
    .returning(q.returning.join(','));

  const data = helpers.addQueryJoinCTEs(result, q);
  helpers.addQueryValues(result, data);
  helpers.addQueryConditions(result, q);

  return result;
};

/**
 * Creates a `DELETE...` query
 */
export const deleteQuery = (q: query.Delete) => {
  const result = squel
    .delete()
    .from(q.source.name);

  helpers.addQueryConditions(result, q);

  return result;
};

/**
 * Creates a `SELECT COUNT(*)...` query
 */
export const countQuery = (q: query.Read) => {
  const result = squel
    .select()
    .from(q.source.name)
    .field('COUNT(*)');

  helpers.addQueryJoins(result, q, true);
  helpers.addQueryConditions(result, q);

  return result;
};
