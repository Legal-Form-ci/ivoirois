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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_media: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          media_types: string[] | null
          media_urls: string[] | null
          section_key: string
          section_name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          media_types?: string[] | null
          media_urls?: string[] | null
          section_key: string
          section_name: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          media_types?: string[] | null
          media_urls?: string[] | null
          section_key?: string
          section_name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      call_signals: {
        Row: {
          callee_id: string
          caller_id: string
          conversation_id: string | null
          created_at: string
          id: string
          signal_data: Json | null
          signal_type: string
        }
        Insert: {
          callee_id: string
          caller_id: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          signal_data?: Json | null
          signal_type: string
        }
        Update: {
          callee_id?: string
          caller_id?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          signal_data?: Json | null
          signal_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_signals_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      certifications: {
        Row: {
          badge_type: string
          company_id: string | null
          expires_at: string | null
          id: string
          issued_at: string
          issued_by: string
          status: string | null
          user_id: string | null
        }
        Insert: {
          badge_type: string
          company_id?: string | null
          expires_at?: string | null
          id?: string
          issued_at?: string
          issued_by: string
          status?: string | null
          user_id?: string | null
        }
        Update: {
          badge_type?: string
          company_id?: string | null
          expires_at?: string | null
          id?: string
          issued_at?: string
          issued_by?: string
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          city: string | null
          commerce_registry: string | null
          cover_image: string | null
          created_at: string
          created_by: string
          description: string | null
          email: string | null
          founded_year: number | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          region: string | null
          sector: string | null
          size: string | null
          updated_at: string
          verified: boolean | null
          verified_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          commerce_registry?: string | null
          cover_image?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          email?: string | null
          founded_year?: number | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          region?: string | null
          sector?: string | null
          size?: string | null
          updated_at?: string
          verified?: boolean | null
          verified_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          commerce_registry?: string | null
          cover_image?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          email?: string | null
          founded_year?: number | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          region?: string | null
          sector?: string | null
          size?: string | null
          updated_at?: string
          verified?: boolean | null
          verified_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      content_recommendations: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          id: string
          is_viewed: boolean | null
          reason: string | null
          score: number
          user_id: string
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          id?: string
          is_viewed?: boolean | null
          reason?: string | null
          score: number
          user_id: string
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          id?: string
          is_viewed?: boolean | null
          reason?: string | null
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_recommendations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      event_attendees: {
        Row: {
          created_at: string
          event_id: string
          id: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          category: string | null
          cover_image: string | null
          created_at: string
          created_by: string
          description: string | null
          end_date: string | null
          event_url: string | null
          id: string
          location: string | null
          location_type: string | null
          max_attendees: number | null
          privacy: string | null
          start_date: string
          timezone: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          cover_image?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          end_date?: string | null
          event_url?: string | null
          id?: string
          location?: string | null
          location_type?: string | null
          max_attendees?: number | null
          privacy?: string | null
          start_date: string
          timezone?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          cover_image?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string | null
          event_url?: string | null
          id?: string
          location?: string | null
          location_type?: string | null
          max_attendees?: number | null
          privacy?: string | null
          start_date?: string
          timezone?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          status: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_messages: {
        Row: {
          content: string
          created_at: string
          group_id: string
          id: string
          media_type: string | null
          media_url: string | null
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          group_id: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          group_id?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          cover_image: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          privacy: string
          updated_at: string
        }
        Insert: {
          cover_image?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          privacy?: string
          updated_at?: string
        }
        Update: {
          cover_image?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          privacy?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_applications: {
        Row: {
          cover_letter: string | null
          created_at: string
          id: string
          job_id: string
          resume_url: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          cover_letter?: string | null
          created_at?: string
          id?: string
          job_id: string
          resume_url?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          cover_letter?: string | null
          created_at?: string
          id?: string
          job_id?: string
          resume_url?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      job_posts: {
        Row: {
          application_email: string | null
          application_url: string | null
          applications_count: number | null
          benefits: string | null
          company_id: string
          created_at: string
          created_by: string
          deadline: string | null
          description: string
          experience_level: string | null
          id: string
          job_type: string
          location: string | null
          remote_option: string | null
          requirements: string | null
          responsibilities: string | null
          salary_range: string | null
          status: string | null
          title: string
          updated_at: string
          views_count: number | null
        }
        Insert: {
          application_email?: string | null
          application_url?: string | null
          applications_count?: number | null
          benefits?: string | null
          company_id: string
          created_at?: string
          created_by: string
          deadline?: string | null
          description: string
          experience_level?: string | null
          id?: string
          job_type?: string
          location?: string | null
          remote_option?: string | null
          requirements?: string | null
          responsibilities?: string | null
          salary_range?: string | null
          status?: string | null
          title: string
          updated_at?: string
          views_count?: number | null
        }
        Update: {
          application_email?: string | null
          application_url?: string | null
          applications_count?: number | null
          benefits?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          deadline?: string | null
          description?: string
          experience_level?: string | null
          id?: string
          job_type?: string
          location?: string | null
          remote_option?: string | null
          requirements?: string | null
          responsibilities?: string | null
          salary_range?: string | null
          status?: string | null
          title?: string
          updated_at?: string
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "job_posts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      live_stream_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          is_pinned: boolean | null
          stream_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          stream_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          stream_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_stream_comments_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_stream_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      live_streams: {
        Row: {
          created_at: string
          description: string | null
          ended_at: string | null
          host_id: string
          id: string
          peak_viewers: number | null
          privacy: string | null
          scheduled_at: string | null
          started_at: string | null
          status: string | null
          stream_key: string | null
          thumbnail_url: string | null
          title: string
          viewers_count: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          ended_at?: string | null
          host_id: string
          id?: string
          peak_viewers?: number | null
          privacy?: string | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string | null
          stream_key?: string | null
          thumbnail_url?: string | null
          title: string
          viewers_count?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          ended_at?: string | null
          host_id?: string
          id?: string
          peak_viewers?: number | null
          privacy?: string | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string | null
          stream_key?: string | null
          thumbnail_url?: string | null
          title?: string
          viewers_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "live_streams_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_favorites: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_favorites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_listings: {
        Row: {
          category: string
          condition: string | null
          created_at: string
          currency: string | null
          delivery_available: boolean | null
          description: string | null
          id: string
          images: string[] | null
          is_negotiable: boolean | null
          location: string | null
          price: number
          region: string | null
          seller_id: string
          status: string | null
          title: string
          updated_at: string
          views_count: number | null
        }
        Insert: {
          category: string
          condition?: string | null
          created_at?: string
          currency?: string | null
          delivery_available?: boolean | null
          description?: string | null
          id?: string
          images?: string[] | null
          is_negotiable?: boolean | null
          location?: string | null
          price: number
          region?: string | null
          seller_id: string
          status?: string | null
          title: string
          updated_at?: string
          views_count?: number | null
        }
        Update: {
          category?: string
          condition?: string | null
          created_at?: string
          currency?: string | null
          delivery_available?: boolean | null
          description?: string | null
          id?: string
          images?: string[] | null
          is_negotiable?: boolean | null
          location?: string | null
          price?: number
          region?: string | null
          seller_id?: string
          status?: string | null
          title?: string
          updated_at?: string
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mentions: {
        Row: {
          comment_id: string | null
          created_at: string
          id: string
          mentioned_user_id: string
          mentioner_id: string
          post_id: string | null
        }
        Insert: {
          comment_id?: string | null
          created_at?: string
          id?: string
          mentioned_user_id: string
          mentioner_id: string
          post_id?: string | null
        }
        Update: {
          comment_id?: string | null
          created_at?: string
          id?: string
          mentioned_user_id?: string
          mentioner_id?: string
          post_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentions_mentioned_user_id_fkey"
            columns: ["mentioned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentions_mentioner_id_fkey"
            columns: ["mentioner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      message_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          message_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          message_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string
          id: string
          message_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          reaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          delivered_at: string | null
          id: string
          read: boolean
          read_at: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          read?: boolean
          read_at?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          read?: boolean
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          content: string
          created_at: string
          from_user_id: string | null
          id: string
          post_id: string | null
          read: boolean
          type: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          from_user_id?: string | null
          id?: string
          post_id?: string | null
          read?: boolean
          type: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          from_user_id?: string | null
          id?: string
          post_id?: string | null
          read?: boolean
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      page_followers: {
        Row: {
          followed_at: string
          id: string
          page_id: string
          user_id: string
        }
        Insert: {
          followed_at?: string
          id?: string
          page_id: string
          user_id: string
        }
        Update: {
          followed_at?: string
          id?: string
          page_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_followers_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_followers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          category: string | null
          cover_image: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          profile_image: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          category?: string | null
          cover_image?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          profile_image?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          category?: string | null
          cover_image?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          profile_image?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_options: {
        Row: {
          created_at: string
          id: string
          option_text: string
          poll_id: string
          position: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          option_text: string
          poll_id: string
          position?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          option_text?: string
          poll_id?: string
          position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          created_at: string
          id: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_id?: string
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          created_at: string
          created_by: string
          ends_at: string
          id: string
          is_multiple_choice: boolean | null
          post_id: string | null
          question: string
        }
        Insert: {
          created_at?: string
          created_by: string
          ends_at: string
          id?: string
          is_multiple_choice?: boolean | null
          post_id?: string | null
          question: string
        }
        Update: {
          created_at?: string
          created_by?: string
          ends_at?: string
          id?: string
          is_multiple_choice?: boolean | null
          post_id?: string | null
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "polls_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "polls_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_templates: {
        Row: {
          category: string | null
          content: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          usage_count: number | null
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          usage_count?: number | null
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          usage_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "post_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          content: string
          created_at: string
          hashtags: string[] | null
          hook: string | null
          id: string
          image_url: string | null
          is_scheduled: boolean | null
          links: string[] | null
          media_types: string[] | null
          media_urls: string[] | null
          scheduled_at: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          hashtags?: string[] | null
          hook?: string | null
          id?: string
          image_url?: string | null
          is_scheduled?: boolean | null
          links?: string[] | null
          media_types?: string[] | null
          media_urls?: string[] | null
          scheduled_at?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          hashtags?: string[] | null
          hook?: string | null
          id?: string
          image_url?: string | null
          is_scheduled?: boolean | null
          links?: string[] | null
          media_types?: string[] | null
          media_urls?: string[] | null
          scheduled_at?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          education_level: string | null
          experience_level: string | null
          full_name: string
          id: string
          interests: string[] | null
          is_online: boolean | null
          last_seen: string | null
          location: string | null
          marital_status: string | null
          phone_number: string | null
          position: string | null
          profession: string | null
          region: string | null
          religion: string | null
          sector: string | null
          updated_at: string
          username: string
          years_of_experience: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          education_level?: string | null
          experience_level?: string | null
          full_name: string
          id: string
          interests?: string[] | null
          is_online?: boolean | null
          last_seen?: string | null
          location?: string | null
          marital_status?: string | null
          phone_number?: string | null
          position?: string | null
          profession?: string | null
          region?: string | null
          religion?: string | null
          sector?: string | null
          updated_at?: string
          username: string
          years_of_experience?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          education_level?: string | null
          experience_level?: string | null
          full_name?: string
          id?: string
          interests?: string[] | null
          is_online?: boolean | null
          last_seen?: string | null
          location?: string | null
          marital_status?: string | null
          phone_number?: string | null
          position?: string | null
          profession?: string | null
          region?: string | null
          religion?: string | null
          sector?: string | null
          updated_at?: string
          username?: string
          years_of_experience?: number | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      reactions: {
        Row: {
          created_at: string
          id: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          reaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reel_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          reel_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          reel_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          reel_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reel_comments_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reel_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reel_likes: {
        Row: {
          created_at: string
          id: string
          reel_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reel_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reel_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reel_likes_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reel_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reels: {
        Row: {
          caption: string | null
          comments_count: number | null
          created_at: string
          duration: number | null
          hashtags: string[] | null
          id: string
          is_public: boolean | null
          likes_count: number | null
          music_title: string | null
          music_url: string | null
          thumbnail_url: string | null
          updated_at: string
          user_id: string
          video_url: string
          views_count: number | null
        }
        Insert: {
          caption?: string | null
          comments_count?: number | null
          created_at?: string
          duration?: number | null
          hashtags?: string[] | null
          id?: string
          is_public?: boolean | null
          likes_count?: number | null
          music_title?: string | null
          music_url?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
          video_url: string
          views_count?: number | null
        }
        Update: {
          caption?: string | null
          comments_count?: number | null
          created_at?: string
          duration?: number | null
          hashtags?: string[] | null
          id?: string
          is_public?: boolean | null
          likes_count?: number | null
          music_title?: string | null
          music_url?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
          video_url?: string
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reels_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          description: string | null
          id: string
          reason: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Relationships: []
      }
      resumes: {
        Row: {
          certifications: Json | null
          created_at: string
          education: Json | null
          experience: Json | null
          id: string
          interests: string[] | null
          is_primary: boolean | null
          is_public: boolean | null
          languages: Json | null
          projects: Json | null
          skills: string[] | null
          summary: string | null
          title: string
          updated_at: string
          user_id: string
          user_references: string | null
        }
        Insert: {
          certifications?: Json | null
          created_at?: string
          education?: Json | null
          experience?: Json | null
          id?: string
          interests?: string[] | null
          is_primary?: boolean | null
          is_public?: boolean | null
          languages?: Json | null
          projects?: Json | null
          skills?: string[] | null
          summary?: string | null
          title: string
          updated_at?: string
          user_id: string
          user_references?: string | null
        }
        Update: {
          certifications?: Json | null
          created_at?: string
          education?: Json | null
          experience?: Json | null
          id?: string
          interests?: string[] | null
          is_primary?: boolean | null
          is_public?: boolean | null
          languages?: Json | null
          projects?: Json | null
          skills?: string[] | null
          summary?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          user_references?: string | null
        }
        Relationships: []
      }
      scheduled_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          media_type: string | null
          media_url: string | null
          scheduled_at: string
          sender_id: string
          status: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          scheduled_at: string
          sender_id: string
          status?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          scheduled_at?: string
          sender_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_posts: {
        Row: {
          content: string
          created_at: string
          hashtags: string[] | null
          hook: string | null
          id: string
          links: string[] | null
          media_types: string[] | null
          media_urls: string[] | null
          scheduled_at: string
          status: string | null
          title: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          hashtags?: string[] | null
          hook?: string | null
          id?: string
          links?: string[] | null
          media_types?: string[] | null
          media_urls?: string[] | null
          scheduled_at: string
          status?: string | null
          title?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          hashtags?: string[] | null
          hook?: string | null
          id?: string
          links?: string[] | null
          media_types?: string[] | null
          media_urls?: string[] | null
          scheduled_at?: string
          status?: string | null
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stories: {
        Row: {
          content: string | null
          created_at: string
          expires_at: string
          id: string
          media_type: string
          media_url: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          media_type: string
          media_url: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          media_type?: string
          media_url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      story_views: {
        Row: {
          id: string
          story_id: string
          viewed_at: string
          viewer_id: string
        }
        Insert: {
          id?: string
          story_id: string
          viewed_at?: string
          viewer_id: string
        }
        Update: {
          id?: string
          story_id?: string
          viewed_at?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      translations: {
        Row: {
          context: string | null
          created_at: string | null
          id: string
          key: string
          language_code: string
          updated_at: string | null
          value: string
        }
        Insert: {
          context?: string | null
          created_at?: string | null
          id?: string
          key: string
          language_code: string
          updated_at?: string | null
          value: string
        }
        Update: {
          context?: string | null
          created_at?: string | null
          id?: string
          key?: string
          language_code?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      typing_indicators: {
        Row: {
          conversation_id: string | null
          group_id: string | null
          id: string
          is_typing: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          conversation_id?: string | null
          group_id?: string | null
          id?: string
          is_typing?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string | null
          group_id?: string | null
          id?: string
          is_typing?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "typing_indicators_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "typing_indicators_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      user_interactions: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          id: string
          interaction_type: string
          user_id: string
          weight: number | null
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          id?: string
          interaction_type: string
          user_id: string
          weight?: number | null
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          id?: string
          interaction_type?: string
          user_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_interactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      voice_messages: {
        Row: {
          audio_url: string
          created_at: string
          duration: number | null
          id: string
          message_id: string
          transcription: string | null
        }
        Insert: {
          audio_url: string
          created_at?: string
          duration?: number | null
          id?: string
          message_id: string
          transcription?: string | null
        }
        Update: {
          audio_url?: string
          created_at?: string
          duration?: number | null
          id?: string
          message_id?: string
          transcription?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voice_messages_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_friends_with_status: {
        Args: { p_user_id: string }
        Returns: {
          avatar_url: string
          friend_id: string
          full_name: string
          is_online: boolean
          last_seen: string
          username: string
        }[]
      }
      get_personalized_feed: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          author_avatar: string
          author_id: string
          author_name: string
          comments_count: number
          content: string
          created_at: string
          hook: string
          likes_count: number
          media_urls: string[]
          post_id: string
          relevance_score: number
          title: string
        }[]
      }
      get_platform_stats: {
        Args: never
        Returns: {
          active_users_today: number
          posts_today: number
          total_companies: number
          total_jobs: number
          total_posts: number
          total_users: number
        }[]
      }
      get_translation: {
        Args: { p_key: string; p_lang?: string }
        Returns: string
      }
      get_unread_count: { Args: { p_user_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      record_interaction: {
        Args: {
          p_content_id: string
          p_content_type: string
          p_interaction_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      search_content: {
        Args: { p_query: string; p_type?: string }
        Returns: {
          created_at: string
          description: string
          image_url: string
          result_id: string
          result_type: string
          title: string
        }[]
      }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "moderator" | "user"
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
      app_role: ["super_admin", "admin", "moderator", "user"],
    },
  },
} as const
