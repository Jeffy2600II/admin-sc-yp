import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

/**
 * YP ADMIN · SCHEMA DETECTION (v1.5)
 *
 * The shared Supabase database may or may not have the ypwork extension
 * columns (`color`, `national_id`, `department_id`) on `council_users`
 * and `council_join_requests`. The user explicitly said they will NOT
 * modify the database, so we must detect which columns exist at runtime
 * and only INSERT/UPDATE columns that actually exist.
 *
 * Strategy:
 * - On first call, query the information_schema to find which columns
 *   exist on each table
 * - Cache the result in memory (columns don't change during a session)
 * - Provide helpers to build safe INSERT/UPDATE payloads
 */

type Client = SupabaseClient<Database>;

interface ColumnInfo {
  table_name: string;
  column_name: string;
}

const _cache: Record<string, Set<string>> = {};
let _detectionPromise: Promise<void> | null = null;

/**
 * Detect which columns exist on council_users and council_join_requests.
 * Caches the result so subsequent calls are instant.
 *
 * Uses the service-role admin client (RLS blocks information_schema access
 * for anon/authenticated).
 */
export async function detectSchemaColumns(
  adminClient: Client
): Promise<void> {
  if (_detectionPromise) return _detectionPromise;

  _detectionPromise = (async () => {
    if (Object.keys(_cache).length > 0) return;

    // Query information_schema.columns — this is a system view that's
    // readable by any role, but we use adminClient to be safe.
    const { data, error } = await adminClient
      .from("information_schema.columns")
      .select("table_name, column_name")
      .in("table_name", [
        "council_users",
        "council_join_requests",
        "departments",
        "council_years",
      ])
      .eq("table_schema", "public");

    if (error || !data) {
      // If detection fails, assume ALL columns exist (most permissive)
      // — INSERT will then fail with a clear error if a column is missing
      console.warn("[schema-detection] failed, assuming all columns exist:", error);
      _cache.council_users = new Set([
        "id", "auth_uid", "full_name", "student_id", "email", "year",
        "role", "approved", "disabled", "account_type", "created_at",
        "department_id", "color", "national_id",
        // v1.6: confirmed real columns from schema_sc.md
        "avatar_url",
      ]);
      _cache.council_join_requests = new Set([
        "id", "full_name", "student_id", "year", "email", "account_type",
        "created_at", "department_id", "national_id",
        // v1.6: confirmed real columns from schema_sc.md
        "password", "message",
      ]);
      _cache.departments = new Set([
        "id", "name", "color", "icon", "description", "created_at", "updated_at",
      ]);
      _cache.council_years = new Set(["year", "closed", "created_at"]);
      return;
    }

    for (const row of data as ColumnInfo[]) {
      if (!_cache[row.table_name]) {
        _cache[row.table_name] = new Set();
      }
      _cache[row.table_name].add(row.column_name);
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
    // If we never detected, assume the column exists (most permissive)
    return true;
  }
  return cols.has(column);
}

/**
 * Filter a payload object to only include keys that exist as columns
 * on the given table. This prevents "Could not find the 'X' column" errors
 * when INSERTing or UPDATEing.
 *
 * Must call detectSchemaColumns() first for accurate filtering.
 * If detection hasn't run, returns the payload unchanged (permissive).
 */
export function filterPayload<T extends Record<string, unknown>>(
  table: string,
  payload: T
): Partial<T> {
  const cols = _cache[table];
  if (!cols) return payload; // permissive — detection hasn't run

  const filtered: Partial<T> = {};
  for (const key of Object.keys(payload) as Array<keyof T>) {
    if (cols.has(key as string)) {
      filtered[key] = payload[key];
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
