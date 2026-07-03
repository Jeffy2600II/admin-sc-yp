/**
 * Database types for YP Admin — matches the shared Supabase schema
 * used by both yplabs and ypwork.
 *
 * Tables:
 * - council_users (extended by ypwork: department_id, color, national_id)
 * - council_years
 * - council_join_requests (extended by ypwork: department_id, national_id)
 * - departments (ypwork-owned)
 *
 * See supabase/migrations/ypadmin_schema.sql for the canonical schema.
 */
export type Database = {
  public: {
    Tables: {
      council_users: {
        Row: {
          id: string;
          auth_uid: string | null;
          full_name: string;
          student_id: string;
          email: string;
          year: number;
          role: "admin" | "member";
          approved: boolean;
          disabled: boolean;
          account_type: "student" | "teacher" | "other";
          // ypwork extension columns
          department_id: string | null;
          color: string;
          national_id: string;
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
          color?: string;
          national_id?: string;
          created_at?: string;
        };
        Update: Partial<council_users["Insert"]>;
      };
      council_years: {
        Row: {
          year: number;
          closed: boolean;
          created_at?: string;
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
          student_id: string;
          year: number;
          email: string;
          account_type: "student" | "teacher" | "other";
          // ypwork extension columns
          department_id: string | null;
          national_id: string;
          message: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          full_name: string;
          student_id?: string;
          year: number;
          email?: string;
          account_type?: "student" | "teacher" | "other";
          department_id?: string | null;
          national_id?: string;
          message?: string;
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
          head_user_auth_uid: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          color?: string;
          icon?: string;
          description?: string;
          head_user_auth_uid?: string | null;
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

/** Session user — slimmed-down version of CouncilUser, stored in context. */
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
}
