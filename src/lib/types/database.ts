/**
 * Database types for YP Admin v1.6 — matches the REAL shared Supabase schema
 * as documented in schema_sc.md (verified against the live database).
 *
 * v1.6 changes (vs v1.5):
 * - `council_users.avatar_url` is now a real column (was missing before)
 * - `council_users.national_id` is confirmed present (not optional)
 * - `council_users.student_id` is UNIQUE
 * - `council_join_requests.password` and `message` are real columns
 * - `council_join_requests.student_id` is UNIQUE
 * - `council_years.created_at` is a real column
 * - All ypwork extension columns are confirmed present (department_id, color, national_id)
 *
 * RLS policies (from schema_sc.md):
 * - council_users: insert_admin, update_self_or_admin, delete_admin, select_own/authenticated
 * - council_join_requests: insert anyone, select authenticated/own, delete admin
 * - council_years: select anyone, modify admin (authenticated)
 * - departments: select anyone, modify admin
 *
 * Source: schema_sc.md (provided by user, verified against live Supabase)
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
          avatar_url: string | null; // v1.6: confirmed real column
          national_id: string; // v1.6: confirmed present
          created_at: string;
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
          created_at: string; // v1.6: confirmed real column
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
          password: string; // v1.6: confirmed real column (plaintext — used for auth account creation)
          message: string; // v1.6: confirmed real column (note from applicant)
          account_type: "student" | "teacher" | "other";
          national_id: string; // v1.6: confirmed present
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
 * v1.6: `avatarUrl` is now a real field (was missing before). `color` falls
 * back to a default brand color if not set (ypwork may not have set it for
 * legacy users).
 */
export interface SessionUser {
  id: string;
  authUid: string;
  name: string;
  role: "admin" | "member";
  roleLabel: string;
  departmentId: string | null;
  color: string;
  nationalId: string;
  studentCode: string;
  email: string;
  accountType: "student" | "teacher" | "other";
  year: number;
  avatarUrl: string | null; // v1.6: real column now
}
