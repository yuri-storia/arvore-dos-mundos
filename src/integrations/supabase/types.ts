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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_usage: {
        Row: {
          created_at: string
          id: string
          image_count: number
          month: string
          text_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_count?: number
          month: string
          text_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_count?: number
          month?: string
          text_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      allowed_emails: {
        Row: {
          added_by: string | null
          created_at: string
          email: string
          id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      asaas_customers: {
        Row: {
          asaas_customer_id: string
          created_at: string
          environment: string
          updated_at: string
          user_id: string
        }
        Insert: {
          asaas_customer_id: string
          created_at?: string
          environment?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          asaas_customer_id?: string
          created_at?: string
          environment?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      asaas_payments: {
        Row: {
          amount: number
          asaas_customer_id: string
          asaas_payment_id: string
          asaas_subscription_id: string | null
          billing_type: string | null
          created_at: string
          drops: number | null
          due_date: string | null
          id: string
          invoice_url: string | null
          kind: string
          paid_at: string | null
          plan_code: string
          raw: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          asaas_customer_id: string
          asaas_payment_id: string
          asaas_subscription_id?: string | null
          billing_type?: string | null
          created_at?: string
          drops?: number | null
          due_date?: string | null
          id?: string
          invoice_url?: string | null
          kind: string
          paid_at?: string | null
          plan_code: string
          raw?: Json | null
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          asaas_customer_id?: string
          asaas_payment_id?: string
          asaas_subscription_id?: string | null
          billing_type?: string | null
          created_at?: string
          drops?: number | null
          due_date?: string | null
          id?: string
          invoice_url?: string | null
          kind?: string
          paid_at?: string | null
          plan_code?: string
          raw?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      beta_codes: {
        Row: {
          active: boolean
          code: string
          created_at: string
          expires_at: string | null
          id: string
          label: string | null
          max_uses: number
          uses_count: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          label?: string | null
          max_uses?: number
          uses_count?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          label?: string | null
          max_uses?: number
          uses_count?: number
        }
        Relationships: []
      }
      beta_redemptions: {
        Row: {
          code: string
          id: string
          idriel_charges_used: number
          idriel_discount_until: string
          raiz_granted_until: string
          redeemed_at: string
          user_id: string
        }
        Insert: {
          code: string
          id?: string
          idriel_charges_used?: number
          idriel_discount_until: string
          raiz_granted_until: string
          redeemed_at?: string
          user_id: string
        }
        Update: {
          code?: string
          id?: string
          idriel_charges_used?: number
          idriel_discount_until?: string
          raiz_granted_until?: string
          redeemed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "beta_redemptions_code_fkey"
            columns: ["code"]
            isOneToOne: false
            referencedRelation: "beta_codes"
            referencedColumns: ["code"]
          },
        ]
      }
      bug_reports: {
        Row: {
          attachment_path: string | null
          attachment_type: string | null
          context: string | null
          created_at: string
          id: string
          message: string
          route: string | null
          status: string
          updated_at: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          attachment_path?: string | null
          attachment_type?: string | null
          context?: string | null
          created_at?: string
          id?: string
          message: string
          route?: string | null
          status?: string
          updated_at?: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          attachment_path?: string | null
          attachment_type?: string | null
          context?: string | null
          created_at?: string
          id?: string
          message?: string
          route?: string | null
          status?: string
          updated_at?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      chapters: {
        Row: {
          content: string | null
          created_at: string
          id: string
          manuscript_id: string
          notes: string | null
          sort_order: number
          title: string
          updated_at: string
          user_id: string
          word_count: number | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          manuscript_id: string
          notes?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
          user_id: string
          word_count?: number | null
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          manuscript_id?: string
          notes?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
          user_id?: string
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chapters_manuscript_id_fkey"
            columns: ["manuscript_id"]
            isOneToOne: false
            referencedRelation: "manuscripts"
            referencedColumns: ["id"]
          },
        ]
      }
      codex_entries: {
        Row: {
          content: string | null
          created_at: string
          entry_type: string
          fruit_id: number | null
          id: string
          image_position: Json | null
          image_url: string | null
          title: string
          updated_at: string
          user_id: string
          world_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          entry_type?: string
          fruit_id?: number | null
          id?: string
          image_position?: Json | null
          image_url?: string | null
          title?: string
          updated_at?: string
          user_id: string
          world_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          entry_type?: string
          fruit_id?: number | null
          id?: string
          image_position?: Json | null
          image_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          world_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "codex_entries_world_id_fkey"
            columns: ["world_id"]
            isOneToOne: false
            referencedRelation: "worlds"
            referencedColumns: ["id"]
          },
        ]
      }
      free_writings: {
        Row: {
          chapter_id: string | null
          content: string | null
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
          word_count: number
          world_id: string
        }
        Insert: {
          chapter_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
          word_count?: number
          world_id: string
        }
        Update: {
          chapter_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
          word_count?: number
          world_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "free_writings_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      idriel_help_usage: {
        Row: {
          count: number
          created_at: string
          id: string
          usage_date: string
          user_id: string
        }
        Insert: {
          count?: number
          created_at?: string
          id?: string
          usage_date?: string
          user_id: string
        }
        Update: {
          count?: number
          created_at?: string
          id?: string
          usage_date?: string
          user_id?: string
        }
        Relationships: []
      }
      idriel_suggestions: {
        Row: {
          created_at: string
          fruit_id: number
          id: string
          question: string
          response: string
          user_id: string
          world_id: string
        }
        Insert: {
          created_at?: string
          fruit_id: number
          id?: string
          question: string
          response: string
          user_id: string
          world_id: string
        }
        Update: {
          created_at?: string
          fruit_id?: number
          id?: string
          question?: string
          response?: string
          user_id?: string
          world_id?: string
        }
        Relationships: []
      }
      idriel_visions: {
        Row: {
          created_at: string
          description: string
          extras: string | null
          id: string
          image_type: string | null
          image_url: string | null
          prompt: string
          style: string | null
          tone: string | null
          user_id: string
          world_id: string
        }
        Insert: {
          created_at?: string
          description?: string
          extras?: string | null
          id?: string
          image_type?: string | null
          image_url?: string | null
          prompt?: string
          style?: string | null
          tone?: string | null
          user_id: string
          world_id: string
        }
        Update: {
          created_at?: string
          description?: string
          extras?: string | null
          id?: string
          image_type?: string | null
          image_url?: string | null
          prompt?: string
          style?: string | null
          tone?: string | null
          user_id?: string
          world_id?: string
        }
        Relationships: []
      }
      manuscripts: {
        Row: {
          created_at: string
          id: string
          synopsis: string | null
          title: string
          updated_at: string
          user_id: string
          word_count_goal: number | null
          world_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          synopsis?: string | null
          title?: string
          updated_at?: string
          user_id: string
          word_count_goal?: number | null
          world_id: string
        }
        Update: {
          created_at?: string
          id?: string
          synopsis?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          word_count_goal?: number | null
          world_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manuscripts_world_id_fkey"
            columns: ["world_id"]
            isOneToOne: false
            referencedRelation: "worlds"
            referencedColumns: ["id"]
          },
        ]
      }
      mfa_audit_log: {
        Row: {
          created_at: string
          event_type: string
          id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mfa_backup_codes: {
        Row: {
          code_hash: string
          created_at: string
          id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code_hash: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code_hash?: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          cpf_cnpj: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cpf_cnpj?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cpf_cnpj?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scenes: {
        Row: {
          chapter_id: string
          content: string | null
          created_at: string
          id: string
          sort_order: number
          status: string
          storyline_column_id: string | null
          title: string
          updated_at: string
          user_id: string
          word_count: number
        }
        Insert: {
          chapter_id: string
          content?: string | null
          created_at?: string
          id?: string
          sort_order?: number
          status?: string
          storyline_column_id?: string | null
          title?: string
          updated_at?: string
          user_id: string
          word_count?: number
        }
        Update: {
          chapter_id?: string
          content?: string | null
          created_at?: string
          id?: string
          sort_order?: number
          status?: string
          storyline_column_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "scenes_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      storyline_cards: {
        Row: {
          color: string | null
          content: string
          created_at: string
          id: string
          sort_order: number
          storyline_column_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          content?: string
          created_at?: string
          id?: string
          sort_order?: number
          storyline_column_id: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          content?: string
          created_at?: string
          id?: string
          sort_order?: number
          storyline_column_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storyline_cards_storyline_column_id_fkey"
            columns: ["storyline_column_id"]
            isOneToOne: false
            referencedRelation: "storyline_columns"
            referencedColumns: ["id"]
          },
        ]
      }
      storyline_columns: {
        Row: {
          color: string | null
          created_at: string
          id: string
          sort_order: number
          storyline_id: string
          title: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          sort_order?: number
          storyline_id: string
          title?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          sort_order?: number
          storyline_id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storyline_columns_storyline_id_fkey"
            columns: ["storyline_id"]
            isOneToOne: false
            referencedRelation: "storylines"
            referencedColumns: ["id"]
          },
        ]
      }
      storylines: {
        Row: {
          created_at: string
          id: string
          manuscript_id: string | null
          name: string
          updated_at: string
          user_id: string
          world_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          manuscript_id?: string | null
          name?: string
          updated_at?: string
          user_id: string
          world_id: string
        }
        Update: {
          created_at?: string
          id?: string
          manuscript_id?: string | null
          name?: string
          updated_at?: string
          user_id?: string
          world_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          asaas_customer_id: string | null
          asaas_subscription_id: string | null
          billing_cycle: string | null
          cancelled_at: string | null
          created_at: string
          eduzz_subscription_id: string | null
          eduzz_transaction_id: string | null
          environment: string
          expires_at: string | null
          has_idriel: boolean
          id: string
          plan: Database["public"]["Enums"]["plan_type"]
          plan_code: string | null
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          billing_cycle?: string | null
          cancelled_at?: string | null
          created_at?: string
          eduzz_subscription_id?: string | null
          eduzz_transaction_id?: string | null
          environment?: string
          expires_at?: string | null
          has_idriel?: boolean
          id?: string
          plan?: Database["public"]["Enums"]["plan_type"]
          plan_code?: string | null
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          billing_cycle?: string | null
          cancelled_at?: string | null
          created_at?: string
          eduzz_subscription_id?: string | null
          eduzz_transaction_id?: string | null
          environment?: string
          expires_at?: string | null
          has_idriel?: boolean
          id?: string
          plan?: Database["public"]["Enums"]["plan_type"]
          plan_code?: string | null
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_credit_balance: {
        Row: {
          bonus_drops: number
          updated_at: string
          user_id: string
        }
        Insert: {
          bonus_drops?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          bonus_drops?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      world_analyses: {
        Row: {
          analysis_text: string
          artigo_count: number
          covered_fruits: number
          created_at: string
          entry_count: number
          ficha_count: number
          id: string
          user_id: string
          world_id: string | null
        }
        Insert: {
          analysis_text: string
          artigo_count?: number
          covered_fruits?: number
          created_at?: string
          entry_count?: number
          ficha_count?: number
          id?: string
          user_id: string
          world_id?: string | null
        }
        Update: {
          analysis_text?: string
          artigo_count?: number
          covered_fruits?: number
          created_at?: string
          entry_count?: number
          ficha_count?: number
          id?: string
          user_id?: string
          world_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "world_analyses_world_id_fkey"
            columns: ["world_id"]
            isOneToOne: false
            referencedRelation: "worlds"
            referencedColumns: ["id"]
          },
        ]
      }
      worlds: {
        Row: {
          created_at: string
          db: Json
          gallery: Json
          id: string
          method: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          db?: Json
          gallery?: Json
          id?: string
          method?: string
          name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          db?: Json
          gallery?: Json
          id?: string
          method?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_bonus_drops: {
        Args: { _drops: number; _user_id: string }
        Returns: undefined
      }
      admin_remove_mfa_factors: {
        Args: { _user_id: string }
        Returns: undefined
      }
      admin_user_aggregates: {
        Args: never
        Returns: {
          ai_image_month: number
          ai_image_total: number
          ai_text_month: number
          ai_text_total: number
          billing_cycle: string
          bonus_drops: number
          expires_at: string
          has_idriel: boolean
          is_admin: boolean
          last_payment_at: string
          lifetime_total: number
          plan_code: string
          recharge_total: number
          recharges_count: number
          started_at: string
          sub_status: string
          user_id: string
        }[]
      }
      check_ai_quota: {
        Args: { _type: string; _user_id: string }
        Returns: Json
      }
      get_plan_limits: {
        Args: { _plan: Database["public"]["Enums"]["plan_type"] }
        Returns: {
          image_limit: number
          text_limit: number
        }[]
      }
      increment_ai_usage: {
        Args: { _type: string; _user_id: string }
        Returns: undefined
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_email_allowed: { Args: { _email: string }; Returns: boolean }
    }
    Enums: {
      plan_type: "basico" | "pro"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      plan_type: ["basico", "pro"],
    },
  },
} as const
