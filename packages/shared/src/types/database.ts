
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
            "album_items": {
                  Row: {
                    "album_id": string,"bucket_id": string,"position": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "album_id": string,"bucket_id": string,"position"?: number | null
                  }
                  Update: {
                    "album_id"?: string,"bucket_id"?: string,"position"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "album_items_album_id_fkey"
      columns: ["album_id"]
isOneToOne: false
      referencedRelation: "album_progress"
      referencedColumns: ["album_id"]
    },{
      foreignKeyName: "album_items_album_id_fkey"
      columns: ["album_id"]
isOneToOne: false
      referencedRelation: "albums"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "album_items_bucket_id_fkey"
      columns: ["bucket_id"]
isOneToOne: false
      referencedRelation: "buckets"
      referencedColumns: ["id"]
    }
                  ]
                },"album_members": {
                  Row: {
                    "album_id": string,"role": string | null,"status": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "album_id": string,"role"?: string | null,"status"?: string | null,"user_id": string
                  }
                  Update: {
                    "album_id"?: string,"role"?: string | null,"status"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "album_members_album_id_fkey"
      columns: ["album_id"]
isOneToOne: false
      referencedRelation: "album_progress"
      referencedColumns: ["album_id"]
    },{
      foreignKeyName: "album_members_album_id_fkey"
      columns: ["album_id"]
isOneToOne: false
      referencedRelation: "albums"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "album_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"album_reactions": {
                  Row: {
                    "album_id": string,"created_at": string | null,"emoji": string,"id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "album_id": string,"created_at"?: string | null,"emoji"?: string,"id"?: string,"user_id": string
                  }
                  Update: {
                    "album_id"?: string,"created_at"?: string | null,"emoji"?: string,"id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "album_reactions_album_id_fkey"
      columns: ["album_id"]
isOneToOne: false
      referencedRelation: "album_progress"
      referencedColumns: ["album_id"]
    },{
      foreignKeyName: "album_reactions_album_id_fkey"
      columns: ["album_id"]
isOneToOne: false
      referencedRelation: "albums"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "album_reactions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"album_tags": {
                  Row: {
                    "album_id": string,"created_at": string,"tag_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "album_id": string,"created_at"?: string,"tag_id": string
                  }
                  Update: {
                    "album_id"?: string,"created_at"?: string,"tag_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "album_tags_album_id_fkey"
      columns: ["album_id"]
isOneToOne: false
      referencedRelation: "album_progress"
      referencedColumns: ["album_id"]
    },{
      foreignKeyName: "album_tags_album_id_fkey"
      columns: ["album_id"]
isOneToOne: false
      referencedRelation: "albums"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "album_tags_tag_id_fkey"
      columns: ["tag_id"]
isOneToOne: false
      referencedRelation: "tags"
      referencedColumns: ["id"]
    }
                  ]
                },"albums": {
                  Row: {
                    "closed_at": string | null,"copied_from_id": string | null,"cover_path": string | null,"created_at": string | null,"description": string | null,"id": string,"is_closed": boolean | null,"is_shared": boolean | null,"owner_id": string,"priority": string | null,"title": string,"visibility": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "closed_at"?: string | null,"copied_from_id"?: string | null,"cover_path"?: string | null,"created_at"?: string | null,"description"?: string | null,"id"?: string,"is_closed"?: boolean | null,"is_shared"?: boolean | null,"owner_id": string,"priority"?: string | null,"title": string,"visibility"?: string | null
                  }
                  Update: {
                    "closed_at"?: string | null,"copied_from_id"?: string | null,"cover_path"?: string | null,"created_at"?: string | null,"description"?: string | null,"id"?: string,"is_closed"?: boolean | null,"is_shared"?: boolean | null,"owner_id"?: string,"priority"?: string | null,"title"?: string,"visibility"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "albums_copied_from_id_fkey"
      columns: ["copied_from_id"]
isOneToOne: false
      referencedRelation: "album_progress"
      referencedColumns: ["album_id"]
    },{
      foreignKeyName: "albums_copied_from_id_fkey"
      columns: ["copied_from_id"]
isOneToOne: false
      referencedRelation: "albums"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "albums_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"app_config": {
                  Row: {
                    "key": string,"note": string | null,"value": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "key": string,"note"?: string | null,"value": NonNullable<Json>
                  }
                  Update: {
                    "key"?: string,"note"?: string | null,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"blocked_users": {
                  Row: {
                    "blocked_id": string,"blocker_id": string,"created_at": string | null,"id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "blocked_id": string,"blocker_id": string,"created_at"?: string | null,"id"?: string
                  }
                  Update: {
                    "blocked_id"?: string,"blocker_id"?: string,"created_at"?: string | null,"id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "blocked_users_blocked_id_fkey"
      columns: ["blocked_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "blocked_users_blocker_id_fkey"
      columns: ["blocker_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"bucket_collaborators": {
                  Row: {
                    "bucket_id": string,"created_at": string,"id": string,"status": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bucket_id": string,"created_at"?: string,"id"?: string,"status"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "bucket_id"?: string,"created_at"?: string,"id"?: string,"status"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "bucket_collaborators_bucket_id_fkey"
      columns: ["bucket_id"]
isOneToOne: false
      referencedRelation: "buckets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bucket_collaborators_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"bucket_mentions": {
                  Row: {
                    "bucket_a": string,"bucket_b": string,"created_at": string | null,"created_by": string | null,"id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bucket_a": string,"bucket_b": string,"created_at"?: string | null,"created_by"?: string | null,"id"?: string
                  }
                  Update: {
                    "bucket_a"?: string,"bucket_b"?: string,"created_at"?: string | null,"created_by"?: string | null,"id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "bucket_mentions_bucket_a_fkey"
      columns: ["bucket_a"]
isOneToOne: false
      referencedRelation: "buckets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bucket_mentions_bucket_b_fkey"
      columns: ["bucket_b"]
isOneToOne: false
      referencedRelation: "buckets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bucket_mentions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"bucket_photos": {
                  Row: {
                    "bucket_id": string,"completed_at": string | null,"created_at": string | null,"height": number | null,"id": string,"position": number,"size_bytes": number,"storage_path": string,"thumb_path": string | null,"thumb_size_bytes": number | null,"title": string | null,"user_id": string,"width": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "bucket_id": string,"completed_at"?: string | null,"created_at"?: string | null,"height"?: number | null,"id"?: string,"position"?: number,"size_bytes": number,"storage_path": string,"thumb_path"?: string | null,"thumb_size_bytes"?: number | null,"title"?: string | null,"user_id": string,"width"?: number | null
                  }
                  Update: {
                    "bucket_id"?: string,"completed_at"?: string | null,"created_at"?: string | null,"height"?: number | null,"id"?: string,"position"?: number,"size_bytes"?: number,"storage_path"?: string,"thumb_path"?: string | null,"thumb_size_bytes"?: number | null,"title"?: string | null,"user_id"?: string,"width"?: number | null
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
                    "category_id": string | null,"collaboration_audience": string | null,"collaboration_mode": string | null,"completed_at": string | null,"copied_from_id": string | null,"copied_from_user_id": string | null,"counter_count": number,"counter_enabled": boolean,"counter_label": string | null,"counter_target": number | null,"cover_image": string | null,"created_at": string | null,"deadline": string | null,"description": string | null,"drive_url": string | null,"id": string,"location_lat": number | null,"location_lng": number | null,"location_text": string | null,"priority": string | null,"status": string | null,"tags": (string)[] | null,"template_id": string | null,"thumbnail_mode": string,"thumbnail_photo_id": string | null,"title": string,"updated_at": string | null,"user_id": string,"visibility": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "category_id"?: string | null,"collaboration_audience"?: string | null,"collaboration_mode"?: string | null,"completed_at"?: string | null,"copied_from_id"?: string | null,"copied_from_user_id"?: string | null,"counter_count"?: number,"counter_enabled"?: boolean,"counter_label"?: string | null,"counter_target"?: number | null,"cover_image"?: string | null,"created_at"?: string | null,"deadline"?: string | null,"description"?: string | null,"drive_url"?: string | null,"id"?: string,"location_lat"?: number | null,"location_lng"?: number | null,"location_text"?: string | null,"priority"?: string | null,"status"?: string | null,"tags"?: (string)[] | null,"template_id"?: string | null,"thumbnail_mode"?: string,"thumbnail_photo_id"?: string | null,"title": string,"updated_at"?: string | null,"user_id": string,"visibility"?: string | null
                  }
                  Update: {
                    "category_id"?: string | null,"collaboration_audience"?: string | null,"collaboration_mode"?: string | null,"completed_at"?: string | null,"copied_from_id"?: string | null,"copied_from_user_id"?: string | null,"counter_count"?: number,"counter_enabled"?: boolean,"counter_label"?: string | null,"counter_target"?: number | null,"cover_image"?: string | null,"created_at"?: string | null,"deadline"?: string | null,"description"?: string | null,"drive_url"?: string | null,"id"?: string,"location_lat"?: number | null,"location_lng"?: number | null,"location_text"?: string | null,"priority"?: string | null,"status"?: string | null,"tags"?: (string)[] | null,"template_id"?: string | null,"thumbnail_mode"?: string,"thumbnail_photo_id"?: string | null,"title"?: string,"updated_at"?: string | null,"user_id"?: string,"visibility"?: string | null
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
                  ComputedFields: never
                  Insert: {
                    "color": string,"icon": string,"id"?: string,"name_en": string,"name_es": string,"slug": string
                  }
                  Update: {
                    "color"?: string,"icon"?: string,"id"?: string,"name_en"?: string,"name_es"?: string,"slug"?: string
                  }
                  Relationships: [
                    
                  ]
                },"collections": {
                  Row: {
                    "author_avatar": string | null,"author_name": string | null,"badge": string | null,"category": string | null,"clones_count": number | null,"cover_path": string | null,"created_at": string | null,"description": string | null,"emoji": string | null,"gradient_colors": Json | null,"id": string,"is_official": boolean | null,"likes_count": number | null,"source_album_id": string | null,"tags": (string)[] | null,"tasks": NonNullable<Json>,"title": string,"updated_at": string | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "author_avatar"?: string | null,"author_name"?: string | null,"badge"?: string | null,"category"?: string | null,"clones_count"?: number | null,"cover_path"?: string | null,"created_at"?: string | null,"description"?: string | null,"emoji"?: string | null,"gradient_colors"?: Json | null,"id"?: string,"is_official"?: boolean | null,"likes_count"?: number | null,"source_album_id"?: string | null,"tags"?: (string)[] | null,"tasks"?: NonNullable<Json>,"title": string,"updated_at"?: string | null,"user_id"?: string | null
                  }
                  Update: {
                    "author_avatar"?: string | null,"author_name"?: string | null,"badge"?: string | null,"category"?: string | null,"clones_count"?: number | null,"cover_path"?: string | null,"created_at"?: string | null,"description"?: string | null,"emoji"?: string | null,"gradient_colors"?: Json | null,"id"?: string,"is_official"?: boolean | null,"likes_count"?: number | null,"source_album_id"?: string | null,"tags"?: (string)[] | null,"tasks"?: NonNullable<Json>,"title"?: string,"updated_at"?: string | null,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "collections_source_album_id_fkey"
      columns: ["source_album_id"]
isOneToOne: false
      referencedRelation: "album_progress"
      referencedColumns: ["album_id"]
    },{
      foreignKeyName: "collections_source_album_id_fkey"
      columns: ["source_album_id"]
isOneToOne: false
      referencedRelation: "albums"
      referencedColumns: ["id"]
    }
                  ]
                },"comment_likes": {
                  Row: {
                    "comment_id": string,"created_at": string | null,"id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "comment_id": string,"created_at"?: string | null,"id"?: string,"user_id": string
                  }
                  Update: {
                    "comment_id"?: string,"created_at"?: string | null,"id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "comment_likes_comment_id_fkey"
      columns: ["comment_id"]
isOneToOne: false
      referencedRelation: "comments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comment_likes_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"comments": {
                  Row: {
                    "album_id": string | null,"body": string,"bucket_id": string | null,"created_at": string | null,"id": string,"parent_id": string | null,"updated_at": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "album_id"?: string | null,"body": string,"bucket_id"?: string | null,"created_at"?: string | null,"id"?: string,"parent_id"?: string | null,"updated_at"?: string | null,"user_id": string
                  }
                  Update: {
                    "album_id"?: string | null,"body"?: string,"bucket_id"?: string | null,"created_at"?: string | null,"id"?: string,"parent_id"?: string | null,"updated_at"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "comments_album_id_fkey"
      columns: ["album_id"]
isOneToOne: false
      referencedRelation: "album_progress"
      referencedColumns: ["album_id"]
    },{
      foreignKeyName: "comments_album_id_fkey"
      columns: ["album_id"]
isOneToOne: false
      referencedRelation: "albums"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comments_bucket_id_fkey"
      columns: ["bucket_id"]
isOneToOne: false
      referencedRelation: "buckets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comments_parent_id_fkey"
      columns: ["parent_id"]
isOneToOne: false
      referencedRelation: "comments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comments_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"daily_tags": {
                  Row: {
                    "color": string,"created_at": string,"emoji": string | null,"id": string,"name": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "color"?: string,"created_at"?: string,"emoji"?: string | null,"id"?: string,"name": string,"user_id": string
                  }
                  Update: {
                    "color"?: string,"created_at"?: string,"emoji"?: string | null,"id"?: string,"name"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"daily_task_completions": {
                  Row: {
                    "collaborator_ids": (string)[] | null,"completed_at": string,"completed_date": string,"due_date": string | null,"id": string,"is_favorite": boolean,"is_recurring": boolean | null,"priority": string | null,"recurrence_interval": number | null,"recurrence_unit": string | null,"subtasks": Json | null,"tag_ids": (string)[] | null,"task_title": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "collaborator_ids"?: (string)[] | null,"completed_at"?: string,"completed_date"?: string,"due_date"?: string | null,"id"?: string,"is_favorite"?: boolean,"is_recurring"?: boolean | null,"priority"?: string | null,"recurrence_interval"?: number | null,"recurrence_unit"?: string | null,"subtasks"?: Json | null,"tag_ids"?: (string)[] | null,"task_title": string,"user_id": string
                  }
                  Update: {
                    "collaborator_ids"?: (string)[] | null,"completed_at"?: string,"completed_date"?: string,"due_date"?: string | null,"id"?: string,"is_favorite"?: boolean,"is_recurring"?: boolean | null,"priority"?: string | null,"recurrence_interval"?: number | null,"recurrence_unit"?: string | null,"subtasks"?: Json | null,"tag_ids"?: (string)[] | null,"task_title"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"daily_tasks": {
                  Row: {
                    "collaborator_ids": (string)[] | null,"completed_at": string | null,"created_at": string,"description": string | null,"drive_url": string | null,"due_date": string | null,"id": string,"is_completed": boolean,"is_favorite": boolean,"is_recurring": boolean,"position": number,"priority": string | null,"recurrence_interval": number | null,"recurrence_unit": string | null,"subtasks": NonNullable<Json>,"tag_ids": (string)[] | null,"title": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "collaborator_ids"?: (string)[] | null,"completed_at"?: string | null,"created_at"?: string,"description"?: string | null,"drive_url"?: string | null,"due_date"?: string | null,"id"?: string,"is_completed"?: boolean,"is_favorite"?: boolean,"is_recurring"?: boolean,"position"?: number,"priority"?: string | null,"recurrence_interval"?: number | null,"recurrence_unit"?: string | null,"subtasks"?: NonNullable<Json>,"tag_ids"?: (string)[] | null,"title": string,"user_id": string
                  }
                  Update: {
                    "collaborator_ids"?: (string)[] | null,"completed_at"?: string | null,"created_at"?: string,"description"?: string | null,"drive_url"?: string | null,"due_date"?: string | null,"id"?: string,"is_completed"?: boolean,"is_favorite"?: boolean,"is_recurring"?: boolean,"position"?: number,"priority"?: string | null,"recurrence_interval"?: number | null,"recurrence_unit"?: string | null,"subtasks"?: NonNullable<Json>,"tag_ids"?: (string)[] | null,"title"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"entity_notification_subscribers": {
                  Row: {
                    "album_id": string | null,"bucket_id": string | null,"created_at": string,"id": string,"owner_id": string,"requester_id": string,"status": string,"subscriber_id": string,"target_type": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "album_id"?: string | null,"bucket_id"?: string | null,"created_at"?: string,"id"?: string,"owner_id": string,"requester_id": string,"status"?: string,"subscriber_id": string,"target_type": string,"updated_at"?: string
                  }
                  Update: {
                    "album_id"?: string | null,"bucket_id"?: string | null,"created_at"?: string,"id"?: string,"owner_id"?: string,"requester_id"?: string,"status"?: string,"subscriber_id"?: string,"target_type"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "entity_notification_subscribers_album_id_fkey"
      columns: ["album_id"]
isOneToOne: false
      referencedRelation: "album_progress"
      referencedColumns: ["album_id"]
    },{
      foreignKeyName: "entity_notification_subscribers_album_id_fkey"
      columns: ["album_id"]
isOneToOne: false
      referencedRelation: "albums"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "entity_notification_subscribers_bucket_id_fkey"
      columns: ["bucket_id"]
isOneToOne: false
      referencedRelation: "buckets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "entity_notification_subscribers_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "entity_notification_subscribers_requester_id_fkey"
      columns: ["requester_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "entity_notification_subscribers_subscriber_id_fkey"
      columns: ["subscriber_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"feed_events": {
                  Row: {
                    "actor_id": string,"bucket_id": string | null,"created_at": string | null,"id": string,"type": string | null
                  }
                  ComputedFields: never
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
                  ComputedFields: never
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
                  ComputedFields: never
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
                },"item_tags": {
                  Row: {
                    "created_at": string,"item_id": string,"tag_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"item_id": string,"tag_id": string
                  }
                  Update: {
                    "created_at"?: string,"item_id"?: string,"tag_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "item_tags_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "buckets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "item_tags_tag_id_fkey"
      columns: ["tag_id"]
isOneToOne: false
      referencedRelation: "tags"
      referencedColumns: ["id"]
    }
                  ]
                },"notification_prefs": {
                  Row: {
                    "comment_push": boolean | null,"deadline_push": boolean | null,"follow_push": boolean | null,"friend_completed_push": boolean | null,"quiet_end": string | null,"quiet_start": string | null,"reaction_push": boolean | null,"updated_at": string | null,"user_id": string
                  }
                  ComputedFields: never
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
                    "actor_id": string | null,"album_id": string | null,"bucket_id": string | null,"comment_id": string | null,"content": string | null,"created_at": string | null,"id": string,"is_read": boolean | null,"recipient_id": string,"type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"album_id"?: string | null,"bucket_id"?: string | null,"comment_id"?: string | null,"content"?: string | null,"created_at"?: string | null,"id"?: string,"is_read"?: boolean | null,"recipient_id": string,"type": string
                  }
                  Update: {
                    "actor_id"?: string | null,"album_id"?: string | null,"bucket_id"?: string | null,"comment_id"?: string | null,"content"?: string | null,"created_at"?: string | null,"id"?: string,"is_read"?: boolean | null,"recipient_id"?: string,"type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_album_id_fkey"
      columns: ["album_id"]
isOneToOne: false
      referencedRelation: "album_progress"
      referencedColumns: ["album_id"]
    },{
      foreignKeyName: "notifications_album_id_fkey"
      columns: ["album_id"]
isOneToOne: false
      referencedRelation: "albums"
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
                    "avatar_url": string | null,"bio": string | null,"created_at": string | null,"default_task_visibility": string,"display_name": string | null,"email": string | null,"id": string,"onboarding_completed": boolean | null,"push_token": string | null,"role": string | null,"storage_used_bytes": number | null,"updated_at": string | null,"username": string,"visibility": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_url"?: string | null,"bio"?: string | null,"created_at"?: string | null,"default_task_visibility"?: string,"display_name"?: string | null,"email"?: string | null,"id": string,"onboarding_completed"?: boolean | null,"push_token"?: string | null,"role"?: string | null,"storage_used_bytes"?: number | null,"updated_at"?: string | null,"username": string,"visibility"?: string | null
                  }
                  Update: {
                    "avatar_url"?: string | null,"bio"?: string | null,"created_at"?: string | null,"default_task_visibility"?: string,"display_name"?: string | null,"email"?: string | null,"id"?: string,"onboarding_completed"?: boolean | null,"push_token"?: string | null,"role"?: string | null,"storage_used_bytes"?: number | null,"updated_at"?: string | null,"username"?: string,"visibility"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"push_tokens": {
                  Row: {
                    "created_at": string | null,"id": string,"platform": string | null,"token": string,"user_id": string
                  }
                  ComputedFields: never
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
                  ComputedFields: never
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
                    "bucket_id": string | null,"comment_id": string | null,"created_at": string | null,"details": string | null,"id": string,"reason": string,"reported_user_id": string | null,"reporter_id": string,"resolved": boolean | null,"status": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "bucket_id"?: string | null,"comment_id"?: string | null,"created_at"?: string | null,"details"?: string | null,"id"?: string,"reason": string,"reported_user_id"?: string | null,"reporter_id": string,"resolved"?: boolean | null,"status"?: string | null
                  }
                  Update: {
                    "bucket_id"?: string | null,"comment_id"?: string | null,"created_at"?: string | null,"details"?: string | null,"id"?: string,"reason"?: string,"reported_user_id"?: string | null,"reporter_id"?: string,"resolved"?: boolean | null,"status"?: string | null
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
      foreignKeyName: "reports_reported_user_id_fkey"
      columns: ["reported_user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"tags": {
                  Row: {
                    "color": string,"created_at": string,"emoji": string | null,"id": string,"name": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "color": string,"created_at"?: string,"emoji"?: string | null,"id"?: string,"name": string,"user_id": string
                  }
                  Update: {
                    "color"?: string,"created_at"?: string,"emoji"?: string | null,"id"?: string,"name"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"templates": {
                  Row: {
                    "category_id": string | null,"created_at": string | null,"creator_id": string | null,"description": string | null,"id": string,"is_official": boolean | null,"title": string,"use_count": number | null
                  }
                  ComputedFields: never
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
                },"user_favorites": {
                  Row: {
                    "album_id": string | null,"bucket_id": string | null,"created_at": string | null,"id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "album_id"?: string | null,"bucket_id"?: string | null,"created_at"?: string | null,"id"?: string,"user_id": string
                  }
                  Update: {
                    "album_id"?: string | null,"bucket_id"?: string | null,"created_at"?: string | null,"id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_favorites_album_id_fkey"
      columns: ["album_id"]
isOneToOne: false
      referencedRelation: "album_progress"
      referencedColumns: ["album_id"]
    },{
      foreignKeyName: "user_favorites_album_id_fkey"
      columns: ["album_id"]
isOneToOne: false
      referencedRelation: "albums"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_favorites_bucket_id_fkey"
      columns: ["bucket_id"]
isOneToOne: false
      referencedRelation: "buckets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_favorites_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"user_saved_albums": {
                  Row: {
                    "album_id": string,"created_at": string | null,"id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "album_id": string,"created_at"?: string | null,"id"?: string,"user_id": string
                  }
                  Update: {
                    "album_id"?: string,"created_at"?: string | null,"id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_saved_albums_album_id_fkey"
      columns: ["album_id"]
isOneToOne: false
      referencedRelation: "album_progress"
      referencedColumns: ["album_id"]
    },{
      foreignKeyName: "user_saved_albums_album_id_fkey"
      columns: ["album_id"]
isOneToOne: false
      referencedRelation: "albums"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_saved_albums_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"user_saved_buckets": {
                  Row: {
                    "bucket_id": string,"created_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bucket_id": string,"created_at"?: string,"user_id": string
                  }
                  Update: {
                    "bucket_id"?: string,"created_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_saved_buckets_bucket_id_fkey"
      columns: ["bucket_id"]
isOneToOne: false
      referencedRelation: "buckets"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "album_progress": {
                  Row: {
                    "album_id": string | null,"completed_tasks": number | null,"total_tasks": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"entity_notification_suscribers": {
                  Row: {
                    "album_id": string | null,"bucket_id": string | null,"created_at": string | null,"id": string | null,"owner_id": string | null,"requester_id": string | null,"status": string | null,"subscriber_id": string | null,"target_type": string | null,"updated_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                           "album_id"?: string | null,"bucket_id"?: string | null,"created_at"?: string | null,"id"?: string | null,"owner_id"?: string | null,"requester_id"?: string | null,"status"?: string | null,"subscriber_id"?: string | null,"target_type"?: string | null,"updated_at"?: string | null
                         }
                        Update: {
                           "album_id"?: string | null,"bucket_id"?: string | null,"created_at"?: string | null,"id"?: string | null,"owner_id"?: string | null,"requester_id"?: string | null,"status"?: string | null,"subscriber_id"?: string | null,"target_type"?: string | null,"updated_at"?: string | null
                         }
                        Relationships: [
                    {
      foreignKeyName: "entity_notification_subscribers_album_id_fkey"
      columns: ["album_id"]
isOneToOne: false
      referencedRelation: "album_progress"
      referencedColumns: ["album_id"]
    },{
      foreignKeyName: "entity_notification_subscribers_album_id_fkey"
      columns: ["album_id"]
isOneToOne: false
      referencedRelation: "albums"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "entity_notification_subscribers_bucket_id_fkey"
      columns: ["bucket_id"]
isOneToOne: false
      referencedRelation: "buckets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "entity_notification_subscribers_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "entity_notification_subscribers_requester_id_fkey"
      columns: ["requester_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "entity_notification_subscribers_subscriber_id_fkey"
      columns: ["subscriber_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "add_admin":
{ Args: { "p_username": string }; Returns: boolean
                           },
"admin_delete_user":
{ Args: { "target_user_id": string }; Returns: boolean
                           },
"auth_is_album_owner":
{ Args: { "album_uuid": string }; Returns: boolean
                           },
"block_user":
{ Args: { "p_target_user_id": string }; Returns: boolean
                           },
"bucket_participant_ids":
{ Args: { "p_bucket_id": string }; Returns: string[]
                           },
"calendar_month":
{ Args: { "p_month": number,"p_tz"?: string,"p_user_id": string,"p_year": number }; Returns: Json
                           },
"can_edit_bucket":
{ Args: { "p_bucket_id": string }; Returns: boolean
                           },
"check_email_available":
{ Args: { "email_to_check": string }; Returns: boolean
                           },
"check_username_available":
{ Args: { "username_to_check": string }; Returns: boolean
                           },
"delete_user":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"get_admins":
{ Args: Record<PropertyKey, never>; Returns: {
              "avatar_url": string,"created_at": string,"display_name": string,"id": string,"role": string,"username": string
            }[]
                           },
"get_bucket_participants":
{ Args: { "p_bucket_id": string }; Returns: {
              "avatar_url": string,"display_name": string,"id": string,"is_owner": boolean,"username": string
            }[]
                           },
"get_email_by_username":
{ Args: { "p_username": string }; Returns: string
                           },
"get_profile_stats":
{ Args: { "p_user": string }; Returns: {
              "completed_count": number,"follow_status": string,"followers_count": number,"following_count": number,"is_locked": boolean,"public_count": number
            }[]
                           },
"is_album_member":
{ Args: { "p_album_id": string }; Returns: boolean
                           },
"is_bucket_in_member_album":
{ Args: { "p_bucket_id": string }; Returns: boolean
                           },
"is_bucket_owner":
{ Args: { "p_bucket_id": string }; Returns: boolean
                           },
"is_following":
{ Args: { "target_user_id": string }; Returns: boolean
                           },
"is_private_profile":
{ Args: { "target_user_id": string }; Returns: boolean
                           },
"promote_album_to_collection":
{ Args: { "p_album_id": string,"p_badge"?: string,"p_category"?: string,"p_emoji"?: string }; Returns: string
                           },
"remove_admin":
{ Args: { "p_target_id": string }; Returns: boolean
                           },
"request_or_join_bucket_collaboration":
{ Args: { "p_bucket_id": string,"p_request_only"?: boolean }; Returns: Json
                           },
"respond_to_collaboration_request":
{ Args: { "p_accept": boolean,"p_bucket_id": string,"p_user_id": string }; Returns: Json
                           },
"search_people":
{ Args: { "p_limit"?: number,"p_query": string }; Returns: {
              "avatar_url": string,"display_name": string,"follow_status": string,"id": string,"public_count": number,"username": string,"visibility": string
            }[]
                           },
"sync_bucket_tags":
{ Args: { "p_bucket_id": string }; Returns: undefined
                           },
"unblock_user":
{ Args: { "p_target_user_id": string }; Returns: boolean
                           },
"update_user_email":
{ Args: { "new_email": string }; Returns: undefined
                           },
"visible_bucket_count":
{ Args: { "target_user_id": string }; Returns: number
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
