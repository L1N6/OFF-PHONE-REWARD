'use server';

import { createAuthServerClient } from '@/lib/adminSupabase';
import { createAdminClient } from '@/lib/supabase';
import { isValidUuid } from '@/lib/uuid';
import { validateLocationInput, describeLocationError } from '@/lib/venueLocation';

// specs §4 Module 5 (RQ-001) — Owner/Manager cập nhật toạ độ + bán kính venue.
// useFormState signature: (prevState, formData). Trả { error } | { success: true }.
//
// Quyền: kiểm tra venue_admin_users có row (venue_id, auth.uid()) — KHÔNG tin client.
// UPDATE qua createAdminClient() (service_role bypass RLS); policy venue_update_by_admin
// (TF-4) là tường phòng thủ bổ sung cho kết nối authenticated trực tiếp.
export async function updateVenueLocation(
  _prev: { error?: string; success?: boolean },
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  // 1. Phải đăng nhập (session từ cookie SSR).
  const supabase = createAuthServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: 'Chưa đăng nhập' };

  // 2. venue_id hợp lệ.
  const venueId = (formData.get('venue_id') as string | null)?.trim() ?? '';
  if (!isValidUuid(venueId)) return { error: 'Venue không hợp lệ' };

  // 3. Validate biên toạ độ/bán kính (pure, không tin client).
  const validated = validateLocationInput({
    lat: formData.get('latitude'),
    lng: formData.get('longitude'),
    radius: formData.get('radius_meters'),
  });
  if (!validated.ok) return { error: describeLocationError(validated.error) };

  const admin = createAdminClient();

  // 4. Quyền: user là admin (owner HOẶC manager) của venue này.
  const { data: membership, error: memErr } = await admin
    .from('venue_admin_users')
    .select('role')
    .eq('venue_id', venueId)
    .eq('supabase_uid', session.user.id)
    .maybeSingle();
  if (memErr) return { error: memErr.message };
  if (!membership) return { error: 'Unauthorized: bạn không quản lý venue này' };

  // 5. UPDATE — hiệu lực ngay cho guest claim (Haversine đọc venue.radius_meters/lat/lng).
  const { error: updErr } = await admin
    .from('venues')
    .update({
      latitude: validated.lat,
      longitude: validated.lng,
      radius_meters: validated.radius,
    })
    .eq('id', venueId);
  if (updErr) return { error: updErr.message };

  return { success: true };
}
