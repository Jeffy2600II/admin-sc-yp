import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

/**
 * YP ADMIN · SCHEMA DETECTION (v1.7)
 *
 * The shared Supabase database may or may not have certain columns. The user
 * explicitly said they will NOT modify the database, so we must detect which
 * columns exist at runtime and only INSERT/UPDATE columns that actually exist.
 *
 * v1.7 IMPROVEMENTS (vs v1.6):
 * - Previous version queried `information_schema.columns` via PostgREST, but
 *   Supabase may not expose that view to service-role clients. When the query
 *   failed, the fallback cache (which incorrectly included `color` on
 *   council_users) was used, causing "Could not find the 'color' column" errors.
 * - v1.7 uses a more reliable detection: SELECT * FROM table LIMIT 0, then
 *   inspect the returned columns. If that also fails, the fallback cache
 *   now matches schema_sc.md exactly (NO color on council_users).
 * - The fallback cache is the source of truth from schema_sc.md.
 */

type Client = SupabaseClient<Database>;

const _cache: Record<string, Set<string>> = {};
let _detectionPromise: Promise<void> | null = null;

/**
 * The canonical schema from schema_sc.md. Used as the fallback cache when
 * runtime detection fails. This is the SINGLE SOURCE OF TRUTH for which
 * columns exist on each table.
 *
 * If you need to add/remove a column here, first verify it against
 * schema_sc.md (or the live database).
 */
const SCHEMA_SC_MD: Record<string, string[]> = {
  council_users: [
    "id", "auth_uid", "full_name", "student_id", "email", "year",
    "role", "account_type", "approved", "disabled", "department_id",
    "avatar_url", "national_id", "created_at",
    // NOTE: NO `color` column — confirmed by schema_sc.md
  ],
  council_years: ["year", "closed", "created_at"],
  council_join_requests: [
    "id", "full_name", "student_id", "year", "email", "password",
    "message", "account_type", "national_id", "department_id", "created_at",
    // NOTE: NO `color` column — confirmed by schema_sc.md
  ],
  departments: [
    "id", "name", "color", "icon", "description", "created_at", "updated_at",
    // `color` IS here — confirmed by schema_sc.md
  ],
};

/**
 * Detect which columns exist on council_users and council_join_requests.
 * Caches the result so subsequent calls are instant.
 *
 * v1.7 strategy:
 * 1. Try SELECT * FROM <table> LIMIT 0 — PostgREST returns the column list
 *    in the response even when there are no rows.
 * 2. If that fails (RLS or other), fall back to the schema_sc.md cache.
 */
export async function detectSchemaColumns(
  adminClient: Client
): Promise<void> {
  if (_detectionPromise) return _detectionPromise;

  _detectionPromise = (async () => {
    if (Object.keys(_cache).length > 0) return;

    // Try to detect columns at runtime via SELECT * LIMIT 0
    const tables = Object.keys(SCHEMA_SC_MD);
    const detected: Record<string, Set<string>> = {};

    for (const table of tables) {
      try {
        const { data, error } = await adminClient
          .from(table as any)
          .select("*")
          .limit(1); // limit 1 instead of 0 — some PostgREST versions return no columns with limit 0

        if (!error && data) {
          // If we got at least one row, inspect its keys
          if (Array.isArray(data) && data.length > 0) {
            detected[table] = new Set(Object.keys(data[0]));
          } else {
            // No rows — can't determine columns from data, use fallback
            detected[table] = new Set(SCHEMA_SC_MD[table]);
          }
        } else {
          // Query failed — use fallback
          console.warn(
            `[schema-detection] query failed for ${table}, using schema_sc.md fallback:`,
            error?.message
          );
          detected[table] = new Set(SCHEMA_SC_MD[table]);
        }
      } catch (err) {
        console.warn(
          `[schema-detection] exception for ${table}, using schema_sc.md fallback:`,
          err
        );
        detected[table] = new Set(SCHEMA_SC_MD[table]);
      }
    }

    // Merge into cache
    for (const [table, cols] of Object.entries(detected)) {
      _cache[table] = cols;
    }
  })();

  return _detectionPromise;
}

/**
 * Check if a column exists on a table (must call detectSchemaColumns first).
 */
export function hasColumn(table: string, column: string): boolean {
  const cols = _cache[table];
  if (!cols) {
    // If we never detected, use the schema_sc.md fallback
    const fallback = SCHEMA_SC_MD[table];
    return fallback ? fallback.includes(column) : true;
  }
  return cols.has(column);
}

/**
 * Filter a payload object to only include keys that exist as columns
 * on the given table. This prevents "Could not find the 'X' column" errors
 * when INSERTing or UPDATEing.
 *
 * Must call detectSchemaColumns() first for accurate filtering.
 * If detection hasn't run, uses the schema_sc.md fallback.
 */
export function filterPayload<T extends Record<string, unknown>>(
  table: string,
  payload: T
): Partial<T> {
  let cols = _cache[table];
  if (!cols) {
    // Detection hasn't run — use schema_sc.md fallback
    const fallback = SCHEMA_SC_MD[table];
    cols = fallback ? new Set(fallback) : null;
  }

  if (!cols) {
    // Unknown table — return payload unchanged (permissive)
    return payload;
  }

  const filtered: Partial<T> = {};
  for (const key of Object.keys(payload) as Array<keyof T>) {
    if (cols.has(key as string)) {
      filtered[key] = payload[key];
    } else {
      console.debug(
        `[schema-detect] filterPayload: dropping column '${String(key)}' from '${table}' (not in schema)`
      );
    }
  }
  return filtered;
}

/**
 * Reset the schema cache (for testing).
 */
export function _resetSchemaCache(): void {
  for (const key of Object.keys(_cache)) {
    delete _cache[key];
  }
  _detectionPromise = null;
}
