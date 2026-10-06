
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "app_config": {
                  Row: {
                    "key": string,"note": string | null,"value": NonNullable<Json>
                  }
                  Insert: {
                    "key": string,"note"?: string | null,"value": NonNullable<Json>
                  }
                  Update: {
                    "key"?: string,"note"?: string | null,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"bucket_photos": {
                  Row: {
                    "bucket_id": string,"created_at": string | null,"height": number | null,"id": string,"size_bytes": number,"storage_path": string,"thumb_path": string | null,"thumb_size_bytes": number | null,"user_id": string,"width": number | null
                  }
                  Insert: {
                    "bucket_id": string,"created_at"?: string | null,"height"?: number | null,"id"?: string,"size_bytes": number,"storage_path": string,"thumb_path"?: string | null,"thumb_size_bytes"?: number | null,"user_id": string,"width"?: number | null
                  }
                  Update: {
                    "bucket_id"?: string,"created_at"?: string | null,"height"?: number | null,"id"?: string,"size_bytes"?: number,"storage_path"?: string,"thumb_path"?: string | null,"thumb_size_bytes"?: number | null,"user_id"?: string,"width"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "bucket_photos_bucket_id_fkey"
      columns: ["bucket_id"]
isOneToOne: false
      referencedRelation: "buckets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bucket_photos_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"buckets": {
                  Row: {
                    "category_id": string | null,"completed_at": string | null,"copied_from_id": string | null,"copied_from_user_id": string | null,"created_at": string | null,"deadline": string | null,"description": string | null,"id": string,"location_lat": number | null,"location_lng": number | null,"location_text": string | null,"status": string | null,"template_id": string | null,"title": string,"updated_at": string | null,"user_id": string,"visibility": string | null
                  }
                  Insert: {
                    "category_id"?: string | null,"completed_at"?: string | null,"copied_from_id"?: string | null,"copied_from_user_id"?: string | null,"created_at"?: string | null,"deadline"?: string | null,"description"?: string | null,"id"?: string,"location_lat"?: number | null,"location_lng"?: number | null,"location_text"?: string | null,"status"?: string | null,"template_id"?: string | null,"title": string,"updated_at"?: string | null,"user_id": string,"visibility"?: string | null
                  }
                  Update: {
                    "category_id"?: string | null,"completed_at"?: string | null,"copied_from_id"?: string | null,"copied_from_user_id"?: string | null,"created_at"?: string | null,"deadline"?: string | null,"description"?: string | null,"id"?: string,"location_lat"?: number | null,"location_lng"?: number | null,"location_text"?: string | null,"status"?: string | null,"template_id"?: string | null,"title"?: string,"updated_at"?: string | null,"user_id"?: string,"visibility"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "buckets_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "buckets_copied_from_id_fkey"
      columns: ["copied_from_id"]
isOneToOne: false
      referencedRelation: "buckets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "buckets_copied_from_user_id_fkey"
      columns: ["copied_from_user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "buckets_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "templates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "buckets_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"categories": {
                  Row: {
                    "color": string,"icon": string,"id": string,"name_en": string,"name_es": string,"slug": string
                  }
                  Insert: {
                    "color": string,"icon": string,"id"?: string,"name_en": string,"name_es": string,"slug": string
                  }
                  Update: {
                    "color"?: string,"icon"?: string,"id"?: string,"name_en"?: string,"name_es"?: string,"slug"?: string
                  }
                  Relationships: [
                    
                  ]
                },"comments": {
                  Row: {
                    "body": string,"bucket_id": string,"created_at": string | null,"id": string,"updated_at": string | null,"user_id": string
                  }
                  Insert: {
                    "body": string,"bucket_id": string,"created_at"?: string | null,"id"?: string,"updated_at"?: string | null,"user_id": string
                  }
                  Update: {
                    "body"?: string,"bucket_id"?: string,"created_at"?: string | null,"id"?: string,"updated_at"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "comments_bucket_id_fkey"
      columns: ["bucket_id"]
isOneToOne: false
      referencedRelation: "buckets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comments_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"feed_events": {
                  Row: {
                    "actor_id": string,"bucket_id": string | null,"created_at": string | null,"id": string,"type": string | null
                  }
                  Insert: {
                    "actor_id": string,"bucket_id"?: string | null,"created_at"?: string | null,"id"?: string,"type"?: string | null
                  }
                  Update: {
                    "actor_id"?: string,"bucket_id"?: string | null,"created_at"?: string | null,"id"?: string,"type"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "feed_events_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "feed_events_bucket_id_fkey"
      columns: ["bucket_id"]
isOneToOne: false
      referencedRelation: "buckets"
      referencedColumns: ["id"]
    }
                  ]
                },"follows": {
                  Row: {
                    "created_at": string | null,"follower_id": string,"following_id": string,"status": string | null
                  }
                  Insert: {
                    "created_at"?: string | null,"follower_id": string,"following_id": string,"status"?: string | null
                  }
                  Update: {
                    "created_at"?: string | null,"follower_id"?: string,"following_id"?: string,"status"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "follows_follower_id_fkey"
      columns: ["follower_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "follows_following_id_fkey"
      columns: ["following_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"item_subtasks": {
                  Row: {
                    "bucket_id": string,"created_at": string | null,"done": boolean | null,"id": string,"position": number | null,"title": string
                  }
                  Insert: {
                    "bucket_id": string,"created_at"?: string | null,"done"?: boolean | null,"id"?: string,"position"?: number | null,"title": string
                  }
                  Update: {
                    "bucket_id"?: string,"created_at"?: string | null,"done"?: boolean | null,"id"?: string,"position"?: number | null,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "item_subtasks_bucket_id_fkey"
      columns: ["bucket_id"]
isOneToOne: false
      referencedRelation: "buckets"
      referencedColumns: ["id"]
    }
                  ]
                },"notification_prefs": {
                  Row: {
                    "comment_push": boolean | null,"deadline_push": boolean | null,"follow_push": boolean | null,"friend_completed_push": boolean | null,"quiet_end": string | null,"quiet_start": string | null,"reaction_push": boolean | null,"updated_at": string | null,"user_id": string
                  }
                  Insert: {
                    "comment_push"?: boolean | null,"deadline_push"?: boolean | null,"follow_push"?: boolean | null,"friend_completed_push"?: boolean | null,"quiet_end"?: string | null,"quiet_start"?: string | null,"reaction_push"?: boolean | null,"updated_at"?: string | null,"user_id": string
                  }
                  Update: {
                    "comment_push"?: boolean | null,"deadline_push"?: boolean | null,"follow_push"?: boolean | null,"friend_completed_push"?: boolean | null,"quiet_end"?: string | null,"quiet_start"?: string | null,"reaction_push"?: boolean | null,"updated_at"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notification_prefs_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "actor_id": string | null,"bucket_id": string | null,"comment_id": string | null,"created_at": string | null,"id": string,"is_read": boolean | null,"recipient_id": string,"type": string
                  }
                  Insert: {
                    "actor_id"?: string | null,"bucket_id"?: string | null,"comment_id"?: string | null,"created_at"?: string | null,"id"?: string,"is_read"?: boolean | null,"recipient_id": string,"type": string
                  }
                  Update: {
                    "actor_id"?: string | null,"bucket_id"?: string | null,"comment_id"?: string | null,"created_at"?: string | null,"id"?: string,"is_read"?: boolean | null,"recipient_id"?: string,"type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_bucket_id_fkey"
      columns: ["bucket_id"]
isOneToOne: false
      referencedRelation: "buckets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_comment_id_fkey"
      columns: ["comment_id"]
isOneToOne: false
      referencedRelation: "comments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_recipient_id_fkey"
      columns: ["recipient_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_url": string | null,"bio": string | null,"created_at": string | null,"display_name": string | null,"id": string,"storage_used_bytes": number | null,"updated_at": string | null,"username": string,"visibility": string | null
                  }
                  Insert: {
                    "avatar_url"?: string | null,"bio"?: string | null,"created_at"?: string | null,"display_name"?: string | null,"id": string,"storage_used_bytes"?: number | null,"updated_at"?: string | null,"username": string,"visibility"?: string | null
                  }
                  Update: {
                    "avatar_url"?: string | null,"bio"?: string | null,"created_at"?: string | null,"display_name"?: string | null,"id"?: string,"storage_used_bytes"?: number | null,"updated_at"?: string | null,"username"?: string,"visibility"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"push_tokens": {
                  Row: {
                    "created_at": string | null,"id": string,"platform": string | null,"token": string,"user_id": string
                  }
                  Insert: {
                    "created_at"?: string | null,"id"?: string,"platform"?: string | null,"token": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string | null,"id"?: string,"platform"?: string | null,"token"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "push_tokens_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"reactions": {
                  Row: {
                    "bucket_id": string,"created_at": string | null,"emoji": string,"id": string,"user_id": string
                  }
                  Insert: {
                    "bucket_id": string,"created_at"?: string | null,"emoji": string,"id"?: string,"user_id": string
                  }
                  Update: {
                    "bucket_id"?: string,"created_at"?: string | null,"emoji"?: string,"id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reactions_bucket_id_fkey"
      columns: ["bucket_id"]
isOneToOne: false
      referencedRelation: "buckets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reactions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"reports": {
                  Row: {
                    "bucket_id": string | null,"comment_id": string | null,"created_at": string | null,"id": string,"reason": string,"reporter_id": string,"resolved": boolean | null
                  }
                  Insert: {
                    "bucket_id"?: string | null,"comment_id"?: string | null,"created_at"?: string | null,"id"?: string,"reason": string,"reporter_id": string,"resolved"?: boolean | null
                  }
                  Update: {
                    "bucket_id"?: string | null,"comment_id"?: string | null,"created_at"?: string | null,"id"?: string,"reason"?: string,"reporter_id"?: string,"resolved"?: boolean | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "reports_bucket_id_fkey"
      columns: ["bucket_id"]
isOneToOne: false
      referencedRelation: "buckets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_comment_id_fkey"
      columns: ["comment_id"]
isOneToOne: false
      referencedRelation: "comments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"shared_list_members": {
                  Row: {
                    "list_id": string,"role": string | null,"user_id": string
                  }
                  Insert: {
                    "list_id": string,"role"?: string | null,"user_id": string
                  }
                  Update: {
                    "list_id"?: string,"role"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "shared_list_members_list_id_fkey"
      columns: ["list_id"]
isOneToOne: false
      referencedRelation: "shared_lists"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shared_list_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"shared_lists": {
                  Row: {
                    "created_at": string | null,"description": string | null,"id": string,"name": string,"owner_id": string,"visibility": string | null
                  }
                  Insert: {
                    "created_at"?: string | null,"description"?: string | null,"id"?: string,"name": string,"owner_id": string,"visibility"?: string | null
                  }
                  Update: {
                    "created_at"?: string | null,"description"?: string | null,"id"?: string,"name"?: string,"owner_id"?: string,"visibility"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "shared_lists_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"templates": {
                  Row: {
                    "category_id": string | null,"created_at": string | null,"creator_id": string | null,"description": string | null,"id": string,"is_official": boolean | null,"title": string,"use_count": number | null
                  }
                  Insert: {
                    "category_id"?: string | null,"created_at"?: string | null,"creator_id"?: string | null,"description"?: string | null,"id"?: string,"is_official"?: boolean | null,"title": string,"use_count"?: number | null
                  }
                  Update: {
                    "category_id"?: string | null,"created_at"?: string | null,"creator_id"?: string | null,"description"?: string | null,"id"?: string,"is_official"?: boolean | null,"title"?: string,"use_count"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "templates_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "templates_creator_id_fkey"
      columns: ["creator_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "is_following":
{ Args: { "target_user_id": string }; Returns: boolean
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
