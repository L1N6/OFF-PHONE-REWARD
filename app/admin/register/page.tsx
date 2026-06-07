import AdminRegister from '@/app/_components/AdminRegister';

export const metadata = { title: 'Đăng ký Admin — Off-Phone Rewards' };

export default function RegisterPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Off-Phone Rewards</h1>
          <p className="text-sm text-muted mt-1">Admin Portal</p>
        </div>
        <div className="bg-surface rounded-2xl shadow-sm border border-border p-8">
          <h2 className="text-xl font-semibold mb-6 text-foreground">Tạo tài khoản Owner</h2>
          <AdminRegister />
        </div>
      </div>
    </main>
  );
}
