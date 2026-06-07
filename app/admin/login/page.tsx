import AdminLogin from '@/app/_components/AdminLogin';

export const metadata = { title: 'Admin Login — Off-Phone Rewards' };

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const errorMsg =
    searchParams.error === 'callback_error'
      ? 'Liên kết xác nhận không hợp lệ hoặc đã hết hạn.'
      : searchParams.error === 'missing_code'
      ? 'Thiếu code xác nhận trong URL.'
      : null;

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Off-Phone Rewards</h1>
          <p className="text-sm text-muted mt-1">Admin Portal</p>
        </div>
        <div className="bg-surface rounded-2xl shadow-sm border border-border p-8">
          <h2 className="text-xl font-semibold mb-6 text-foreground">Đăng nhập</h2>
          {errorMsg && (
            <p className="mb-4 text-sm text-error bg-error/10 border border-error/30 p-3 rounded-lg">
              {errorMsg}
            </p>
          )}
          <AdminLogin />
        </div>
      </div>
    </main>
  );
}
