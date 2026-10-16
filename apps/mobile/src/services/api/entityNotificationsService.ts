import { supabase } from '../supabase';

export interface EntitySubscriber {
  id: string;
  target_type: 'bucket' | 'album';
  bucket_id?: string | null;
  album_id?: string | null;
  subscriber_id: string;
  requester_id: string;
  owner_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  updated_at: string;
  profile?: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

export const entityNotificationsService = {
  async getSubscription(
    targetType: 'bucket' | 'album',
    targetId: string,
    subscriberId?: string
  ): Promise<EntitySubscriber | null> {
    if (!subscriberId) return null;

    let query = supabase
      .from('entity_notification_subscribers')
      .select('*, profile:profiles!subscriber_id(id, username, display_name, avatar_url)')
      .eq('target_type', targetType)
      .eq('subscriber_id', subscriberId);

    if (targetType === 'bucket') {
      query = query.eq('bucket_id', targetId);
    } else {
      query = query.eq('album_id', targetId);
    }

    const { data, error } = await query.maybeSingle();
    if (error) {
      console.warn('Error fetching subscription:', error.message);
      return null;
    }
    return data as EntitySubscriber | null;
  },

  async getSubscribers(
    targetType: 'bucket' | 'album',
    targetId: string
  ): Promise<EntitySubscriber[]> {
    let query = supabase
      .from('entity_notification_subscribers')
      .select('*, profile:profiles!subscriber_id(id, username, display_name, avatar_url)')
      .eq('target_type', targetType)
      .order('created_at', { ascending: false });

    if (targetType === 'bucket') {
      query = query.eq('bucket_id', targetId);
    } else {
      query = query.eq('album_id', targetId);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('Error fetching subscribers:', error.message);
      return [];
    }
    return (data || []) as EntitySubscriber[];
  },

  async requestSubscription(params: {
    targetType: 'bucket' | 'album';
    targetId: string;
    ownerId?: string;
    subscriberId: string;
    requesterId: string;
    status?: 'pending' | 'accepted';
  }): Promise<EntitySubscriber> {
    let ownerId = params.ownerId;
    if (!ownerId) {
      if (params.targetType === 'bucket') {
        const { data: b } = await supabase
          .from('buckets')
          .select('user_id')
          .eq('id', params.targetId)
          .maybeSingle();
        ownerId = b?.user_id;
      } else {
        const { data: a } = await supabase
          .from('albums')
          .select('owner_id')
          .eq('id', params.targetId)
          .maybeSingle();
        ownerId = a?.owner_id;
      }
    }
    if (!ownerId) {
      ownerId = params.subscriberId;
    }

    const isOwner = params.subscriberId === ownerId;
    const payload: any = {
      target_type: params.targetType,
      owner_id: ownerId,
      subscriber_id: params.subscriberId,
      requester_id: params.requesterId,
      status: params.status || (isOwner ? 'accepted' : 'pending'),
      bucket_id: params.targetType === 'bucket' ? params.targetId : null,
      album_id: params.targetType === 'album' ? params.targetId : null,
      updated_at: new Date().toISOString(),
    };

    const conflictCols =
      params.targetType === 'bucket' ? 'bucket_id,subscriber_id' : 'album_id,subscriber_id';

    const { data, error } = await supabase
      .from('entity_notification_subscribers')
      .upsert(payload, {
        onConflict: conflictCols,
      })
      .select('*, profile:profiles!subscriber_id(id, username, display_name, avatar_url)')
      .maybeSingle();

    if (error) {
      console.error('Error in requestSubscription:', error);
      throw error;
    }

    return (data || { ...payload, id: 'temp' }) as EntitySubscriber;
  },

  async respondRequest(
    subscriptionId: string,
    accept: boolean
  ): Promise<void> {
    const { error } = await supabase
      .from('entity_notification_subscribers')
      .update({
        status: accept ? 'accepted' : 'declined',
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId);

    if (error) throw error;
  },

  async removeSubscriber(
    targetType: 'bucket' | 'album',
    targetId: string,
    subscriberId: string
  ): Promise<void> {
    let query = supabase
      .from('entity_notification_subscribers')
      .delete()
      .eq('target_type', targetType)
      .eq('subscriber_id', subscriberId);

    if (targetType === 'bucket') {
      query = query.eq('bucket_id', targetId);
    } else {
      query = query.eq('album_id', targetId);
    }

    const { error } = await query;
    if (error) throw error;
  },
};
