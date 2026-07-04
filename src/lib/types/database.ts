/**
 * Database types for YP Admin v1.7 — matches the REAL shared Supabase schema
 * as documented in schema_sc.md (verified against the live database).
 *
 * v1.7 CRITICAL FIX (vs v1.6):
 * - `council_users` does NOT have a `color` column (schema_sc.md confirms this).
 *   The previous version assumed ypwork added it, but the live database doesn't
 *   have it. Every INSERT that included `color` failed with
 *   "Could not find the 'color' column of 'council_users' in the schema cache".
 *   Now `color` is completely removed from council_users.
 * - User avatar color is derived from their department's `color` column instead.
 *
 * v1.7 schema detection:
 * - The `detectSchemaColumns()` function now uses a more reliable method
 *   (SELECT * FROM table LIMIT 0) instead of `information_schema.columns`
 *   which Supabase may not expose via PostgREST.
 *
 * Verified columns from schema_sc.md:
 *
 * council_users (PK: id uuid, UNIQUE: auth_uid, student_id):
 *   id, auth_uid, full_name, student_id, email, year, role, account_type,
 *   approved, disabled, department_id, avatar_url, national_id, created_at
 *   (NO color column!)
 *
 * council_years (PK: year integer):
 *   year, closed, created_at
 *
 * council_join_requests (PK: id uuid, UNIQUE: student_id):
 *   id, full_name, student_id, year, email, password, message, account_type,
 *   national_id, department_id, created_at
 *
 * departments (PK: id text):
 *   id, name, color, icon, description, created_at, updated_at
 *   (color is here, NOT in council_users)
 */
export type Database = {
  public: {
    Tables: {
      council_users: {
        Row: {
          id: string;
          auth_uid: string | null;
          full_name: string;
          student_id: string; // UNIQUE
          email: string;
          year: number;
          role: "admin" | "member";
          approved: boolean;
          disabled: boolean;
          account_type: "student" | "teacher" | "other";
          department_id: string | null;
          avatar_url: string | null;
          national_id: string;
          created_at: string;
          // NOTE: NO `color` column — schema_sc.md confirms this
        };
        Insert: {
          id?: string;
          auth_uid?: string | null;
          full_name: string;
          student_id?: string;
          email?: string;
          year: number;
          role?: "admin" | "member";
          approved?: boolean;
          disabled?: boolean;
          account_type?: "student" | "teacher" | "other";
          department_id?: string | null;
          avatar_url?: string | null;
          national_id?: string;
          created_at?: string;
        };
        Update: Partial<council_users["Insert"]>;
      };
      council_years: {
        Row: {
          year: number;
          closed: boolean;
          created_at: string;
        };
        Insert: {
          year: number;
          closed?: boolean;
          created_at?: string;
        };
        Update: Partial<council_years["Insert"]>;
      };
      council_join_requests: {
        Row: {
          id: string;
          full_name: string;
          student_id: string; // UNIQUE
          year: number;
          email: string;
          password: string;
          message: string;
          account_type: "student" | "teacher" | "other";
          national_id: string;
          department_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          full_name: string;
          student_id?: string;
          year: number;
          email?: string;
          password?: string;
          message?: string;
          account_type?: "student" | "teacher" | "other";
          national_id?: string;
          department_id?: string | null;
          created_at?: string;
        };
        Update: Partial<council_join_requests["Insert"]>;
      };
      departments: {
        Row: {
          id: string;
          name: string;
          color: string;
          icon: string;
          description: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          color?: string;
          icon?: string;
          description?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<departments["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      account_type: "student" | "teacher" | "other";
      user_role: "admin" | "member";
    };
  };
};

export type CouncilUser = Database["public"]["Tables"]["council_users"]["Row"];
export type CouncilYear = Database["public"]["Tables"]["council_years"]["Row"];
export type CouncilJoinRequest =
  Database["public"]["Tables"]["council_join_requests"]["Row"];
export type Department = Database["public"]["Tables"]["departments"]["Row"];

/**
 * Session user — slimmed-down version of CouncilUser, stored in context.
 *
 * v1.7: `color` is NOT stored on the user — it's derived from the user's
 * department at render time. The SessionUser carries `departmentId` and
 * the AppShell/views look up the department's color when rendering avatars.
 */
export interface SessionUser {
  id: string;
  authUid: string;
  name: string;
  role: "admin" | "member";
  roleLabel: string;
  departmentId: string | null;
  nationalId: string;
  studentCode: string;
  email: string;
  accountType: "student" | "teacher" | "other";
  year: number;
  avatarUrl: string | null;
}
