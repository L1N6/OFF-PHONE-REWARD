'use client';

import { useFormState, useFormStatus } from 'react-dom';
import Link from 'next/link';
import { signIn } from '@/actions/adminAuth';

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-primary text-primary-fg py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity"
    >
      {pending ? 'Đang đăng nhập...' : 'Đăng nhập'}
    </button>
  );
}

export default function AdminLogin() {
  const [state, action] = useFormState(signIn, {});

  return (
    <form action={action} className="space-y-4">
      {state.error && (
        <p className="text-sm text-error bg-error/10 border border-error/30 rounded-lg p-3">
          {state.error}
        </p>
      )}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Email</label>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Mật khẩu</label>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <SubmitBtn />
      <p className="text-sm text-center text-muted">
        Chưa có tài khoản?{' '}
        <Link href="/admin/register" className="text-primary font-medium hover:underline">
          Đăng ký
        </Link>
      </p>
    </form>
  );
}
