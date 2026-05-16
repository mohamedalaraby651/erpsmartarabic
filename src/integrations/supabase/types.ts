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
      activity_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "activity_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_chains: {
        Row: {
          amount_threshold: number
          approver_roles: string[]
          created_at: string
          entity_type: string
          escalation_hours: number | null
          id: string
          is_active: boolean
          required_approvers: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount_threshold?: number
          approver_roles: string[]
          created_at?: string
          entity_type: string
          escalation_hours?: number | null
          id?: string
          is_active?: boolean
          required_approvers?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount_threshold?: number
          approver_roles?: string[]
          created_at?: string
          entity_type?: string
          escalation_hours?: number | null
          id?: string
          is_active?: boolean
          required_approvers?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_chains_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "approval_chains_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_records: {
        Row: {
          approved_by: string[] | null
          chain_id: string | null
          created_at: string
          current_level: number
          entity_id: string
          entity_type: string
          escalated_at: string | null
          id: string
          rejection_reason: string | null
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          approved_by?: string[] | null
          chain_id?: string | null
          created_at?: string
          current_level?: number
          entity_id: string
          entity_type: string
          escalated_at?: string | null
          id?: string
          rejection_reason?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          approved_by?: string[] | null
          chain_id?: string | null
          created_at?: string
          current_level?: number
          entity_id?: string
          entity_type?: string
          escalated_at?: string | null
          id?: string
          rejection_reason?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_records_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "approval_chains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "approval_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      attachments: {
        Row: {
          category: string | null
          created_at: string
          entity_id: string
          entity_type: string
          expiry_date: string | null
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          mime_type: string | null
          notes: string | null
          tenant_id: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          expiry_date?: string | null
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id?: string
          mime_type?: string | null
          notes?: string | null
          tenant_id?: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          expiry_date?: string | null
          file_name?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          mime_type?: string | null
          notes?: string | null
          tenant_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          attendance_type: string
          check_in: string
          check_out: string | null
          created_at: string
          created_by: string | null
          employee_id: string
          id: string
          notes: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          attendance_type?: string
          check_in?: string
          check_out?: string | null
          created_at?: string
          created_by?: string | null
          employee_id: string
          id?: string
          notes?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          attendance_type?: string
          check_in?: string
          check_out?: string | null
          created_at?: string
          created_by?: string | null
          employee_id?: string
          id?: string
          notes?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "attendance_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_trail: {
        Row: {
          after_value: Json | null
          before_value: Json | null
          changed_fields: string[] | null
          created_at: string
          id: string
          ip_address: string | null
          operation: string
          record_id: string
          table_name: string
          tenant_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          after_value?: Json | null
          before_value?: Json | null
          changed_fields?: string[] | null
          created_at?: string
          id?: string
          ip_address?: string | null
          operation: string
          record_id: string
          table_name: string
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          after_value?: Json | null
          before_value?: Json | null
          changed_fields?: string[] | null
          created_at?: string
          id?: string
          ip_address?: string | null
          operation?: string
          record_id?: string
          table_name?: string
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_trail_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "audit_trail_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_name: string
          account_number: string | null
          bank_name: string
          created_at: string | null
          current_balance: number | null
          iban: string | null
          id: string
          is_active: boolean | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          account_name: string
          account_number?: string | null
          bank_name: string
          created_at?: string | null
          current_balance?: number | null
          iban?: string | null
          id?: string
          is_active?: boolean | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          account_name?: string
          account_number?: string | null
          bank_name?: string
          created_at?: string | null
          current_balance?: number | null
          iban?: string | null
          id?: string
          is_active?: boolean | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "bank_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_registers: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          current_balance: number | null
          id: string
          is_active: boolean | null
          location: string | null
          name: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          current_balance?: number | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          name: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          current_balance?: number | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          name?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_registers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "cash_registers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          reference_id: string | null
          reference_type: string | null
          register_id: string
          tenant_id: string
          transaction_number: string
          transaction_type: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          register_id: string
          tenant_id?: string
          transaction_number: string
          transaction_type: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          register_id?: string
          tenant_id?: string
          transaction_number?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_transactions_register_id_fkey"
            columns: ["register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "cash_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chart_of_accounts: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          code: string
          created_at: string | null
          current_balance: number | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          name_en: string | null
          normal_balance: Database["public"]["Enums"]["balance_type"]
          parent_id: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          account_type: Database["public"]["Enums"]["account_type"]
          code: string
          created_at?: string | null
          current_balance?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_en?: string | null
          normal_balance: Database["public"]["Enums"]["balance_type"]
          parent_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          code?: string
          created_at?: string | null
          current_balance?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_en?: string | null
          normal_balance?: Database["public"]["Enums"]["balance_type"]
          parent_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chart_of_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chart_of_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "chart_of_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          address: string | null
          company_name: string
          created_at: string
          currency: string
          email: string | null
          id: string
          logo_url: string | null
          pdf_font: string | null
          phone: string | null
          phone2: string | null
          primary_color: string | null
          secondary_color: string | null
          tax_number: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_name?: string
          created_at?: string
          currency?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          pdf_font?: string | null
          phone?: string | null
          phone2?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          tax_number?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_name?: string
          created_at?: string
          currency?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          pdf_font?: string | null
          phone?: string | null
          phone2?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          tax_number?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "company_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_note_items: {
        Row: {
          created_at: string
          credit_note_id: string
          id: string
          invoice_item_id: string | null
          product_id: string
          quantity: number
          tenant_id: string
          total_price: number
          unit_price: number
          unit_price_original: number | null
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          credit_note_id: string
          id?: string
          invoice_item_id?: string | null
          product_id: string
          quantity?: number
          tenant_id?: string
          total_price?: number
          unit_price?: number
          unit_price_original?: number | null
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          credit_note_id?: string
          id?: string
          invoice_item_id?: string | null
          product_id?: string
          quantity?: number
          tenant_id?: string
          total_price?: number
          unit_price?: number
          unit_price_original?: number | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_note_items_credit_note_id_fkey"
            columns: ["credit_note_id"]
            isOneToOne: false
            referencedRelation: "credit_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_note_items_invoice_item_id_fkey"
            columns: ["invoice_item_id"]
            isOneToOne: false
            referencedRelation: "invoice_item_returns_summary"
            referencedColumns: ["invoice_item_id"]
          },
          {
            foreignKeyName: "credit_note_items_invoice_item_id_fkey"
            columns: ["invoice_item_id"]
            isOneToOne: false
            referencedRelation: "invoice_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_note_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_note_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "credit_note_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_note_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_notes: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          credit_note_number: string
          customer_id: string
          id: string
          invoice_id: string
          reason: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          credit_note_number: string
          customer_id: string
          id?: string
          invoice_id: string
          reason?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          credit_note_number?: string
          customer_id?: string
          id?: string
          invoice_id?: string
          reason?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "credit_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_roles: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          name: string
          tenant_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name: string
          tenant_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "custom_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_addresses: {
        Row: {
          address: string
          city: string | null
          created_at: string
          customer_id: string
          governorate: string | null
          id: string
          is_default: boolean | null
          label: string
          notes: string | null
          tenant_id: string
        }
        Insert: {
          address: string
          city?: string | null
          created_at?: string
          customer_id: string
          governorate?: string | null
          id?: string
          is_default?: boolean | null
          label?: string
          notes?: string | null
          tenant_id?: string
        }
        Update: {
          address?: string
          city?: string | null
          created_at?: string
          customer_id?: string
          governorate?: string | null
          id?: string
          is_default?: boolean | null
          label?: string
          notes?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_addresses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "customer_addresses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_categories: {
        Row: {
          created_at: string
          description: string | null
          discount_percentage: number | null
          id: string
          name: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount_percentage?: number | null
          id?: string
          name: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          discount_percentage?: number | null
          id?: string
          name?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "customer_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_communications: {
        Row: {
          communication_date: string
          created_at: string
          created_by: string
          customer_id: string
          id: string
          note: string
          subject: string | null
          tenant_id: string
          type: string
        }
        Insert: {
          communication_date?: string
          created_at?: string
          created_by: string
          customer_id: string
          id?: string
          note: string
          subject?: string | null
          tenant_id?: string
          type?: string
        }
        Update: {
          communication_date?: string
          created_at?: string
          created_by?: string
          customer_id?: string
          id?: string
          note?: string
          subject?: string | null
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_communications_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_communications_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_communications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "customer_communications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_notes: {
        Row: {
          content: string
          created_at: string
          customer_id: string
          id: string
          is_pinned: boolean
          tenant_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          customer_id: string
          id?: string
          is_pinned?: boolean
          tenant_id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          customer_id?: string
          id?: string
          is_pinned?: boolean
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "customer_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_reminders: {
        Row: {
          created_at: string
          created_by: string
          customer_id: string
          id: string
          is_completed: boolean
          linked_invoice_id: string | null
          note: string
          recurrence: string | null
          reminder_date: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          customer_id: string
          id?: string
          is_completed?: boolean
          linked_invoice_id?: string | null
          note: string
          recurrence?: string | null
          reminder_date: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          customer_id?: string
          id?: string
          is_completed?: boolean
          linked_invoice_id?: string | null
          note?: string
          recurrence?: string | null
          reminder_date?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_reminders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_reminders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_reminders_linked_invoice_id_fkey"
            columns: ["linked_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_reminders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "customer_reminders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          category_id: string | null
          city: string | null
          contact_person: string | null
          contact_person_role: string | null
          created_at: string
          credit_limit: number | null
          current_balance: number | null
          customer_type: Database["public"]["Enums"]["customer_type"]
          discount_percentage: number | null
          email: string | null
          facebook_url: string | null
          governorate: string | null
          id: string
          image_url: string | null
          invoice_count_cached: number | null
          is_active: boolean | null
          last_activity_at: string | null
          last_communication_at: string | null
          last_transaction_date: string | null
          name: string
          notes: string | null
          payment_terms_days: number | null
          phone: string | null
          phone2: string | null
          preferred_payment_method: string | null
          price_list_id: string | null
          tax_number: string | null
          tenant_id: string
          total_purchases_cached: number | null
          updated_at: string
          vip_level: Database["public"]["Enums"]["vip_level"]
          website_url: string | null
        }
        Insert: {
          category_id?: string | null
          city?: string | null
          contact_person?: string | null
          contact_person_role?: string | null
          created_at?: string
          credit_limit?: number | null
          current_balance?: number | null
          customer_type?: Database["public"]["Enums"]["customer_type"]
          discount_percentage?: number | null
          email?: string | null
          facebook_url?: string | null
          governorate?: string | null
          id?: string
          image_url?: string | null
          invoice_count_cached?: number | null
          is_active?: boolean | null
          last_activity_at?: string | null
          last_communication_at?: string | null
          last_transaction_date?: string | null
          name: string
          notes?: string | null
          payment_terms_days?: number | null
          phone?: string | null
          phone2?: string | null
          preferred_payment_method?: string | null
          price_list_id?: string | null
          tax_number?: string | null
          tenant_id?: string
          total_purchases_cached?: number | null
          updated_at?: string
          vip_level?: Database["public"]["Enums"]["vip_level"]
          website_url?: string | null
        }
        Update: {
          category_id?: string | null
          city?: string | null
          contact_person?: string | null
          contact_person_role?: string | null
          created_at?: string
          credit_limit?: number | null
          current_balance?: number | null
          customer_type?: Database["public"]["Enums"]["customer_type"]
          discount_percentage?: number | null
          email?: string | null
          facebook_url?: string | null
          governorate?: string | null
          id?: string
          image_url?: string | null
          invoice_count_cached?: number | null
          is_active?: boolean | null
          last_activity_at?: string | null
          last_communication_at?: string | null
          last_transaction_date?: string | null
          name?: string
          notes?: string | null
          payment_terms_days?: number | null
          phone?: string | null
          phone2?: string | null
          preferred_payment_method?: string | null
          price_list_id?: string | null
          tax_number?: string | null
          tenant_id?: string
          total_purchases_cached?: number | null
          updated_at?: string
          vip_level?: Database["public"]["Enums"]["vip_level"]
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "customer_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_price_list_id_fkey"
            columns: ["price_list_id"]
            isOneToOne: false
            referencedRelation: "price_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_note_items: {
        Row: {
          created_at: string
          delivered_qty: number
          delivery_id: string
          id: string
          notes: string | null
          ordered_qty: number
          product_id: string
          tenant_id: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          delivered_qty: number
          delivery_id: string
          id?: string
          notes?: string | null
          ordered_qty?: number
          product_id: string
          tenant_id: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          delivered_qty?: number
          delivery_id?: string
          id?: string
          notes?: string | null
          ordered_qty?: number
          product_id?: string
          tenant_id?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_note_items_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "delivery_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_note_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_note_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_notes: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string
          delivery_date: string
          delivery_number: string
          id: string
          invoice_id: string | null
          notes: string | null
          posted_at: string | null
          posted_by: string | null
          sales_order_id: string | null
          status: Database["public"]["Enums"]["delivery_note_status"]
          tenant_id: string
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id: string
          delivery_date?: string
          delivery_number: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          posted_at?: string | null
          posted_by?: string | null
          sales_order_id?: string | null
          status?: Database["public"]["Enums"]["delivery_note_status"]
          tenant_id: string
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string
          delivery_date?: string
          delivery_number?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          posted_at?: string | null
          posted_by?: string | null
          sales_order_id?: string | null
          status?: Database["public"]["Enums"]["delivery_note_status"]
          tenant_id?: string
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_notes_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_notes_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_notes_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatcher_batch_runs: {
        Row: {
          auth_mode: string | null
          batch_size: number
          claimed_count: number
          correlation_id: string
          created_at: string
          failed: number
          finished_at: string
          id: string
          processed: number
          skipped: number
          started_at: string
          total_ms: number
        }
        Insert: {
          auth_mode?: string | null
          batch_size?: number
          claimed_count?: number
          correlation_id: string
          created_at?: string
          failed?: number
          finished_at?: string
          id?: string
          processed?: number
          skipped?: number
          started_at?: string
          total_ms?: number
        }
        Update: {
          auth_mode?: string | null
          batch_size?: number
          claimed_count?: number
          correlation_id?: string
          created_at?: string
          failed?: number
          finished_at?: string
          id?: string
          processed?: number
          skipped?: number
          started_at?: string
          total_ms?: number
        }
        Relationships: []
      }
      document_posting_log: {
        Row: {
          created_at: string
          created_by: string | null
          document_id: string
          document_number: string | null
          document_type: string
          id: string
          journal_id: string | null
          reason: string | null
          status: string
          tenant_id: string
          total_amount: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          document_id: string
          document_number?: string | null
          document_type: string
          id?: string
          journal_id?: string | null
          reason?: string | null
          status?: string
          tenant_id: string
          total_amount?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          document_id?: string
          document_number?: string | null
          document_type?: string
          id?: string
          journal_id?: string | null
          reason?: string | null
          status?: string
          tenant_id?: string
          total_amount?: number | null
        }
        Relationships: []
      }
      domain_events: {
        Row: {
          aggregate_id: string | null
          aggregate_type: string | null
          attempts: number
          created_at: string
          emitted_by: string | null
          event_type: string
          id: string
          last_error: string | null
          next_retry_at: string | null
          payload: Json
          processed_at: string | null
          status: string
          tenant_id: string | null
        }
        Insert: {
          aggregate_id?: string | null
          aggregate_type?: string | null
          attempts?: number
          created_at?: string
          emitted_by?: string | null
          event_type: string
          id?: string
          last_error?: string | null
          next_retry_at?: string | null
          payload?: Json
          processed_at?: string | null
          status?: string
          tenant_id?: string | null
        }
        Update: {
          aggregate_id?: string | null
          aggregate_type?: string | null
          attempts?: number
          created_at?: string
          emitted_by?: string | null
          event_type?: string
          id?: string
          last_error?: string | null
          next_retry_at?: string | null
          payload?: Json
          processed_at?: string | null
          status?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "domain_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "domain_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          address: string | null
          bank_account: string | null
          base_salary: number | null
          birth_date: string | null
          contract_type: string | null
          created_at: string | null
          created_by: string | null
          department: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          employee_number: string
          employment_status: string | null
          full_name: string
          gender: string | null
          hire_date: string | null
          id: string
          image_url: string | null
          job_title: string | null
          marital_status: string | null
          national_id: string | null
          notes: string | null
          phone: string | null
          phone2: string | null
          tenant_id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          bank_account?: string | null
          base_salary?: number | null
          birth_date?: string | null
          contract_type?: string | null
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_number: string
          employment_status?: string | null
          full_name: string
          gender?: string | null
          hire_date?: string | null
          id?: string
          image_url?: string | null
          job_title?: string | null
          marital_status?: string | null
          national_id?: string | null
          notes?: string | null
          phone?: string | null
          phone2?: string | null
          tenant_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          bank_account?: string | null
          base_salary?: number | null
          birth_date?: string | null
          contract_type?: string | null
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_number?: string
          employment_status?: string | null
          full_name?: string
          gender?: string | null
          hire_date?: string | null
          id?: string
          image_url?: string | null
          job_title?: string | null
          marital_status?: string | null
          national_id?: string | null
          notes?: string | null
          phone?: string | null
          phone2?: string | null
          tenant_id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "employees_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      event_metrics: {
        Row: {
          event_type: string
          failure_count: number
          hour_bucket: string
          id: string
          success_count: number
          total_latency_ms: number
        }
        Insert: {
          event_type: string
          failure_count?: number
          hour_bucket: string
          id?: string
          success_count?: number
          total_latency_ms?: number
        }
        Update: {
          event_type?: string
          failure_count?: number
          hour_bucket?: string
          id?: string
          success_count?: number
          total_latency_ms?: number
        }
        Relationships: []
      }
      expense_categories: {
        Row: {
          account_id: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_id: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "expense_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          approved_by: string | null
          category_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          expense_date: string
          expense_number: string
          id: string
          payment_method: string
          receipt_url: string | null
          register_id: string | null
          rejection_reason: string | null
          status: string | null
          supplier_id: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          approved_by?: string | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expense_date?: string
          expense_number: string
          id?: string
          payment_method: string
          receipt_url?: string | null
          register_id?: string | null
          rejection_reason?: string | null
          status?: string | null
          supplier_id?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          approved_by?: string | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expense_date?: string
          expense_number?: string
          id?: string
          payment_method?: string
          receipt_url?: string | null
          register_id?: string | null
          rejection_reason?: string | null
          status?: string | null
          supplier_id?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_register_id_fkey"
            columns: ["register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "expenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      export_templates: {
        Row: {
          columns: Json
          created_at: string
          created_by: string | null
          filters: Json | null
          format: string | null
          id: string
          include_company_info: boolean | null
          include_logo: boolean | null
          is_default: boolean | null
          name: string
          section: string
          tenant_id: string | null
        }
        Insert: {
          columns: Json
          created_at?: string
          created_by?: string | null
          filters?: Json | null
          format?: string | null
          id?: string
          include_company_info?: boolean | null
          include_logo?: boolean | null
          is_default?: boolean | null
          name: string
          section: string
          tenant_id?: string | null
        }
        Update: {
          columns?: Json
          created_at?: string
          created_by?: string | null
          filters?: Json | null
          format?: string | null
          id?: string
          include_company_info?: boolean | null
          include_logo?: boolean | null
          is_default?: boolean | null
          name?: string
          section?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "export_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "export_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_periods: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          created_at: string | null
          end_date: string
          id: string
          is_closed: boolean | null
          name: string
          start_date: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string | null
          end_date: string
          id?: string
          is_closed?: boolean | null
          name: string
          start_date: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string | null
          end_date?: string
          id?: string
          is_closed?: boolean | null
          name?: string
          start_date?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_periods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "fiscal_periods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      goods_receipt_items: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          ordered_qty: number
          product_id: string
          receipt_id: string
          received_qty: number
          tenant_id: string
          unit_cost: number
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          ordered_qty?: number
          product_id: string
          receipt_id: string
          received_qty: number
          tenant_id: string
          unit_cost?: number
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          ordered_qty?: number
          product_id?: string
          receipt_id?: string
          received_qty?: number
          tenant_id?: string
          unit_cost?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goods_receipt_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipt_items_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "goods_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipt_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      goods_receipts: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          posted_at: string | null
          posted_by: string | null
          purchase_order_id: string | null
          receipt_number: string
          received_date: string
          status: Database["public"]["Enums"]["goods_receipt_status"]
          supplier_id: string
          tenant_id: string
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          posted_at?: string | null
          posted_by?: string | null
          purchase_order_id?: string | null
          receipt_number: string
          received_date?: string
          status?: Database["public"]["Enums"]["goods_receipt_status"]
          supplier_id: string
          tenant_id: string
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          posted_at?: string | null
          posted_by?: string | null
          purchase_order_id?: string | null
          receipt_number?: string
          received_date?: string
          status?: Database["public"]["Enums"]["goods_receipt_status"]
          supplier_id?: string
          tenant_id?: string
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goods_receipts_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipts_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string
          discount_percentage: number | null
          id: string
          invoice_id: string
          notes: string | null
          product_id: string
          quantity: number
          tenant_id: string
          total_price: number
          unit_price: number
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          discount_percentage?: number | null
          id?: string
          invoice_id: string
          notes?: string | null
          product_id: string
          quantity?: number
          tenant_id?: string
          total_price: number
          unit_price: number
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          discount_percentage?: number | null
          id?: string
          invoice_id?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          tenant_id?: string
          total_price?: number
          unit_price?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "invoice_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          discount_amount: number | null
          due_date: string | null
          id: string
          invoice_number: string
          notes: string | null
          order_id: string | null
          paid_amount: number | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          rejection_reason: string | null
          status: Database["public"]["Enums"]["document_status"]
          submitted_at: string | null
          subtotal: number
          tax_amount: number | null
          tenant_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          discount_amount?: number | null
          due_date?: string | null
          id?: string
          invoice_number: string
          notes?: string | null
          order_id?: string | null
          paid_amount?: number | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          submitted_at?: string | null
          subtotal?: number
          tax_amount?: number | null
          tenant_id?: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          discount_amount?: number | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          notes?: string | null
          order_id?: string | null
          paid_amount?: number | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          submitted_at?: string | null
          subtotal?: number
          tax_amount?: number | null
          tenant_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          account_id: string
          created_at: string | null
          credit_amount: number | null
          debit_amount: number | null
          id: string
          journal_id: string
          line_number: number
          memo: string | null
          tenant_id: string
        }
        Insert: {
          account_id: string
          created_at?: string | null
          credit_amount?: number | null
          debit_amount?: number | null
          id?: string
          journal_id: string
          line_number: number
          memo?: string | null
          tenant_id?: string
        }
        Update: {
          account_id?: string
          created_at?: string | null
          credit_amount?: number | null
          debit_amount?: number | null
          id?: string
          journal_id?: string
          line_number?: number
          memo?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "journals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "journal_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_reversals: {
        Row: {
          created_at: string
          id: string
          original_journal_id: string
          reason: string
          reversal_journal_id: string
          reversed_by: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          original_journal_id: string
          reason: string
          reversal_journal_id: string
          reversed_by?: string | null
          tenant_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          original_journal_id?: string
          reason?: string
          reversal_journal_id?: string
          reversed_by?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_reversals_original_journal_id_fkey"
            columns: ["original_journal_id"]
            isOneToOne: true
            referencedRelation: "journals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_reversals_reversal_journal_id_fkey"
            columns: ["reversal_journal_id"]
            isOneToOne: false
            referencedRelation: "journals"
            referencedColumns: ["id"]
          },
        ]
      }
      journals: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          fiscal_period_id: string
          id: string
          is_posted: boolean | null
          journal_date: string
          journal_number: string
          posted_at: string | null
          reversed_by_journal_id: string | null
          reverses_journal_id: string | null
          source_id: string | null
          source_type: string | null
          tenant_id: string
          total_credit: number | null
          total_debit: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          fiscal_period_id: string
          id?: string
          is_posted?: boolean | null
          journal_date: string
          journal_number: string
          posted_at?: string | null
          reversed_by_journal_id?: string | null
          reverses_journal_id?: string | null
          source_id?: string | null
          source_type?: string | null
          tenant_id?: string
          total_credit?: number | null
          total_debit?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          fiscal_period_id?: string
          id?: string
          is_posted?: boolean | null
          journal_date?: string
          journal_number?: string
          posted_at?: string | null
          reversed_by_journal_id?: string | null
          reverses_journal_id?: string | null
          source_id?: string | null
          source_type?: string | null
          tenant_id?: string
          total_credit?: number | null
          total_debit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "journals_fiscal_period_id_fkey"
            columns: ["fiscal_period_id"]
            isOneToOne: false
            referencedRelation: "fiscal_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journals_reversed_by_journal_id_fkey"
            columns: ["reversed_by_journal_id"]
            isOneToOne: false
            referencedRelation: "journals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journals_reverses_journal_id_fkey"
            columns: ["reverses_journal_id"]
            isOneToOne: false
            referencedRelation: "journals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "journals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          approved_by: string | null
          created_at: string
          employee_id: string
          end_date: string
          id: string
          leave_type: string
          reason: string | null
          start_date: string
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          employee_id: string
          end_date: string
          id?: string
          leave_type?: string
          reason?: string | null
          start_date: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          employee_id?: string
          end_date?: string
          id?: string
          leave_type?: string
          reason?: string | null
          start_date?: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "leave_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          tenant_id: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          tenant_id?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          tenant_id?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_idempotency: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          idempotency_key: string
          operation: string
          response_hash: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          idempotency_key: string
          operation: string
          response_hash?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          idempotency_key?: string
          operation?: string
          response_hash?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          invoice_id: string | null
          notes: string | null
          payment_date: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_number: string
          reference_number: string | null
          tenant_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_number: string
          reference_number?: string | null
          tenant_id?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_number?: string
          reference_number?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_matrix_cache: {
        Row: {
          computed_at: string
          expires_at: string
          id: string
          matrix: Json
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          computed_at?: string
          expires_at?: string
          id?: string
          matrix?: Json
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          computed_at?: string
          expires_at?: string
          id?: string
          matrix?: Json
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permission_matrix_cache_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "permission_matrix_cache_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admins: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          permissions: Json | null
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          permissions?: Json | null
          role?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          permissions?: Json | null
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      platform_audit_logs: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      posting_account_map: {
        Row: {
          account_id: string
          created_at: string
          description: string | null
          id: string
          posting_key: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          description?: string | null
          id?: string
          posting_key: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          description?: string | null
          id?: string
          posting_key?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posting_account_map_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posting_account_map_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "posting_account_map_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      price_list_items: {
        Row: {
          created_at: string
          discount_percentage: number | null
          id: string
          min_quantity: number | null
          price: number
          price_list_id: string
          product_id: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          discount_percentage?: number | null
          id?: string
          min_quantity?: number | null
          price?: number
          price_list_id: string
          product_id: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          discount_percentage?: number | null
          id?: string
          min_quantity?: number | null
          price?: number
          price_list_id?: string
          product_id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_list_items_price_list_id_fkey"
            columns: ["price_list_id"]
            isOneToOne: false
            referencedRelation: "price_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_list_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_list_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "price_list_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      price_lists: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_lists_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "price_lists_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          parent_id: string | null
          sort_order: number | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          parent_id?: string | null
          sort_order?: number | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          sort_order?: number | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "product_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_stock: {
        Row: {
          id: string
          product_id: string
          quantity: number
          tenant_id: string
          updated_at: string
          variant_id: string | null
          warehouse_id: string
        }
        Insert: {
          id?: string
          product_id: string
          quantity?: number
          tenant_id?: string
          updated_at?: string
          variant_id?: string | null
          warehouse_id: string
        }
        Update: {
          id?: string
          product_id?: string
          quantity?: number
          tenant_id?: string
          updated_at?: string
          variant_id?: string | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_stock_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "product_stock_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_stock_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_stock_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          additional_price: number | null
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          product_id: string
          sku: string | null
          specifications: Json | null
          tenant_id: string | null
        }
        Insert: {
          additional_price?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          product_id: string
          sku?: string | null
          specifications?: Json | null
          tenant_id?: string | null
        }
        Update: {
          additional_price?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          product_id?: string
          sku?: string | null
          specifications?: Json | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "product_variants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          cost_price: number | null
          created_at: string
          description: string | null
          height_cm: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          length_cm: number | null
          min_stock: number | null
          name: string
          selling_price: number | null
          sku: string | null
          specifications: Json | null
          tenant_id: string
          updated_at: string
          weight_kg: number | null
          width_cm: number | null
        }
        Insert: {
          category_id?: string | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          height_cm?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          length_cm?: number | null
          min_stock?: number | null
          name: string
          selling_price?: number | null
          sku?: string | null
          specifications?: Json | null
          tenant_id?: string
          updated_at?: string
          weight_kg?: number | null
          width_cm?: number | null
        }
        Update: {
          category_id?: string | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          height_cm?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          length_cm?: number | null
          min_stock?: number | null
          name?: string
          selling_price?: number | null
          sku?: string | null
          specifications?: Json | null
          tenant_id?: string
          updated_at?: string
          weight_kg?: number | null
          width_cm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string
          department: string | null
          full_name: string
          id: string
          job_title: string | null
          last_login_at: string | null
          login_count: number | null
          phone: string | null
          phone2: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          full_name?: string
          id: string
          job_title?: string | null
          last_login_at?: string | null
          login_count?: number | null
          phone?: string | null
          phone2?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          full_name?: string
          id?: string
          job_title?: string | null
          last_login_at?: string | null
          login_count?: number | null
          phone?: string | null
          phone2?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      purchase_invoice_items: {
        Row: {
          created_at: string
          id: string
          invoice_id: string
          notes: string | null
          product_id: string
          quantity: number
          tenant_id: string
          total_price: number
          unit_price: number
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_id: string
          notes?: string | null
          product_id: string
          quantity: number
          tenant_id: string
          total_price?: number
          unit_price?: number
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          invoice_id?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          tenant_id?: string
          total_price?: number
          unit_price?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "purchase_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_invoice_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_invoices: {
        Row: {
          approval_required: boolean
          created_at: string
          created_by: string | null
          discount_amount: number
          due_date: string | null
          id: string
          invoice_date: string
          invoice_number: string
          matching_status: Database["public"]["Enums"]["matching_status_enum"]
          notes: string | null
          paid_amount: number
          payment_status: Database["public"]["Enums"]["purchase_invoice_payment_status"]
          posted_at: string | null
          posted_by: string | null
          purchase_order_id: string | null
          status: Database["public"]["Enums"]["purchase_invoice_status"]
          subtotal: number
          supplier_id: string
          tax_amount: number
          tenant_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          approval_required?: boolean
          created_at?: string
          created_by?: string | null
          discount_amount?: number
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number: string
          matching_status?: Database["public"]["Enums"]["matching_status_enum"]
          notes?: string | null
          paid_amount?: number
          payment_status?: Database["public"]["Enums"]["purchase_invoice_payment_status"]
          posted_at?: string | null
          posted_by?: string | null
          purchase_order_id?: string | null
          status?: Database["public"]["Enums"]["purchase_invoice_status"]
          subtotal?: number
          supplier_id: string
          tax_amount?: number
          tenant_id: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          approval_required?: boolean
          created_at?: string
          created_by?: string | null
          discount_amount?: number
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          matching_status?: Database["public"]["Enums"]["matching_status_enum"]
          notes?: string | null
          paid_amount?: number
          payment_status?: Database["public"]["Enums"]["purchase_invoice_payment_status"]
          posted_at?: string | null
          posted_by?: string | null
          purchase_order_id?: string | null
          status?: Database["public"]["Enums"]["purchase_invoice_status"]
          subtotal?: number
          supplier_id?: string
          tax_amount?: number
          tenant_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_invoices_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          order_id: string
          product_id: string
          quantity: number
          tenant_id: string
          total_price: number
          unit_price: number
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          order_id: string
          product_id: string
          quantity?: number
          tenant_id?: string
          total_price: number
          unit_price: number
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string
          product_id?: string
          quantity?: number
          tenant_id?: string
          total_price?: number
          unit_price?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "purchase_order_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          created_by: string | null
          expected_date: string | null
          id: string
          notes: string | null
          order_number: string
          status: Database["public"]["Enums"]["document_status"]
          subtotal: number
          supplier_id: string
          tax_amount: number | null
          tenant_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_number: string
          status?: Database["public"]["Enums"]["document_status"]
          subtotal?: number
          supplier_id: string
          tax_amount?: number | null
          tenant_id?: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          status?: Database["public"]["Enums"]["document_status"]
          subtotal?: number
          supplier_id?: string
          tax_amount?: number | null
          tenant_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "purchase_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          created_at: string | null
          device_info: Json | null
          id: string
          is_active: boolean | null
          subscription: Json
          tenant_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_info?: Json | null
          id?: string
          is_active?: boolean | null
          subscription: Json
          tenant_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_info?: Json | null
          id?: string
          is_active?: boolean | null
          subscription?: Json
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "push_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_items: {
        Row: {
          created_at: string
          discount_percentage: number | null
          id: string
          notes: string | null
          product_id: string
          quantity: number
          quotation_id: string
          tenant_id: string
          total_price: number
          unit_price: number
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          discount_percentage?: number | null
          id?: string
          notes?: string | null
          product_id: string
          quantity?: number
          quotation_id: string
          tenant_id?: string
          total_price: number
          unit_price: number
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          discount_percentage?: number | null
          id?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          quotation_id?: string
          tenant_id?: string
          total_price?: number
          unit_price?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "quotation_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string
          discount_amount: number | null
          id: string
          notes: string | null
          quotation_number: string
          status: Database["public"]["Enums"]["document_status"]
          subtotal: number
          tax_amount: number | null
          tenant_id: string
          total_amount: number
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id: string
          discount_amount?: number | null
          id?: string
          notes?: string | null
          quotation_number: string
          status?: Database["public"]["Enums"]["document_status"]
          subtotal?: number
          tax_amount?: number | null
          tenant_id?: string
          total_amount?: number
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string
          discount_amount?: number | null
          id?: string
          notes?: string | null
          quotation_number?: string
          status?: Database["public"]["Enums"]["document_status"]
          subtotal?: number
          tax_amount?: number | null
          tenant_id?: string
          total_amount?: number
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "quotations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_items: {
        Row: {
          created_at: string
          discount_percentage: number
          id: string
          notes: string | null
          product_id: string | null
          quantity: number
          quote_id: string
          tenant_id: string
          total_price: number
          unit_price: number
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          discount_percentage?: number
          id?: string
          notes?: string | null
          product_id?: string | null
          quantity: number
          quote_id: string
          tenant_id?: string
          total_price?: number
          unit_price: number
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          discount_percentage?: number
          id?: string
          notes?: string | null
          product_id?: string | null
          quantity?: number
          quote_id?: string
          tenant_id?: string
          total_price?: number
          unit_price?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          converted_order_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          discount_amount: number
          id: string
          notes: string | null
          quote_date: string
          quote_number: string
          status: Database["public"]["Enums"]["quote_status"]
          subtotal: number
          tax_amount: number
          tenant_id: string
          total_amount: number
          updated_at: string
          valid_until: string
        }
        Insert: {
          converted_order_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          discount_amount?: number
          id?: string
          notes?: string | null
          quote_date?: string
          quote_number: string
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number
          tax_amount?: number
          tenant_id?: string
          total_amount?: number
          updated_at?: string
          valid_until?: string
        }
        Update: {
          converted_order_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          discount_amount?: number
          id?: string
          notes?: string | null
          quote_date?: string
          quote_number?: string
          status?: Database["public"]["Enums"]["quote_status"]
          subtotal?: number
          tax_amount?: number
          tenant_id?: string
          total_amount?: number
          updated_at?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_config: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          is_active: boolean
          max_requests: number
          tier: string
          window_seconds: number
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          is_active?: boolean
          max_requests?: number
          tier?: string
          window_seconds?: number
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          is_active?: boolean
          max_requests?: number
          tier?: string
          window_seconds?: number
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          last_refill: string
          tenant_id: string | null
          tokens_remaining: number
          user_id: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          last_refill?: string
          tenant_id?: string | null
          tokens_remaining: number
          user_id: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          last_refill?: string
          tenant_id?: string | null
          tokens_remaining?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rate_limits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "rate_limits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      report_templates: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_default: boolean | null
          name: string
          template_data: Json
          tenant_id: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          template_data?: Json
          tenant_id?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          template_data?: Json
          tenant_id?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "report_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      restore_snapshots: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string
          id: string
          planned_mode: string
          rolled_back_at: string | null
          rolled_back_by: string | null
          row_counts: Json
          status: string
          storage_path: string
          tables: string[]
          tenant_id: string
          total_rows: number
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string
          id?: string
          planned_mode: string
          rolled_back_at?: string | null
          rolled_back_by?: string | null
          row_counts?: Json
          status?: string
          storage_path: string
          tables?: string[]
          tenant_id: string
          total_rows?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          planned_mode?: string
          rolled_back_at?: string | null
          rolled_back_by?: string | null
          row_counts?: Json
          status?: string
          storage_path?: string
          tables?: string[]
          tenant_id?: string
          total_rows?: number
        }
        Relationships: [
          {
            foreignKeyName: "restore_snapshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "restore_snapshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      role_field_permissions: {
        Row: {
          can_edit: boolean | null
          can_view: boolean | null
          created_at: string | null
          field_name: string
          id: string
          role_id: string
          section: string
          tenant_id: string | null
        }
        Insert: {
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          field_name: string
          id?: string
          role_id: string
          section: string
          tenant_id?: string | null
        }
        Update: {
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          field_name?: string
          id?: string
          role_id?: string
          section?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_field_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_field_permissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "role_field_permissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      role_limits: {
        Row: {
          created_at: string | null
          id: string
          max_credit_limit: number | null
          max_daily_transactions: number | null
          max_discount_percentage: number | null
          max_invoice_amount: number | null
          max_refund_amount: number | null
          role_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          max_credit_limit?: number | null
          max_daily_transactions?: number | null
          max_discount_percentage?: number | null
          max_invoice_amount?: number | null
          max_refund_amount?: number | null
          role_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          max_credit_limit?: number | null
          max_daily_transactions?: number | null
          max_discount_percentage?: number | null
          max_invoice_amount?: number | null
          max_refund_amount?: number | null
          role_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_limits_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: true
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_limits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "role_limits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      role_section_permissions: {
        Row: {
          can_create: boolean | null
          can_delete: boolean | null
          can_edit: boolean | null
          can_view: boolean | null
          created_at: string | null
          id: string
          role_id: string
          section: string
          tenant_id: string | null
        }
        Insert: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          id?: string
          role_id: string
          section: string
          tenant_id?: string | null
        }
        Update: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          id?: string
          role_id?: string
          section?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_section_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_section_permissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "role_section_permissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_order_items: {
        Row: {
          created_at: string
          discount_percentage: number | null
          id: string
          notes: string | null
          order_id: string
          product_id: string
          quantity: number
          tenant_id: string
          total_price: number
          unit_price: number
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          discount_percentage?: number | null
          id?: string
          notes?: string | null
          order_id: string
          product_id: string
          quantity?: number
          tenant_id?: string
          total_price: number
          unit_price: number
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          discount_percentage?: number | null
          id?: string
          notes?: string | null
          order_id?: string
          product_id?: string
          quantity?: number
          tenant_id?: string
          total_price?: number
          unit_price?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "sales_order_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string
          delivery_address: string | null
          delivery_date: string | null
          discount_amount: number | null
          id: string
          notes: string | null
          order_number: string
          quotation_id: string | null
          status: Database["public"]["Enums"]["document_status"]
          subtotal: number
          tax_amount: number | null
          tenant_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id: string
          delivery_address?: string | null
          delivery_date?: string | null
          discount_amount?: number | null
          id?: string
          notes?: string | null
          order_number: string
          quotation_id?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          subtotal?: number
          tax_amount?: number | null
          tenant_id?: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string
          delivery_address?: string | null
          delivery_date?: string | null
          discount_amount?: number | null
          id?: string
          notes?: string | null
          order_number?: string
          quotation_id?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          subtotal?: number
          tax_amount?: number | null
          tenant_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "sales_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      section_customizations: {
        Row: {
          created_at: string | null
          custom_label: string | null
          field_name: string
          field_options: Json | null
          field_type: string | null
          id: string
          is_custom_field: boolean | null
          is_visible: boolean | null
          section: string
          sort_order: number | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          custom_label?: string | null
          field_name: string
          field_options?: Json | null
          field_type?: string | null
          id?: string
          is_custom_field?: boolean | null
          is_visible?: boolean | null
          section: string
          sort_order?: number | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          custom_label?: string | null
          field_name?: string
          field_options?: Json | null
          field_type?: string | null
          id?: string
          is_custom_field?: boolean | null
          is_visible?: boolean | null
          section?: string
          sort_order?: number | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "section_customizations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "section_customizations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      slow_queries_log: {
        Row: {
          created_at: string
          duration_ms: number
          endpoint: string
          id: string
          metadata: Json | null
          query_name: string | null
          tenant_id: string | null
          threshold_ms: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          duration_ms: number
          endpoint: string
          id?: string
          metadata?: Json | null
          query_name?: string | null
          tenant_id?: string | null
          threshold_ms?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          duration_ms?: number
          endpoint?: string
          id?: string
          metadata?: Json | null
          query_name?: string | null
          tenant_id?: string | null
          threshold_ms?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "slow_queries_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "slow_queries_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sod_rules: {
        Row: {
          conflicting_actions: Json
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          conflicting_actions: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          conflicting_actions?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sod_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "sod_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          from_warehouse_id: string | null
          id: string
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          notes: string | null
          product_id: string
          quantity: number
          reference_id: string | null
          reference_type: string | null
          tenant_id: string
          to_warehouse_id: string | null
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          from_warehouse_id?: string | null
          id?: string
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          notes?: string | null
          product_id: string
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          tenant_id?: string
          to_warehouse_id?: string | null
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          from_warehouse_id?: string | null
          id?: string
          movement_type?: Database["public"]["Enums"]["stock_movement_type"]
          notes?: string | null
          product_id?: string
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          tenant_id?: string
          to_warehouse_id?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_from_warehouse_id_fkey"
            columns: ["from_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "stock_movements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_to_warehouse_id_fkey"
            columns: ["to_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_notes: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_pinned: boolean
          note: string
          supplier_id: string
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_pinned?: boolean
          note: string
          supplier_id: string
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_pinned?: boolean
          note?: string
          supplier_id?: string
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_notes_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_notes_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "supplier_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          payment_date: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_number: string
          purchase_order_id: string | null
          reference_number: string | null
          supplier_id: string
          tenant_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_number: string
          purchase_order_id?: string | null
          reference_number?: string | null
          supplier_id: string
          tenant_id?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_number?: string
          purchase_order_id?: string | null
          reference_number?: string | null
          supplier_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_payments_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "supplier_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          bank_account: string | null
          bank_name: string | null
          category: string | null
          city: string | null
          contact_person: string | null
          created_at: string
          credit_limit: number | null
          current_balance: number | null
          discount_percentage: number | null
          email: string | null
          governorate: string | null
          iban: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          last_transaction_date: string | null
          name: string
          notes: string | null
          payment_terms_days: number | null
          phone: string | null
          phone2: string | null
          preferred_payment_method: string | null
          rating: number | null
          supplier_type: string | null
          tax_number: string | null
          tenant_id: string
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          bank_account?: string | null
          bank_name?: string | null
          category?: string | null
          city?: string | null
          contact_person?: string | null
          created_at?: string
          credit_limit?: number | null
          current_balance?: number | null
          discount_percentage?: number | null
          email?: string | null
          governorate?: string | null
          iban?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          last_transaction_date?: string | null
          name: string
          notes?: string | null
          payment_terms_days?: number | null
          phone?: string | null
          phone2?: string | null
          preferred_payment_method?: string | null
          rating?: number | null
          supplier_type?: string | null
          tax_number?: string | null
          tenant_id?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          bank_account?: string | null
          bank_name?: string | null
          category?: string | null
          city?: string | null
          contact_person?: string | null
          created_at?: string
          credit_limit?: number | null
          current_balance?: number | null
          discount_percentage?: number | null
          email?: string | null
          governorate?: string | null
          iban?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          last_transaction_date?: string | null
          name?: string
          notes?: string | null
          payment_terms_days?: number | null
          phone?: string | null
          phone2?: string | null
          preferred_payment_method?: string | null
          rating?: number | null
          supplier_type?: string | null
          tax_number?: string | null
          tenant_id?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "suppliers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_logs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          operation: string
          record_id: string | null
          status: string
          synced_at: string | null
          table_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          operation: string
          record_id?: string | null
          status?: string
          synced_at?: string | null
          table_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          operation?: string
          record_id?: string | null
          status?: string
          synced_at?: string | null
          table_name?: string
          user_id?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key: string
          setting_value?: Json
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "system_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          is_completed: boolean | null
          priority: string | null
          tenant_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          priority?: string | null
          tenant_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          priority?: string | null
          tenant_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          domain: string | null
          id: string
          is_active: boolean
          name: string
          settings: Json | null
          slug: string
          subscription_tier: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          domain?: string | null
          id?: string
          is_active?: boolean
          name: string
          settings?: Json | null
          slug: string
          subscription_tier?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          domain?: string | null
          id?: string
          is_active?: boolean
          name?: string
          settings?: Json | null
          slug?: string
          subscription_tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_2fa_settings: {
        Row: {
          backup_codes: string[] | null
          created_at: string | null
          enabled_at: string | null
          id: string
          is_enabled: boolean | null
          last_used_at: string | null
          secret_encrypted: string | null
          secret_key: string | null
          user_id: string
        }
        Insert: {
          backup_codes?: string[] | null
          created_at?: string | null
          enabled_at?: string | null
          id?: string
          is_enabled?: boolean | null
          last_used_at?: string | null
          secret_encrypted?: string | null
          secret_key?: string | null
          user_id: string
        }
        Update: {
          backup_codes?: string[] | null
          created_at?: string | null
          enabled_at?: string | null
          id?: string
          is_enabled?: boolean | null
          last_used_at?: string | null
          secret_encrypted?: string | null
          secret_key?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_dashboard_settings: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          user_id: string
          widgets: Json
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          widgets?: Json
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          widgets?: Json
        }
        Relationships: []
      }
      user_login_history: {
        Row: {
          device_type: string | null
          id: string
          ip_address: string | null
          login_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          device_type?: string | null
          id?: string
          ip_address?: string | null
          login_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          device_type?: string | null
          id?: string
          ip_address?: string | null
          login_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_notification_settings: {
        Row: {
          created_at: string | null
          email_notifications: boolean | null
          id: string
          low_stock_alerts: boolean | null
          overdue_invoice_alerts: boolean | null
          system_notifications: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_notifications?: boolean | null
          id?: string
          low_stock_alerts?: boolean | null
          overdue_invoice_alerts?: boolean | null
          system_notifications?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_notifications?: boolean | null
          id?: string
          low_stock_alerts?: boolean | null
          overdue_invoice_alerts?: boolean | null
          system_notifications?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_offline_settings: {
        Row: {
          auto_sync_interval: number
          created_at: string
          enabled_tables: Json
          id: string
          sync_on_login: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_sync_interval?: number
          created_at?: string
          enabled_tables?: Json
          id?: string
          sync_on_login?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_sync_interval?: number
          created_at?: string
          enabled_tables?: Json
          id?: string
          sync_on_login?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          accent_color: string | null
          collapsed_sections: Json | null
          created_at: string | null
          dashboard_widgets: Json | null
          favorite_pages: Json | null
          font_family: string | null
          font_size: string | null
          id: string
          notification_settings: Json | null
          primary_color: string | null
          sidebar_compact: boolean | null
          sidebar_order: Json | null
          table_settings: Json | null
          theme: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          accent_color?: string | null
          collapsed_sections?: Json | null
          created_at?: string | null
          dashboard_widgets?: Json | null
          favorite_pages?: Json | null
          font_family?: string | null
          font_size?: string | null
          id?: string
          notification_settings?: Json | null
          primary_color?: string | null
          sidebar_compact?: boolean | null
          sidebar_order?: Json | null
          table_settings?: Json | null
          theme?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          accent_color?: string | null
          collapsed_sections?: Json | null
          created_at?: string | null
          dashboard_widgets?: Json | null
          favorite_pages?: Json | null
          font_family?: string | null
          font_size?: string | null
          id?: string
          notification_settings?: Json | null
          primary_color?: string | null
          sidebar_compact?: boolean | null
          sidebar_order?: Json | null
          table_settings?: Json | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          custom_role_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_role_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_role_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_custom_role_id_fkey"
            columns: ["custom_role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_saved_views: {
        Row: {
          created_at: string
          filters: Json
          id: string
          name: string
          section: string
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          id?: string
          name: string
          section?: string
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          name?: string
          section?: string
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_saved_views_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_saved_views_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sidebar_settings: {
        Row: {
          collapsed_sections: string[] | null
          created_at: string | null
          id: string
          section_order: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          collapsed_sections?: string[] | null
          created_at?: string | null
          id?: string
          section_order?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          collapsed_sections?: string[] | null
          created_at?: string | null
          id?: string
          section_order?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_tenants: {
        Row: {
          id: string
          is_default: boolean
          joined_at: string
          role: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          id?: string
          is_default?: boolean
          joined_at?: string
          role?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          id?: string
          is_default?: boolean
          joined_at?: string
          role?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tenants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "user_tenants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          location: string | null
          name: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          name: string
          tenant_id?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "warehouses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      customers_safe: {
        Row: {
          category_id: string | null
          city: string | null
          contact_person: string | null
          contact_person_role: string | null
          created_at: string | null
          credit_limit: number | null
          current_balance: number | null
          customer_type: Database["public"]["Enums"]["customer_type"] | null
          discount_percentage: number | null
          email: string | null
          governorate: string | null
          id: string | null
          image_url: string | null
          is_active: boolean | null
          last_activity_at: string | null
          last_transaction_date: string | null
          name: string | null
          notes: string | null
          payment_terms_days: number | null
          phone: string | null
          phone2: string | null
          preferred_payment_method: string | null
          tax_number: string | null
          tenant_id: string | null
          updated_at: string | null
          vip_level: Database["public"]["Enums"]["vip_level"] | null
        }
        Insert: {
          category_id?: string | null
          city?: string | null
          contact_person?: string | null
          contact_person_role?: string | null
          created_at?: string | null
          credit_limit?: number | null
          current_balance?: number | null
          customer_type?: Database["public"]["Enums"]["customer_type"] | null
          discount_percentage?: number | null
          email?: never
          governorate?: string | null
          id?: string | null
          image_url?: string | null
          is_active?: boolean | null
          last_activity_at?: string | null
          last_transaction_date?: string | null
          name?: string | null
          notes?: string | null
          payment_terms_days?: number | null
          phone?: never
          phone2?: never
          preferred_payment_method?: string | null
          tax_number?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          vip_level?: Database["public"]["Enums"]["vip_level"] | null
        }
        Update: {
          category_id?: string | null
          city?: string | null
          contact_person?: string | null
          contact_person_role?: string | null
          created_at?: string | null
          credit_limit?: number | null
          current_balance?: number | null
          customer_type?: Database["public"]["Enums"]["customer_type"] | null
          discount_percentage?: number | null
          email?: never
          governorate?: string | null
          id?: string | null
          image_url?: string | null
          is_active?: boolean | null
          last_activity_at?: string | null
          last_transaction_date?: string | null
          name?: string | null
          notes?: string | null
          payment_terms_days?: number | null
          phone?: never
          phone2?: never
          preferred_payment_method?: string | null
          tax_number?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          vip_level?: Database["public"]["Enums"]["vip_level"] | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "customer_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employees_safe: {
        Row: {
          address: string | null
          bank_account: string | null
          base_salary: number | null
          birth_date: string | null
          contract_type: string | null
          created_at: string | null
          created_by: string | null
          department: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          employee_number: string | null
          employment_status: string | null
          full_name: string | null
          gender: string | null
          hire_date: string | null
          id: string | null
          image_url: string | null
          job_title: string | null
          marital_status: string | null
          national_id: string | null
          notes: string | null
          phone: string | null
          phone2: string | null
          tenant_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address?: never
          bank_account?: never
          base_salary?: never
          birth_date?: never
          contract_type?: string | null
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          email?: string | null
          emergency_contact_name?: never
          emergency_contact_phone?: never
          employee_number?: string | null
          employment_status?: string | null
          full_name?: string | null
          gender?: string | null
          hire_date?: string | null
          id?: string | null
          image_url?: string | null
          job_title?: string | null
          marital_status?: string | null
          national_id?: never
          notes?: string | null
          phone?: string | null
          phone2?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: never
          bank_account?: never
          base_salary?: never
          birth_date?: never
          contract_type?: string | null
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          email?: string | null
          emergency_contact_name?: never
          emergency_contact_phone?: never
          employee_number?: string | null
          employment_status?: string | null
          full_name?: string | null
          gender?: string | null
          hire_date?: string | null
          id?: string | null
          image_url?: string | null
          job_title?: string | null
          marital_status?: string | null
          national_id?: never
          notes?: string | null
          phone?: string | null
          phone2?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "employees_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      event_dispatcher_backlog: {
        Row: {
          event_count: number | null
          event_type: string | null
          max_attempts: number | null
          oldest_event_at: string | null
          status: string | null
        }
        Relationships: []
      }
      event_dispatcher_metrics: {
        Row: {
          avg_latency_ms: number | null
          event_type: string | null
          failure_count: number | null
          hour: string | null
          success_count: number | null
          success_rate_pct: number | null
          total_count: number | null
        }
        Insert: {
          avg_latency_ms?: never
          event_type?: string | null
          failure_count?: number | null
          hour?: never
          success_count?: number | null
          success_rate_pct?: never
          total_count?: never
        }
        Update: {
          avg_latency_ms?: never
          event_type?: string | null
          failure_count?: number | null
          hour?: never
          success_count?: number | null
          success_rate_pct?: never
          total_count?: never
        }
        Relationships: []
      }
      invoice_item_returns_summary: {
        Row: {
          confirmed_credit_notes_count: number | null
          confirmed_returned_qty: number | null
          draft_credit_notes_count: number | null
          draft_returned_qty: number | null
          invoice_id: string | null
          invoice_item_id: string | null
          original_qty: number | null
          product_id: string | null
          remaining_qty: number | null
          unit_price_current: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      mv_dashboard_counts: {
        Row: {
          customers_count: number | null
          invoices_count: number | null
          products_count: number | null
          quotations_count: number | null
          refreshed_at: string | null
          tenant_id: string | null
        }
        Relationships: []
      }
      security_dashboard: {
        Row: {
          action: string | null
          action_count: number | null
          entity_type: string | null
          time_bucket: string | null
          unique_users: number | null
        }
        Relationships: []
      }
      suppliers_safe: {
        Row: {
          address: string | null
          bank_account: string | null
          bank_name: string | null
          category: string | null
          city: string | null
          contact_person: string | null
          created_at: string | null
          credit_limit: number | null
          current_balance: number | null
          discount_percentage: number | null
          email: string | null
          governorate: string | null
          iban: string | null
          id: string | null
          image_url: string | null
          is_active: boolean | null
          last_transaction_date: string | null
          name: string | null
          notes: string | null
          payment_terms_days: number | null
          phone: string | null
          phone2: string | null
          preferred_payment_method: string | null
          rating: number | null
          supplier_type: string | null
          tax_number: string | null
          tenant_id: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          bank_account?: never
          bank_name?: never
          category?: string | null
          city?: string | null
          contact_person?: string | null
          created_at?: string | null
          credit_limit?: number | null
          current_balance?: number | null
          discount_percentage?: number | null
          email?: string | null
          governorate?: string | null
          iban?: never
          id?: string | null
          image_url?: string | null
          is_active?: boolean | null
          last_transaction_date?: string | null
          name?: string | null
          notes?: string | null
          payment_terms_days?: number | null
          phone?: string | null
          phone2?: string | null
          preferred_payment_method?: string | null
          rating?: number | null
          supplier_type?: string | null
          tax_number?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          bank_account?: never
          bank_name?: never
          category?: string | null
          city?: string | null
          contact_person?: string | null
          created_at?: string | null
          credit_limit?: number | null
          current_balance?: number | null
          discount_percentage?: number | null
          email?: string | null
          governorate?: string | null
          iban?: never
          id?: string | null
          image_url?: string | null
          is_active?: boolean | null
          last_transaction_date?: string | null
          name?: string | null
          notes?: string | null
          payment_terms_days?: number | null
          phone?: string | null
          phone2?: string | null
          preferred_payment_method?: string | null
          rating?: number | null
          supplier_type?: string | null
          tax_number?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "mv_dashboard_counts"
            referencedColumns: ["tenant_id"]
          },
          {
            foreignKeyName: "suppliers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      suspicious_activities: {
        Row: {
          action: string | null
          entity_type: string | null
          first_action: string | null
          frequency: number | null
          last_action: string | null
          user_id: string | null
        }
        Relationships: []
      }
      user_2fa_status: {
        Row: {
          created_at: string | null
          is_enabled: boolean | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          is_enabled?: never
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          is_enabled?: never
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _has_posted_journal: {
        Args: { _source_id: string; _source_type: string }
        Returns: boolean
      }
      _resolve_open_period: {
        Args: { _date: string; _tenant_id: string }
        Returns: string
      }
      admin_requeue_event: { Args: { _event_id: string }; Returns: undefined }
      atomic_customer_balance_update: {
        Args: { _amount: number; _customer_id: string }
        Returns: undefined
      }
      atomic_supplier_balance_update: {
        Args: { _amount: number; _supplier_id: string }
        Returns: undefined
      }
      batch_validate_delete: {
        Args: { p_ids: string[] }
        Returns: {
          customer_id: string
          customer_name: string
          open_invoice_count: number
        }[]
      }
      cancel_credit_note: { Args: { p_credit_note_id: string }; Returns: Json }
      cancel_delivery_note: {
        Args: { _reason?: string; p_id: string }
        Returns: Json
      }
      cancel_goods_receipt: {
        Args: { _reason?: string; p_id: string }
        Returns: Json
      }
      check_financial_limit:
        | {
            Args: { _limit_type: string; _user_id: string; _value: number }
            Returns: boolean
          }
        | {
            Args: {
              _amount: number
              _limit_type: string
              _tenant: string
              _user_id: string
            }
            Returns: boolean
          }
      check_rate_limit: {
        Args: { _endpoint: string; _user_id: string }
        Returns: boolean
      }
      check_section_permission: {
        Args: { _action: string; _section: string; _user_id: string }
        Returns: boolean
      }
      check_sod_violation: {
        Args: {
          _action: string
          _entity_id: string
          _section: string
          _user_id: string
        }
        Returns: Json
      }
      claim_pending_events: {
        Args: { _batch_size?: number }
        Returns: {
          aggregate_id: string | null
          aggregate_type: string | null
          attempts: number
          created_at: string
          emitted_by: string | null
          event_type: string
          id: string
          last_error: string | null
          next_retry_at: string | null
          payload: Json
          processed_at: string | null
          status: string
          tenant_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "domain_events"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      compute_permission_matrix: { Args: { _user_id: string }; Returns: Json }
      confirm_credit_note: { Args: { p_credit_note_id: string }; Returns: Json }
      convert_invoice_to_delivery: {
        Args: { p_invoice_id: string; p_warehouse_id?: string }
        Returns: string
      }
      convert_order_to_invoice: {
        Args: { p_order_id: string }
        Returns: string
      }
      convert_quote_to_order: { Args: { p_quote_id: string }; Returns: string }
      create_journal_for_credit_note: {
        Args: { _credit_note_id: string }
        Returns: Json
      }
      create_journal_for_delivery_note: {
        Args: { _delivery_id: string }
        Returns: Json
      }
      create_journal_for_expense: {
        Args: { _expense_id: string }
        Returns: Json
      }
      create_journal_for_goods_receipt: {
        Args: { _receipt_id: string }
        Returns: Json
      }
      create_journal_for_invoice: {
        Args: { _invoice_id: string }
        Returns: Json
      }
      create_journal_for_payment: {
        Args: { _payment_id: string }
        Returns: Json
      }
      create_journal_for_purchase_invoice: {
        Args: { _invoice_id: string }
        Returns: Json
      }
      create_journal_reversal: {
        Args: {
          _original_journal_id: string
          _reason: string
          _reversal_date?: string
        }
        Returns: string
      }
      decrypt_totp_secret: { Args: { _user_id: string }; Returns: string }
      emit_event: {
        Args: {
          _aggregate_id: string
          _aggregate_type: string
          _event_type: string
          _payload?: Json
        }
        Returns: string
      }
      ensure_credit_note_posting_accounts: { Args: never; Returns: Json }
      ensure_logistics_posting_accounts: { Args: never; Returns: Json }
      find_duplicate_customers: {
        Args: { p_tenant_id?: string }
        Returns: {
          id1: string
          id2: string
          match_type: string
          name1: string
          name2: string
          phone1: string
          phone2: string
          similarity_score: number
        }[]
      }
      get_all_tenants_admin: {
        Args: never
        Returns: {
          created_at: string
          domain: string
          id: string
          is_active: boolean
          name: string
          slug: string
          subscription_tier: string
          updated_at: string
          user_count: number
        }[]
      }
      get_approval_chain: {
        Args: { _amount: number; _entity_type: string }
        Returns: string
      }
      get_ar_aging_mv: {
        Args: never
        Returns: unknown[]
        SetofOptions: {
          from: "*"
          to: "mv_ar_aging"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_current_tenant: { Args: never; Returns: string }
      get_customer_aging: { Args: { _customer_id: string }; Returns: Json }
      get_customer_chart_data: { Args: { _customer_id: string }; Returns: Json }
      get_customer_financial_summary: {
        Args: { _customer_id: string }
        Returns: Json
      }
      get_customer_health_score: {
        Args: { _customer_id: string }
        Returns: Json
      }
      get_customer_statement: {
        Args: { _customer_id: string; _date_from?: string; _date_to?: string }
        Returns: {
          credit: number
          debit: number
          entry_date: string
          entry_type: string
          reference: string
          running_balance: number
          status: string
        }[]
      }
      get_customer_stats: { Args: never; Returns: Json }
      get_dashboard_overview: { Args: never; Returns: Json }
      get_inventory_valuation_mv: {
        Args: never
        Returns: unknown[]
        SetofOptions: {
          from: "*"
          to: "mv_inventory_valuation"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_invoice_item_returnable:
        | { Args: { _invoice_item_id: string }; Returns: number }
        | {
            Args: { _include_drafts?: boolean; _invoice_item_id: string }
            Returns: number
          }
      get_low_stock_products: {
        Args: never
        Returns: {
          current_stock: number
          min_stock: number
          product_id: string
          product_name: string
        }[]
      }
      get_monthly_sales_decline: {
        Args: never
        Returns: {
          customer_id: string
          customer_name: string
          customer_phone: string
          previous_sales: number
          recent_sales: number
        }[]
      }
      get_permission_matrix: { Args: { _user_id?: string }; Returns: Json }
      get_platform_role: { Args: { _user_id?: string }; Returns: string }
      get_platform_stats: { Args: never; Returns: Json }
      get_sales_summary_mv: {
        Args: never
        Returns: unknown[]
        SetofOptions: {
          from: "*"
          to: "mv_sales_summary"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_sidebar_counts: { Args: never; Returns: Json }
      get_supplier_aging: { Args: { _supplier_id: string }; Returns: Json }
      get_supplier_chart_data: { Args: { _supplier_id: string }; Returns: Json }
      get_supplier_financial_summary: {
        Args: { _supplier_id: string }
        Returns: Json
      }
      get_supplier_health_score: {
        Args: { _supplier_id: string }
        Returns: Json
      }
      get_supplier_statement: {
        Args: { _date_from?: string; _date_to?: string; _supplier_id: string }
        Returns: {
          credit: number
          debit: number
          entry_date: string
          entry_type: string
          reference: string
          running_balance: number
          status: string
        }[]
      }
      get_unpaid_invoices_summary: {
        Args: never
        Returns: {
          invoice_count: number
          total_unpaid: number
        }[]
      }
      get_user_tenant_id: { Args: { _user_id: string }; Returns: string }
      get_user_tenants: { Args: { _user_id: string }; Returns: string[] }
      has_any_role: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_equivalent_custom_role: {
        Args: { _role_id: string; _tenant_id: string }
        Returns: boolean
      }
      is_period_closed: {
        Args: { _date: string; _tenant_id: string }
        Returns: boolean
      }
      is_platform_admin: { Args: { _user_id?: string }; Returns: boolean }
      is_tenant_member: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      log_bulk_operation: {
        Args: {
          _action: string
          _details?: Json
          _entity_ids: string[]
          _entity_type: string
        }
        Returns: undefined
      }
      log_slow_query: {
        Args: {
          _duration_ms: number
          _endpoint: string
          _metadata?: Json
          _query_name?: string
        }
        Returns: undefined
      }
      mark_event_processed: {
        Args: { _error?: string; _event_id: string; _new_status: string }
        Returns: undefined
      }
      merge_customers_atomic: {
        Args: { p_duplicate_id: string; p_primary_id: string }
        Returns: Json
      }
      needs_approval: {
        Args: { _amount: number; _entity_type: string }
        Returns: boolean
      }
      post_delivery_note: { Args: { p_id: string }; Returns: Json }
      post_goods_receipt: { Args: { p_id: string }; Returns: Json }
      post_purchase_invoice: { Args: { p_id: string }; Returns: Json }
      prune_expired_idempotency: { Args: never; Returns: number }
      purge_old_audit_records: { Args: never; Returns: undefined }
      record_dispatcher_batch: {
        Args: {
          _auth_mode: string
          _batch_size: number
          _claimed_count: number
          _correlation_id: string
          _failed: number
          _processed: number
          _skipped: number
          _started_at: string
          _total_ms: number
        }
        Returns: undefined
      }
      record_event_metric: {
        Args: { _event_type: string; _latency_ms?: number; _success: boolean }
        Returns: undefined
      }
      refresh_customer_stats_mv: { Args: never; Returns: undefined }
      refresh_enterprise_mvs: { Args: never; Returns: undefined }
      refresh_mv_dashboard_counts: { Args: never; Returns: undefined }
      resolve_posting_account: {
        Args: { _posting_key: string; _tenant_id: string }
        Returns: string
      }
      reverse_journal_for_credit_note: {
        Args: { _credit_note_id: string }
        Returns: Json
      }
      reverse_stock_for_credit_note: {
        Args: { _credit_note_id: string }
        Returns: Json
      }
      storage_tenant_from_path: { Args: { _name: string }; Returns: string }
      switch_user_tenant: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      toggle_tenant_status: {
        Args: { _is_active: boolean; _tenant_id: string }
        Returns: boolean
      }
      update_tenant_subscription: {
        Args: { _tenant_id: string; _tier: string }
        Returns: boolean
      }
      validate_credit_note_before_confirm: {
        Args: { p_credit_note_id: string }
        Returns: Json
      }
      validate_ledger_integrity: {
        Args: { _tenant_id?: string }
        Returns: {
          check_name: string
          details: Json
          failing_count: number
          status: string
        }[]
      }
      void_invoice: {
        Args: { _invoice_id: string; _reason?: string }
        Returns: Json
      }
    }
    Enums: {
      account_type: "asset" | "liability" | "equity" | "revenue" | "expense"
      app_role: "admin" | "sales" | "warehouse" | "accountant" | "hr"
      balance_type: "debit" | "credit"
      customer_type: "individual" | "company" | "farm"
      delivery_note_status: "draft" | "in_transit" | "delivered" | "cancelled"
      document_status:
        | "draft"
        | "pending"
        | "approved"
        | "cancelled"
        | "completed"
      goods_receipt_status: "draft" | "posted" | "cancelled"
      matching_status_enum:
        | "matched"
        | "over_received"
        | "under_received"
        | "no_receipt"
        | "pending"
      payment_method:
        | "cash"
        | "bank_transfer"
        | "credit"
        | "installment"
        | "advance_payment"
      payment_status: "pending" | "partial" | "paid" | "overdue"
      purchase_invoice_payment_status: "pending" | "partial" | "paid"
      purchase_invoice_status: "draft" | "posted" | "paid" | "cancelled"
      quote_status:
        | "draft"
        | "sent"
        | "accepted"
        | "rejected"
        | "expired"
        | "converted"
      stock_movement_type: "in" | "out" | "transfer" | "adjustment"
      vip_level: "regular" | "silver" | "gold" | "platinum"
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
      account_type: ["asset", "liability", "equity", "revenue", "expense"],
      app_role: ["admin", "sales", "warehouse", "accountant", "hr"],
      balance_type: ["debit", "credit"],
      customer_type: ["individual", "company", "farm"],
      delivery_note_status: ["draft", "in_transit", "delivered", "cancelled"],
      document_status: [
        "draft",
        "pending",
        "approved",
        "cancelled",
        "completed",
      ],
      goods_receipt_status: ["draft", "posted", "cancelled"],
      matching_status_enum: [
        "matched",
        "over_received",
        "under_received",
        "no_receipt",
        "pending",
      ],
      payment_method: [
        "cash",
        "bank_transfer",
        "credit",
        "installment",
        "advance_payment",
      ],
      payment_status: ["pending", "partial", "paid", "overdue"],
      purchase_invoice_payment_status: ["pending", "partial", "paid"],
      purchase_invoice_status: ["draft", "posted", "paid", "cancelled"],
      quote_status: [
        "draft",
        "sent",
        "accepted",
        "rejected",
        "expired",
        "converted",
      ],
      stock_movement_type: ["in", "out", "transfer", "adjustment"],
      vip_level: ["regular", "silver", "gold", "platinum"],
    },
  },
} as const
