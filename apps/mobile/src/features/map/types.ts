export interface MapTaskItem {
  id: string;
  title: string;
  description?: string | null;
  location_text: string;
  location_lat: number;
  location_lng: number;
  status?: string | null; // 'completed' | 'in_progress' | 'pending'
  visibility?: string | null;
  category_id?: string | null;
  category?: { slug: string; name?: string } | null;
  user_id: string;
  user?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
  cover_image?: string | null;
  thumbnail_mode?: string | null;
  thumbnail_photo_id?: string | null;
  bucket_photos?: Array<{
    id: string;
    thumb_path?: string | null;
    storage_path?: string | null;
    created_at?: string | null;
  }> | null;
  created_at?: string | null;
  completed_at?: string | null;
  is_mine?: boolean;
  is_friend?: boolean;
}

export type MapFilterType = 'all' | 'mine' | 'friends' | 'completed' | 'pending';

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export const INITIAL_MAP_REGION: MapRegion = {
  latitude: 40.4168,
  longitude: -3.7038,
  latitudeDelta: 20.0,
  longitudeDelta: 20.0,
};
