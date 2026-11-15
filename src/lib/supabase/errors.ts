/**
 * Helpers for interpreting Supabase/PostgREST errors.
 *
 * Deployments can get out of sync with migrations (column added in SQL but not
 * applied yet). Detect that specific case so the UI can degrade gracefully
 * instead of failing an unrelated user action.
 */

interface PostgrestLikeError {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
}

/**
 * True when PostgREST rejected the request because a column does not exist
 * (migration not applied yet).
 */
export function isMissingColumnError(error: unknown, column?: string): boolean {
  if (!error) return false;

  const e = error as PostgrestLikeError;
  const text = [e.code, e.message, e.details, e.hint]
    .filter((part): part is string => typeof part === 'string')
    .join(' ');

  // 42703 = undefined_column, PGRST204 = column not found in schema cache
  const looksLikeMissingColumn =
    e.code === '42703' ||
    e.code === 'PGRST204' ||
    /column .* does not exist/i.test(text) ||
    /could not find the .* column/i.test(text) ||
    /schema cache/i.test(text);

  if (!looksLikeMissingColumn) return false;
  if (!column) return true;

  return text.includes(column);
}

/**
 * True when PostgREST rejected the request because the RPC/function does not
 * exist (migration not applied yet, or an old signature is still deployed).
 */
export function isMissingFunctionError(error: unknown, functionName?: string): boolean {
  if (!error) return false;

  const e = error as PostgrestLikeError;
  const text = [e.code, e.message, e.details, e.hint]
    .filter((part): part is string => typeof part === 'string')
    .join(' ');

  // PGRST202 = function not found in schema cache, 42883 = undefined_function
  const looksLikeMissingFunction =
    e.code === 'PGRST202' ||
    e.code === '42883' ||
    /could not find the (public\.)?function/i.test(text) ||
    /function .* does not exist/i.test(text) ||
    /no function matches the given name/i.test(text);

  if (!looksLikeMissingFunction) return false;
  if (!functionName) return true;

  return text.includes(functionName);
}

/**
 * True when PostgREST rejected the request because a table/view is missing
 * (migration not applied yet). Used so a feature can be switched off instead of
 * failing an unrelated user action.
 */
export function isMissingRelationError(error: unknown, relation?: string): boolean {
  if (!error) return false;

  const e = error as PostgrestLikeError;
  const text = [e.code, e.message, e.details, e.hint]
    .filter((part): part is string => typeof part === 'string')
    .join(' ');

  // 42P01 = undefined_table, PGRST205 = table not found in schema cache
  const looksLikeMissingRelation =
    e.code === '42P01' ||
    e.code === 'PGRST205' ||
    /relation .* does not exist/i.test(text) ||
    /could not find the table/i.test(text) ||
    /schema cache/i.test(text);

  if (!looksLikeMissingRelation) return false;
  if (!relation) return true;

  return text.includes(relation);
}
