// Fail-closed paging for the GraphQL answers that .claude/hooks/session-plan.mjs loads into the context.
// A connection paged with `first` reports hasNextPage, one paged with `last` reports hasPreviousPage
// (https://docs.github.com/en/graphql/guides/using-pagination-in-the-graphql-api).

/** @typedef {string | number | boolean | null | Json[] | { [key: string]: Json }} Json */

const MORE = ['hasNextPage', 'hasPreviousPage'];

/** @param {Json} value @returns {value is Json[] | { [key: string]: Json }} */
const isObject = (value) => typeof value === 'object' && value !== null;

/** @param {Json} page @returns {boolean} */
const morePages = (page) => isObject(page) && MORE.some((key) => page[key] === true);

/** @param {string} path @param {string} key */
const join = (path, key) => (path ? `${path}.${key}` : key);

/**
 * The path of every connection that holds more items than its page, so a caller can fail closed
 * instead of reading a cut-off list.
 * @param {Json} data @param {string} [path] @returns {string[]}
 */
export const truncatedConnections = (data, path = '') =>
  isObject(data)
    ? Object.entries(data).flatMap(([key, value]) =>
        key === 'pageInfo' && morePages(value) ? [path] : truncatedConnections(value, join(path, key)),
      )
    : [];
