import { default as test } from "ava";

test("[World -> Query] iterate over components with world", (t) => {
  // test simple query
  // test full query without world
  // test query with sub_world
  // test query + system
  // - calling id + query first time update system cache
  // - calling id + query second time re-use value from cache
  // - calling system with pre-cached entity, don't cache query anywhere
  // - use similar id for query, cause query to use cached value
  // - calling id + query outside of system cache query in global space
  // - cache is unique per system, not global
  // - using world property, cause entity to add & mutate additional component at the end of list
  // - after finishing query we reset QUERY_NAME + system_once
  // - after finishing system we reset QUERY_NAME + system_once
  // - opened QUERY_NAME could cause errors
  // - after all systems we reset Queries cache back to global

  t.pass();
});
