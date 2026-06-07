'use client';

import { useFormState, useFormStatus } from 'react-dom';
import Link from 'next/link';
import { signUp } from '@/actions/adminAuth';

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-primary text-primary-fg py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity"
    >
      {pending ? 'Đang tạo tài khoản...' : 'Đăng ký'}
    </button>
  );
}

export default function AdminRegister() {
  const [state, action] = useFormState(signUp, {});

  if (state.needsConfirmation) {
    return (
      <div className="text-center space-y-3">
        <div className="text-4xl">📧</div>
        <h2 className="font-semibold text-foreground">Kiểm tra email của bạn</h2>
        <p className="text-sm text-muted">
          Chúng tôi đã gửi link xác nhận. Nhấn vào link để kích hoạt tài khoản.
        </p>
        <Link href="/admin/login" className="text-sm text-primary font-medium hover:underline">
          Quay lại đăng nhập
        </Link>
      </div>
    );
  }

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
        <label className="block text-sm font-medium text-foreground mb-1">
          Mật khẩu{' '}
          <span className="text-muted font-normal">(tối thiểu 6 ký tự)</span>
        </label>
        <input
          type="password"
          name="password"
          required
          minLength={6}
          autoComplete="new-password"
          className="w-full border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <SubmitBtn />
      <p className="text-sm text-center text-muted">
        Đã có tài khoản?{' '}
        <Link href="/admin/login" className="text-primary font-medium hover:underline">
          Đăng nhập
        </Link>
      </p>
    </form>
  );
}
