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
    PostgrestVersion: "14.15"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          id: string
          metadata: Json
          target_id: string | null
          target_label: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_label?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_label?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          enabled: boolean
          featured: boolean
          icon: string | null
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          featured?: boolean
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          enabled?: boolean
          featured?: boolean
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      category_covers: {
        Row: {
          category: string
          image_url: string
          updated_at: string
        }
        Insert: {
          category: string
          image_url: string
          updated_at?: string
        }
        Update: {
          category?: string
          image_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      hotel_booking_requests: {
        Row: {
          adults: number
          check_in: string
          check_out: string
          children: number
          created_at: string
          guest_email: string | null
          guest_name: string
          guest_phone: string
          id: string
          merchant_id: string
          notes: string | null
          room_preference: string | null
          rooms: number
          source: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          adults?: number
          check_in: string
          check_out: string
          children?: number
          created_at?: string
          guest_email?: string | null
          guest_name: string
          guest_phone: string
          id?: string
          merchant_id: string
          notes?: string | null
          room_preference?: string | null
          rooms?: number
          source?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          adults?: number
          check_in?: string
          check_out?: string
          children?: number
          created_at?: string
          guest_email?: string | null
          guest_name?: string
          guest_phone?: string
          id?: string
          merchant_id?: string
          notes?: string | null
          room_preference?: string | null
          rooms?: number
          source?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_booking_requests_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_profiles: {
        Row: {
          affiliate_booking_url: string | null
          airport_transfer_available: boolean
          amenities: string[]
          breakfast_available: boolean
          cancellation_policy: string | null
          check_in_time: string | null
          check_out_time: string | null
          created_at: string
          id: string
          merchant_id: string
          parking_available: boolean
          room_types: Json
          star_rating: number | null
          updated_at: string
          whatsapp_booking_enabled: boolean
        }
        Insert: {
          affiliate_booking_url?: string | null
          airport_transfer_available?: boolean
          amenities?: string[]
          breakfast_available?: boolean
          cancellation_policy?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string
          id?: string
          merchant_id: string
          parking_available?: boolean
          room_types?: Json
          star_rating?: number | null
          updated_at?: string
          whatsapp_booking_enabled?: boolean
        }
        Update: {
          affiliate_booking_url?: string | null
          airport_transfer_available?: boolean
          amenities?: string[]
          breakfast_available?: boolean
          cancellation_policy?: string | null
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string
          id?: string
          merchant_id?: string
          parking_available?: boolean
          room_types?: Json
          star_rating?: number | null
          updated_at?: string
          whatsapp_booking_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "hotel_profiles_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: true
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_room_photos: {
        Row: {
          created_at: string
          id: string
          merchant_id: string
          room_type_id: string
          sort_order: number
          storage_path: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          merchant_id: string
          room_type_id: string
          sort_order?: number
          storage_path: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          merchant_id?: string
          room_type_id?: string
          sort_order?: number
          storage_path?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_room_photos_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      itinerary_collaborators: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          invited_by: string
          itinerary_id: string
          role: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_by: string
          itinerary_id: string
          role?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_by?: string
          itinerary_id?: string
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_collaborators_itinerary_id_fkey"
            columns: ["itinerary_id"]
            isOneToOne: false
            referencedRelation: "user_itineraries"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_approval_history: {
        Row: {
          action: string
          changes: Json | null
          id: string
          merchant_id: string
          reason: string | null
          reverted_at: string | null
          reverted_by: string | null
          revertible_until: string | null
          reviewed_at: string
          reviewed_by: string | null
        }
        Insert: {
          action: string
          changes?: Json | null
          id?: string
          merchant_id: string
          reason?: string | null
          reverted_at?: string | null
          reverted_by?: string | null
          revertible_until?: string | null
          reviewed_at?: string
          reviewed_by?: string | null
        }
        Update: {
          action?: string
          changes?: Json | null
          id?: string
          merchant_id?: string
          reason?: string | null
          reverted_at?: string | null
          reverted_by?: string | null
          revertible_until?: string | null
          reviewed_at?: string
          reviewed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merchant_approval_history_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_claims: {
        Row: {
          claim_notes: string | null
          created_at: string
          id: string
          merchant_id: string
          note: string | null
          rejection_reason: string | null
          requester_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          verification_document_url: string | null
        }
        Insert: {
          claim_notes?: string | null
          created_at?: string
          id?: string
          merchant_id: string
          note?: string | null
          rejection_reason?: string | null
          requester_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          verification_document_url?: string | null
        }
        Update: {
          claim_notes?: string | null
          created_at?: string
          id?: string
          merchant_id?: string
          note?: string | null
          rejection_reason?: string | null
          requester_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          verification_document_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merchant_claims_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_hours: {
        Row: {
          close_time: string | null
          day_of_week: number
          id: string
          is_24h: boolean
          is_closed: boolean
          merchant_id: string
          open_time: string | null
        }
        Insert: {
          close_time?: string | null
          day_of_week: number
          id?: string
          is_24h?: boolean
          is_closed?: boolean
          merchant_id: string
          open_time?: string | null
        }
        Update: {
          close_time?: string | null
          day_of_week?: number
          id?: string
          is_24h?: boolean
          is_closed?: boolean
          merchant_id?: string
          open_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merchant_hours_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_offers: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          discount_value: number | null
          ends_at: string
          id: string
          is_active: boolean
          merchant_id: string
          offer_type: string
          promo_code: string | null
          starts_at: string
          terms: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          discount_value?: number | null
          ends_at: string
          id?: string
          is_active?: boolean
          merchant_id: string
          offer_type?: string
          promo_code?: string | null
          starts_at: string
          terms?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          discount_value?: number | null
          ends_at?: string
          id?: string
          is_active?: boolean
          merchant_id?: string
          offer_type?: string
          promo_code?: string | null
          starts_at?: string
          terms?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merchant_offers_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          merchant_id: string
          sort_order: number
          url: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          merchant_id: string
          sort_order?: number
          url: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          merchant_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_photos_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          merchant_id: string
          rating: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          merchant_id: string
          rating: number
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          merchant_id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_reviews_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchants: {
        Row: {
          address: string | null
          avg_duration_minutes: number | null
          avg_rating: number | null
          best_visit_time: string[]
          branch_label: string | null
          brand_group_id: string | null
          categories: Database["public"]["Enums"]["business_category"][]
          category: Database["public"]["Enums"]["business_category"]
          city: string | null
          claim_status: Database["public"]["Enums"]["claim_status"]
          cover_url: string | null
          created_at: string
          description: string | null
          dietary_options: string[]
          email: string | null
          facebook: string | null
          features: string[]
          id: string
          instagram: string | null
          is_main_branch: boolean
          is_sponsored: boolean | null
          is_suspended: boolean
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          mood_tags: string[]
          name: string
          owner_id: string | null
          pending_changes: Json | null
          phone: string | null
          price_level: Database["public"]["Enums"]["price_level"] | null
          rejection_reason: string | null
          review_count: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["merchant_status"]
          submitted_at: string | null
          suitability: string[]
          tiktok: string | null
          transportation: string[]
          updated_at: string
          verification_document_url: string | null
          verification_status: string | null
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          avg_duration_minutes?: number | null
          avg_rating?: number | null
          best_visit_time?: string[]
          branch_label?: string | null
          brand_group_id?: string | null
          categories?: Database["public"]["Enums"]["business_category"][]
          category?: Database["public"]["Enums"]["business_category"]
          city?: string | null
          claim_status?: Database["public"]["Enums"]["claim_status"]
          cover_url?: string | null
          created_at?: string
          description?: string | null
          dietary_options?: string[]
          email?: string | null
          facebook?: string | null
          features?: string[]
          id?: string
          instagram?: string | null
          is_main_branch?: boolean
          is_sponsored?: boolean | null
          is_suspended?: boolean
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          mood_tags?: string[]
          name?: string
          owner_id?: string | null
          pending_changes?: Json | null
          phone?: string | null
          price_level?: Database["public"]["Enums"]["price_level"] | null
          rejection_reason?: string | null
          review_count?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["merchant_status"]
          submitted_at?: string | null
          suitability?: string[]
          tiktok?: string | null
          transportation?: string[]
          updated_at?: string
          verification_document_url?: string | null
          verification_status?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          avg_duration_minutes?: number | null
          avg_rating?: number | null
          best_visit_time?: string[]
          branch_label?: string | null
          brand_group_id?: string | null
          categories?: Database["public"]["Enums"]["business_category"][]
          category?: Database["public"]["Enums"]["business_category"]
          city?: string | null
          claim_status?: Database["public"]["Enums"]["claim_status"]
          cover_url?: string | null
          created_at?: string
          description?: string | null
          dietary_options?: string[]
          email?: string | null
          facebook?: string | null
          features?: string[]
          id?: string
          instagram?: string | null
          is_main_branch?: boolean
          is_sponsored?: boolean | null
          is_suspended?: boolean
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          mood_tags?: string[]
          name?: string
          owner_id?: string | null
          pending_changes?: Json | null
          phone?: string | null
          price_level?: Database["public"]["Enums"]["price_level"] | null
          rejection_reason?: string | null
          review_count?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["merchant_status"]
          submitted_at?: string | null
          suitability?: string[]
          tiktok?: string | null
          transportation?: string[]
          updated_at?: string
          verification_document_url?: string | null
          verification_status?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          title: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
      }
      planner_feedback: {
        Row: {
          action: string
          category: string
          created_at: string
          id: string
          place_id: string
          tags: string[]
          user_id: string
        }
        Insert: {
          action: string
          category?: string
          created_at?: string
          id?: string
          place_id: string
          tags?: string[]
          user_id: string
        }
        Update: {
          action?: string
          category?: string
          created_at?: string
          id?: string
          place_id?: string
          tags?: string[]
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age_range: string | null
          avatar_url: string | null
          budget_preference: string | null
          created_at: string
          current_city: string | null
          dietary_preferences: string[]
          favorites: string[]
          full_name: string
          gender: string | null
          id: string
          interests: string[]
          itineraries_generated: number
          mobility_level: string | null
          nationality: string | null
          notification_preferences: Json | null
          onboarding_complete: boolean
          onboarding_completed: boolean
          phone: string
          preferred_currency: string | null
          preferred_lang: string
          theme: string | null
          travel_companion: string | null
          travel_style_prefs: Json
          travel_styles: string[]
          updated_at: string
        }
        Insert: {
          age_range?: string | null
          avatar_url?: string | null
          budget_preference?: string | null
          created_at?: string
          current_city?: string | null
          dietary_preferences?: string[]
          favorites?: string[]
          full_name?: string
          gender?: string | null
          id: string
          interests?: string[]
          itineraries_generated?: number
          mobility_level?: string | null
          nationality?: string | null
          notification_preferences?: Json | null
          onboarding_complete?: boolean
          onboarding_completed?: boolean
          phone?: string
          preferred_currency?: string | null
          preferred_lang?: string
          theme?: string | null
          travel_companion?: string | null
          travel_style_prefs?: Json
          travel_styles?: string[]
          updated_at?: string
        }
        Update: {
          age_range?: string | null
          avatar_url?: string | null
          budget_preference?: string | null
          created_at?: string
          current_city?: string | null
          dietary_preferences?: string[]
          favorites?: string[]
          full_name?: string
          gender?: string | null
          id?: string
          interests?: string[]
          itineraries_generated?: number
          mobility_level?: string | null
          nationality?: string | null
          notification_preferences?: Json | null
          onboarding_complete?: boolean
          onboarding_completed?: boolean
          phone?: string
          preferred_currency?: string | null
          preferred_lang?: string
          theme?: string | null
          travel_companion?: string | null
          travel_style_prefs?: Json
          travel_styles?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      site_hero: {
        Row: {
          font_family: string
          font_size: string
          headline: string
          headline_color: string
          id: number
          layout: Json
          subheadline: string
          updated_at: string
        }
        Insert: {
          font_family?: string
          font_size?: string
          headline?: string
          headline_color?: string
          id?: number
          layout?: Json
          subheadline?: string
          updated_at?: string
        }
        Update: {
          font_family?: string
          font_size?: string
          headline?: string
          headline_color?: string
          id?: number
          layout?: Json
          subheadline?: string
          updated_at?: string
        }
        Relationships: []
      }
      sponsorship_campaigns: {
        Row: {
          admin_note: string | null
          base_amount: number
          bonus_days: number
          confirmed_by: string | null
          created_at: string
          currency: string
          days: number
          discount_amount: number
          end_date: string
          id: string
          merchant_id: string
          offer_id: string | null
          offer_title: string | null
          owner_id: string
          paid_at: string | null
          payment_method: string | null
          payment_reference: string | null
          placements: string[]
          start_date: string
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          base_amount: number
          bonus_days?: number
          confirmed_by?: string | null
          created_at?: string
          currency: string
          days: number
          discount_amount?: number
          end_date: string
          id?: string
          merchant_id: string
          offer_id?: string | null
          offer_title?: string | null
          owner_id: string
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          placements: string[]
          start_date: string
          status?: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          base_amount?: number
          bonus_days?: number
          confirmed_by?: string | null
          created_at?: string
          currency?: string
          days?: number
          discount_amount?: number
          end_date?: string
          id?: string
          merchant_id?: string
          offer_id?: string | null
          offer_title?: string | null
          owner_id?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          placements?: string[]
          start_date?: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsorship_campaigns_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsorship_campaigns_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "sponsorship_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsorship_offers: {
        Row: {
          bonus_days: number
          code: string | null
          created_at: string
          discount_percent: number
          enabled: boolean
          ends_on: string | null
          id: string
          max_uses: number | null
          min_days: number
          starts_on: string | null
          title: string
          used_count: number
        }
        Insert: {
          bonus_days?: number
          code?: string | null
          created_at?: string
          discount_percent?: number
          enabled?: boolean
          ends_on?: string | null
          id?: string
          max_uses?: number | null
          min_days?: number
          starts_on?: string | null
          title: string
          used_count?: number
        }
        Update: {
          bonus_days?: number
          code?: string | null
          created_at?: string
          discount_percent?: number
          enabled?: boolean
          ends_on?: string | null
          id?: string
          max_uses?: number | null
          min_days?: number
          starts_on?: string | null
          title?: string
          used_count?: number
        }
        Relationships: []
      }
      sponsorship_pricing: {
        Row: {
          enabled: boolean
          label: string
          max_slots: number
          placement_key: string
          price_iqd: number
          price_usd: number
          sort_order: number
        }
        Insert: {
          enabled?: boolean
          label: string
          max_slots?: number
          placement_key: string
          price_iqd?: number
          price_usd?: number
          sort_order?: number
        }
        Update: {
          enabled?: boolean
          label?: string
          max_slots?: number
          placement_key?: string
          price_iqd?: number
          price_usd?: number
          sort_order?: number
        }
        Relationships: []
      }
      sponsorship_settings: {
        Row: {
          id: number
          payment_instructions: string
          updated_at: string
        }
        Insert: {
          id?: number
          payment_instructions?: string
          updated_at?: string
        }
        Update: {
          id?: number
          payment_instructions?: string
          updated_at?: string
        }
        Relationships: []
      }
      taxi_clicks: {
        Row: {
          business_id: string | null
          created_at: string
          id: string
          is_admin: boolean
          provider: string
          user_id: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          id?: string
          is_admin?: boolean
          provider: string
          user_id?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string
          id?: string
          is_admin?: boolean
          provider?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "taxi_clicks_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_availability: {
        Row: {
          day_of_week: number | null
          id: string
          is_fully_booked: boolean
          is_recurring: boolean
          max_bookings: number | null
          specific_date: string | null
          start_time: string | null
          tour_id: string
        }
        Insert: {
          day_of_week?: number | null
          id?: string
          is_fully_booked?: boolean
          is_recurring?: boolean
          max_bookings?: number | null
          specific_date?: string | null
          start_time?: string | null
          tour_id: string
        }
        Update: {
          day_of_week?: number | null
          id?: string
          is_fully_booked?: boolean
          is_recurring?: boolean
          max_bookings?: number | null
          specific_date?: string | null
          start_time?: string | null
          tour_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_availability_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_bookings: {
        Row: {
          adults: number
          availability_id: string | null
          children: number
          created_at: string
          email: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string
          status: string
          tour_id: string
        }
        Insert: {
          adults?: number
          availability_id?: string | null
          children?: number
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone: string
          status?: string
          tour_id: string
        }
        Update: {
          adults?: number
          availability_id?: string | null
          children?: number
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string
          status?: string
          tour_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_bookings_availability_id_fkey"
            columns: ["availability_id"]
            isOneToOne: false
            referencedRelation: "tour_availability"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_bookings_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_destinations: {
        Row: {
          arrival_time: string | null
          departure_time: string | null
          description: string
          id: string
          image_url: string | null
          latitude: number | null
          longitude: number | null
          name: string
          sort_order: number
          tour_id: string
          visit_duration_min: number | null
        }
        Insert: {
          arrival_time?: string | null
          departure_time?: string | null
          description?: string
          id?: string
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          sort_order?: number
          tour_id: string
          visit_duration_min?: number | null
        }
        Update: {
          arrival_time?: string | null
          departure_time?: string | null
          description?: string
          id?: string
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          sort_order?: number
          tour_id?: string
          visit_duration_min?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tour_destinations_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_organizers: {
        Row: {
          bio: string
          company_name: string
          contact_email: string
          contact_phone: string
          created_at: string
          id: string
          is_suspended: boolean
          logo_url: string | null
          owner_id: string
          updated_at: string
          website: string
        }
        Insert: {
          bio?: string
          company_name?: string
          contact_email?: string
          contact_phone?: string
          created_at?: string
          id?: string
          is_suspended?: boolean
          logo_url?: string | null
          owner_id: string
          updated_at?: string
          website?: string
        }
        Update: {
          bio?: string
          company_name?: string
          contact_email?: string
          contact_phone?: string
          created_at?: string
          id?: string
          is_suspended?: boolean
          logo_url?: string | null
          owner_id?: string
          updated_at?: string
          website?: string
        }
        Relationships: []
      }
      tour_photos: {
        Row: {
          caption: string
          created_at: string
          id: string
          kind: string
          sort_order: number
          tour_id: string
          url: string
        }
        Insert: {
          caption?: string
          created_at?: string
          id?: string
          kind?: string
          sort_order?: number
          tour_id: string
          url: string
        }
        Update: {
          caption?: string
          created_at?: string
          id?: string
          kind?: string
          sort_order?: number
          tour_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_photos_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tours: {
        Row: {
          accommodation_notes: string | null
          accommodation_type: string | null
          adult_price: number | null
          best_time: string[]
          booking_deadline_hours: number
          category: Database["public"]["Enums"]["tour_category"]
          child_price: number | null
          cover_url: string | null
          created_at: string
          currency: string
          destination: string
          difficulty: Database["public"]["Enums"]["tour_difficulty"]
          discount_percent: number
          duration_custom: string
          duration_type: string
          features: string[]
          full_description: string
          id: string
          included: string[]
          languages: string[]
          max_guests: number | null
          meeting_lat: number | null
          meeting_lng: number | null
          meeting_point: string
          min_guests: number | null
          mood_tags: string[]
          not_included: string[]
          organizer_id: string
          private_price: number | null
          rejection_reason: string | null
          requirements: string[]
          reviewed_at: string | null
          reviewed_by: string | null
          season: string[]
          short_description: string
          slug: string | null
          status: Database["public"]["Enums"]["tour_status"]
          submitted_at: string | null
          target_audience: string[]
          title: string
          transportation_type: string | null
          updated_at: string
          walking_distance_km: number | null
        }
        Insert: {
          accommodation_notes?: string | null
          accommodation_type?: string | null
          adult_price?: number | null
          best_time?: string[]
          booking_deadline_hours?: number
          category?: Database["public"]["Enums"]["tour_category"]
          child_price?: number | null
          cover_url?: string | null
          created_at?: string
          currency?: string
          destination?: string
          difficulty?: Database["public"]["Enums"]["tour_difficulty"]
          discount_percent?: number
          duration_custom?: string
          duration_type?: string
          features?: string[]
          full_description?: string
          id?: string
          included?: string[]
          languages?: string[]
          max_guests?: number | null
          meeting_lat?: number | null
          meeting_lng?: number | null
          meeting_point?: string
          min_guests?: number | null
          mood_tags?: string[]
          not_included?: string[]
          organizer_id: string
          private_price?: number | null
          rejection_reason?: string | null
          requirements?: string[]
          reviewed_at?: string | null
          reviewed_by?: string | null
          season?: string[]
          short_description?: string
          slug?: string | null
          status?: Database["public"]["Enums"]["tour_status"]
          submitted_at?: string | null
          target_audience?: string[]
          title?: string
          transportation_type?: string | null
          updated_at?: string
          walking_distance_km?: number | null
        }
        Update: {
          accommodation_notes?: string | null
          accommodation_type?: string | null
          adult_price?: number | null
          best_time?: string[]
          booking_deadline_hours?: number
          category?: Database["public"]["Enums"]["tour_category"]
          child_price?: number | null
          cover_url?: string | null
          created_at?: string
          currency?: string
          destination?: string
          difficulty?: Database["public"]["Enums"]["tour_difficulty"]
          discount_percent?: number
          duration_custom?: string
          duration_type?: string
          features?: string[]
          full_description?: string
          id?: string
          included?: string[]
          languages?: string[]
          max_guests?: number | null
          meeting_lat?: number | null
          meeting_lng?: number | null
          meeting_point?: string
          min_guests?: number | null
          mood_tags?: string[]
          not_included?: string[]
          organizer_id?: string
          private_price?: number | null
          rejection_reason?: string | null
          requirements?: string[]
          reviewed_at?: string | null
          reviewed_by?: string | null
          season?: string[]
          short_description?: string
          slug?: string | null
          status?: Database["public"]["Enums"]["tour_status"]
          submitted_at?: string | null
          target_audience?: string[]
          title?: string
          transportation_type?: string | null
          updated_at?: string
          walking_distance_km?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tours_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "tour_organizers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_favorites: {
        Row: {
          created_at: string
          id: string
          merchant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          merchant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          merchant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorites_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_itineraries: {
        Row: {
          created_at: string | null
          id: string
          is_public: boolean | null
          plan_data: Json
          summary: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_public?: boolean | null
          plan_data: Json
          summary?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_public?: boolean | null
          plan_data?: Json
          summary?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_reports: {
        Row: {
          created_at: string
          id: string
          merchant_id: string | null
          message: string
          reporter_email: string | null
          reporter_id: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          merchant_id?: string | null
          message: string
          reporter_email?: string | null
          reporter_id?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          merchant_id?: string | null
          message?: string
          reporter_email?: string | null
          reporter_id?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_reports_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _sponsorship_check_capacity: {
        Args: { p_end: string; p_placements: string[]; p_start: string }
        Returns: undefined
      }
      _sponsorship_quote: {
        Args: {
          p_code: string
          p_currency: string
          p_days: number
          p_placements: string[]
          p_start: string
        }
        Returns: Json
      }
      active_sponsored: {
        Args: { p_limit?: number; p_placement: string }
        Returns: {
          ends_on: string
          merchant_id: string
        }[]
      }
      admin_link_merchant_as_branch: {
        Args: {
          p_branch_id: string
          p_branch_label?: string
          p_main_id: string
        }
        Returns: string
      }
      admin_review_sponsorship: {
        Args: {
          p_action: string
          p_id: string
          p_method?: string
          p_note?: string
          p_reference?: string
        }
        Returns: undefined
      }
      admin_unlink_merchant_branch: {
        Args: { p_branch_id: string }
        Returns: undefined
      }
      approve_merchant_claim:
        | { Args: { p_claim_id: string }; Returns: undefined }
        | {
            Args: { p_admin_id: string; p_claim_id: string }
            Returns: undefined
          }
      cancel_my_sponsorship: { Args: { p_id: string }; Returns: undefined }
      delete_user_account: { Args: never; Returns: undefined }
      erbil_today: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      invite_itinerary_collaborator: {
        Args: { p_itinerary_id: string; p_role?: string; p_user_id: string }
        Returns: {
          accepted_at: string | null
          created_at: string
          id: string
          invited_by: string
          itinerary_id: string
          role: string
          status: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "itinerary_collaborators"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      is_accepted_itinerary_collaborator: {
        Args: { p_itinerary_id: string; p_user_id?: string }
        Returns: boolean
      }
      is_itinerary_owner: {
        Args: { p_itinerary_id: string; p_user_id?: string }
        Returns: boolean
      }
      itinerary_can_edit: { Args: { p_itinerary: string }; Returns: boolean }
      itinerary_can_view: { Args: { p_itinerary: string }; Returns: boolean }
      link_merchant_as_branch: {
        Args: {
          p_branch_id: string
          p_branch_label?: string
          p_main_id: string
        }
        Returns: string
      }
      list_itinerary_collaborators: {
        Args: { p_itinerary_id: string }
        Returns: {
          accepted_at: string
          avatar_url: string
          created_at: string
          full_name: string
          id: string
          invited_by: string
          itinerary_id: string
          role: string
          status: string
          updated_at: string
          user_id: string
        }[]
      }
      list_my_itinerary_invitations: {
        Args: never
        Returns: {
          accepted_at: string
          created_at: string
          id: string
          itinerary_id: string
          owner_id: string
          owner_name: string
          plan_summary: string
          plan_title: string
          role: string
          status: string
        }[]
      }
      quote_sponsorship: {
        Args: {
          p_code?: string
          p_currency: string
          p_days: number
          p_merchant: string
          p_placements: string[]
          p_start: string
        }
        Returns: Json
      }
      record_taxi_click: {
        Args: { p_business_id: string; p_provider: string }
        Returns: string
      }
      reject_merchant_claim: {
        Args: { p_claim_id: string; p_reason: string }
        Returns: undefined
      }
      remove_itinerary_collaborator: {
        Args: { p_collaborator_id: string }
        Returns: boolean
      }
      request_sponsorship: {
        Args: {
          p_code?: string
          p_currency: string
          p_days: number
          p_merchant: string
          p_placements: string[]
          p_start: string
        }
        Returns: string
      }
      respond_to_itinerary_invitation: {
        Args: { p_accept: boolean; p_collaborator_id: string }
        Returns: {
          accepted_at: string | null
          created_at: string
          id: string
          invited_by: string
          itinerary_id: string
          role: string
          status: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "itinerary_collaborators"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      revert_merchant_approval: {
        Args: { p_history_id: string }
        Returns: undefined
      }
      search_itinerary_profiles: {
        Args: { search_query: string }
        Returns: {
          avatar_url: string
          full_name: string
          id: string
        }[]
      }
      unlink_merchant_branch: {
        Args: { p_branch_id: string }
        Returns: undefined
      }
      update_itinerary_collaborator_role: {
        Args: { p_collaborator_id: string; p_role: string }
        Returns: {
          accepted_at: string | null
          created_at: string
          id: string
          invited_by: string
          itinerary_id: string
          role: string
          status: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "itinerary_collaborators"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "admin" | "merchant" | "user" | "tour_organizer"
      business_category:
        | "restaurant"
        | "cafe"
        | "hotel"
        | "attraction"
        | "shop"
        | "activity"
        | "other"
      claim_status: "unclaimed" | "pending_claim" | "claimed"
      merchant_status: "draft" | "pending" | "approved" | "rejected"
      notification_type:
        | "merchant_pending"
        | "merchant_approved"
        | "merchant_rejected"
        | "tour_pending"
        | "tour_approved"
        | "tour_rejected"
        | "general"
      price_level: "$" | "$$" | "$$$" | "$$$$"
      tour_category:
        | "city"
        | "historical"
        | "nature"
        | "adventure"
        | "food"
        | "night"
        | "photography"
        | "family"
        | "luxury"
        | "shopping"
        | "religious"
        | "custom"
      tour_difficulty: "easy" | "moderate" | "hard"
      tour_status: "draft" | "pending" | "approved" | "rejected"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["admin", "merchant", "user", "tour_organizer"],
      business_category: [
        "restaurant",
        "cafe",
        "hotel",
        "attraction",
        "shop",
        "activity",
        "other",
      ],
      claim_status: ["unclaimed", "pending_claim", "claimed"],
      merchant_status: ["draft", "pending", "approved", "rejected"],
      notification_type: [
        "merchant_pending",
        "merchant_approved",
        "merchant_rejected",
        "tour_pending",
        "tour_approved",
        "tour_rejected",
        "general",
      ],
      price_level: ["$", "$$", "$$$", "$$$$"],
      tour_category: [
        "city",
        "historical",
        "nature",
        "adventure",
        "food",
        "night",
        "photography",
        "family",
        "luxury",
        "shopping",
        "religious",
        "custom",
      ],
      tour_difficulty: ["easy", "moderate", "hard"],
      tour_status: ["draft", "pending", "approved", "rejected"],
    },
  },
} as const
