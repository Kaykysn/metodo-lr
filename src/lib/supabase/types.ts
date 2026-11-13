export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          professional_registry: string | null;
          institution: string | null;
          role: "student" | "postgraduate" | "physiotherapist" | "admin";
          status: "pending" | "active" | "paused" | "expired" | "revoked";
          trial_started_at: string | null;
          trial_expires_at: string | null;
          paused_remaining_seconds: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          professional_registry?: string | null;
          institution?: string | null;
          role?: "student" | "postgraduate" | "physiotherapist" | "admin";
          status?: "pending" | "active" | "paused" | "expired" | "revoked";
          trial_started_at?: string | null;
          trial_expires_at?: string | null;
          paused_remaining_seconds?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          professional_registry?: string | null;
          institution?: string | null;
          role?: "student" | "postgraduate" | "physiotherapist" | "admin";
          status?: "pending" | "active" | "paused" | "expired" | "revoked";
          trial_started_at?: string | null;
          trial_expires_at?: string | null;
          paused_remaining_seconds?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      assessments: {
        Row: {
          id: string;
          user_id: string;
          patient_code: string;
          patient_initials: string | null;
          complaint: string;
          assessment_date: string;
          pain_region: string | null;
          current_stage: number;
          status: string;
          data: Json;
          created_at: string;
          updated_at: string;
        };
      };
      exercise_sets: {
        Row: {
          id: string;
          assessment_id: string;
          user_id: string;
          exercise_name: string;
          performed_date: string;
          set_number: number;
          reps: number;
          load_kg: number;
          is_completed: boolean;
          modality: string;
          notes: string | null;
          created_at: string;
        };
      };
    };
  };
}
