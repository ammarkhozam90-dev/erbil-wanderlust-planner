import { supabase } from '@/integrations/supabase/client';

export type AdminAction =
  | 'business.created'
  | 'business.edited'
  | 'business.approved'
  | 'business.rejected'
  | 'business.deleted'
  | 'photo.deleted'
  | 'photo.role_changed'
  | 'merchant.suspended'
  | 'merchant.reactivated'
  | 'merchant.status_reset'
  | 'category.updated'
  | 'settings.updated'
  | 'report.status_changed';

export async function logActivity(params: {
  action: AdminAction;
  target_type?: string;
  target_id?: string | null;
  target_label?: string;
  metadata?: Record<string, unknown>;
}) {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return;
  await supabase.from('activity_log').insert({
    actor_id: user.id,
    actor_email: user.email ?? null,
    action: params.action,
    target_type: params.target_type ?? null,
    target_id: params.target_id ?? null,
    target_label: params.target_label ?? null,
    metadata: (params.metadata ?? {}) as any,
  } as any);
}
