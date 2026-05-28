import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * App data lives in a dedicated `api` schema, not `public`, so PostgREST cannot reach PostGIS
 * objects (`spatial_ref_sys`, `st_estimatedextent`, etc.) that are owned by `supabase_admin`.
 * See supabase/migrations/20260528150000_create_api_schema.sql.
 */
export const APP_DATA_SCHEMA = "api" as const;

/** Narrow schema typing for RPCs used by the app (expand when generating full types). */
export type AppDatabase = {
  api: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: {
      tenements_in_bbox: {
        Args: {
          min_lng: number;
          min_lat: number;
          max_lng: number;
          max_lat: number;
          max_rows?: number;
        };
        Returns: Record<string, unknown>[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

let supabaseClient: SupabaseClient<AppDatabase, "api"> | null = null;

export function getSupabaseClient(): SupabaseClient<AppDatabase, "api"> {
  if (supabaseClient) return supabaseClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  supabaseClient = createClient<AppDatabase, "api">(supabaseUrl, supabaseAnonKey, {
    db: { schema: APP_DATA_SCHEMA },
  });
  return supabaseClient;
}
