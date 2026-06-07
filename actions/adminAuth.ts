'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createAuthServerClient } from '@/lib/adminSupabase';
import { createAdminClient } from '@/lib/supabase';

// ─── signIn ────────────────────────────────────────────────────────────────
export async function signIn(
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const email    = (formData.get('email')    as string).trim();
  const password = (formData.get('password') as string);

  const supabase = createAuthServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  redirect('/admin/dashboard');
}

// ─── signOut ───────────────────────────────────────────────────────────────
export async function signOut() {
  const supabase = createAuthServerClient();
  await supabase.auth.signOut();
  redirect('/admin/login');
}

// ─── signUp ────────────────────────────────────────────────────────────────
// Đăng ký owner mới. Nếu Supabase bật email confirmation: trả needsConfirmation=true.
// Nếu tắt email confirmation (recommended cho pilot): redirect thẳng dashboard.
export async function signUp(
  _prev: { error?: string; needsConfirmation?: boolean },
  formData: FormData
): Promise<{ error?: string; needsConfirmation?: boolean }> {
  const email    = (formData.get('email')    as string).trim().toLowerCase();
  const password = (formData.get('password') as string);

  const supabase = createAuthServerClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };
  if (!data.user) return { error: 'Đăng ký thất bại' };

  // Gán owner vào seed venue (VENUE_ID env).
  const venueId = process.env.VENUE_ID;
  if (venueId) {
    const admin = createAdminClient();
    const { error: insErr } = await admin.from('venue_admin_users').insert({
      venue_id: venueId,
      email,
      supabase_uid: data.user.id,
      role: 'owner',
    });
    // '23505' = unique_violation — đã assigned rồi, bỏ qua
    if (insErr && insErr.code !== '23505') {
      console.error('[signUp] venue_admin_users:', insErr.message);
    }
  }

  if (data.session) redirect('/admin/dashboard');
  return { needsConfirmation: true };
}

// ─── inviteManager ─────────────────────────────────────────────────────────
// Owner invite manager vào 1 venue. Pre-create row trước khi user accept.
export async function inviteManager(
  _prev: { error?: string; success?: boolean },
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const supabase = createAuthServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: 'Chưa đăng nhập' };

  const email   = (formData.get('email')    as string).trim().toLowerCase();
  const venueId = (formData.get('venue_id') as string);

  const admin = createAdminClient();

  // Chỉ owner mới invite được
  const { data: ownership } = await admin
    .from('venue_admin_users')
    .select('role')
    .eq('venue_id', venueId)
    .eq('supabase_uid', session.user.id)
    .eq('role', 'owner')
    .maybeSingle();
  if (!ownership) return { error: 'Unauthorized: không phải owner của venue này' };

  // Pre-create row (supabase_uid = null cho tới khi accept invite)
  const { error: insErr } = await admin.from('venue_admin_users').insert({
    venue_id: venueId,
    email,
    role: 'manager',
  });
  if (insErr && insErr.code !== '23505') return { error: insErr.message };

  // Gửi invite email qua Supabase Auth Admin API
  const headersList = headers();
  const host  = headersList.get('host') ?? 'localhost:3000';
  const proto = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${proto}://${host}/admin/auth/callback`,
  });
  if (inviteErr) return { error: inviteErr.message };

  return { success: true };
}
