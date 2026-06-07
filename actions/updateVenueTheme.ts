'use server';

import { createAuthServerClient } from '@/lib/adminSupabase';
import { createAdminClient } from '@/lib/supabase';
import { isValidUuid } from '@/lib/uuid';
import { isValidThemeId } from '@/lib/theme';

// specs §4 Module 6 (RQ-002) — Owner/Manager chọn theme preset cho venue.
// useFormState: (prevState, formData) → { error } | { success }.
//
// Quyền: venue_admin_users có row (venue_id, auth.uid()) — owner HOẶC manager (ADR-011).
// Merge JSONB giữ field khác: đọc branding → ghi lại {...branding, theme_id} (admin-op ít đồng thời).
// UPDATE qua createAdminClient() (service_role bypass RLS).
export async function updateVenueTheme(
  _prev: { error?: string; success?: boolean },
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  // 1. Đăng nhập.
  const supabase = createAuthServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: 'Chưa đăng nhập' };

  // 2. venue_id hợp lệ.
  const venueId = (formData.get('venue_id') as string | null)?.trim() ?? '';
  if (!isValidUuid(venueId)) return { error: 'Venue không hợp lệ' };

  // 3. theme_id phải thuộc whitelist preset (KHÔNG tin client).
  const themeId = (formData.get('theme_id') as string | null)?.trim() ?? '';
  if (!isValidThemeId(themeId)) return { error: 'Theme không hợp lệ' };

  const admin = createAdminClient();

  // 4. Quyền: user là admin (owner|manager) của venue này.
  const { data: membership, error: memErr } = await admin
    .from('venue_admin_users')
    .select('role')
    .eq('venue_id', venueId)
    .eq('supabase_uid', session.user.id)
    .maybeSingle();
  if (memErr) return { error: memErr.message };
  if (!membership) return { error: 'Unauthorized: bạn không quản lý venue này' };

  // 5. Đọc branding hiện tại → merge theme_id (giữ challenge_name… nếu có).
  const { data: venue, error: readErr } = await admin
    .from('venues')
    .select('branding')
    .eq('id', venueId)
    .single();
  if (readErr) return { error: readErr.message };

  const current =
    venue?.branding && typeof venue.branding === 'object' && !Array.isArray(venue.branding)
      ? (venue.branding as Record<string, unknown>)
      : {};
  const nextBranding = { ...current, theme_id: themeId };

  // 6. UPDATE — hiệu lực ngay cho guest (đọc branding.theme_id live).
  const { error: updErr } = await admin
    .from('venues')
    .update({ branding: nextBranding })
    .eq('id', venueId);
  if (updErr) return { error: updErr.message };

  return { success: true };
}
