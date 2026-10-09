export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      blueprint_jobs: {
        Row: {
          decor_key: string
          owner_id: string
          ready_at: string
          started_at: string
          tool_id: string
        }
        Insert: {
          decor_key: string
          owner_id: string
          ready_at?: string
          started_at?: string
          tool_id: string
        }
        Update: {
          decor_key?: string
          owner_id?: string
          ready_at?: string
          started_at?: string
          tool_id?: string
        }
        Relationships: []
      }
      daily_quota: {
        Row: {
          completed: boolean
          day: string
          progress: number
          target: number
        }
        Insert: {
          completed?: boolean
          day: string
          progress?: number
          target: number
        }
        Update: {
          completed?: boolean
          day?: string
          progress?: number
          target?: number
        }
        Relationships: []
      }
      hourly_scrap_claims: {
        Row: {
          claimed_at: string
          hour: number
          ordinal: number
          player_id: string
        }
        Insert: {
          claimed_at?: string
          hour: number
          ordinal: number
          player_id: string
        }
        Update: {
          claimed_at?: string
          hour?: number
          ordinal?: number
          player_id?: string
        }
        Relationships: []
      }
      players: {
        Row: {
          avatar_url: string | null
          id: string
          level: number
          name: string
          room: Json
          save: Json
          total_quota: number
          trophies: number
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          id: string
          level?: number
          name?: string
          room?: Json
          save?: Json
          total_quota?: number
          trophies?: number
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          id?: string
          level?: number
          name?: string
          room?: Json
          save?: Json
          total_quota?: number
          trophies?: number
          updated_at?: string
        }
        Relationships: []
      }
      room_containers: {
        Row: {
          id: string
          items: Json
          owner_id: string
          updated_at: string
        }
        Insert: {
          id: string
          items?: Json
          owner_id: string
          updated_at?: string
        }
        Update: {
          id?: string
          items?: Json
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      blueprint_action: {
        Args: { action: string; decor: string; tool?: string }
        Returns: Json
      }
      claim_hourly_scrap: {
        Args: { requested_hour: number; requested_ordinal: number }
        Returns: boolean
      }
      deposit_scrap: {
        Args: { amount: number }
        Returns: {
          completed: boolean
          day: string
          progress: number
          target: number
        }
        SetofOptions: {
          from: "*"
          to: "daily_quota"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_today_quota: {
        Args: never
        Returns: {
          completed: boolean
          day: string
          progress: number
          target: number
        }
        SetofOptions: {
          from: "*"
          to: "daily_quota"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
