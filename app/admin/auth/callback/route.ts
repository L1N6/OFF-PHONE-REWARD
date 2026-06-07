import { createAuthServerClient } from '@/lib/adminSupabase';
import { createAdminClient } from '@/lib/supabase';
import { NextResponse, type NextRequest } from 'next/server';

// Supabase gửi ?code=... sau khi user click invite link / confirm email.
// Exchange code → session → link supabase_uid vào venue_admin_users row.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(`${origin}/admin/login?error=missing_code`);
  }

  const supabase = createAuthServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    return NextResponse.redirect(`${origin}/admin/login?error=callback_error`);
  }

  // Link supabase_uid vào row đã pre-create (invite flow: supabase_uid = null khi mời)
  const admin = createAdminClient();
  await admin
    .from('venue_admin_users')
    .update({ supabase_uid: data.session.user.id })
    .eq('email', data.session.user.email!)
    .is('supabase_uid', null);

  return NextResponse.redirect(`${origin}/admin/dashboard`);
}
