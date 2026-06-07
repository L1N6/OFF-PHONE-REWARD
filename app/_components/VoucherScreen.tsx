/**
 * VoucherScreen — màn nhận thưởng thành công (specs §4 Module 3, T3-5).
 * Code dạng coupon (font lớn, monospace, select-all). CTA "Thử lại ngày mai" về landing.
 * Render trong <Shell> của SessionView; dùng cho cả lúc vừa claim lẫn restore khi reload.
 */
export function VoucherScreen({ code }: { code: string }) {
  return (
    <div className="w-full max-w-sm text-center">
      <p className="text-4xl">🎉</p>
      <h1 className="mt-1 text-2xl font-bold text-accent">Nhận thưởng thành công!</h1>
      <p className="mt-1 text-sm opacity-85">Giảm 10% cho ly tiếp theo của bạn.</p>

      <div className="relative mt-5 rounded-2xl border-2 border-dashed border-accent bg-white/10 p-5">
        {/* "lỗ vé" trang trí hai bên cho cảm giác coupon */}
        <span className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-primary-deep" />
        <span className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-primary-deep" />
        <p className="text-xs uppercase tracking-widest opacity-70">Mã voucher</p>
        <p className="mt-2 select-all break-all font-mono text-3xl font-extrabold tracking-widest text-white">
          {code}
        </p>
        <p className="mt-3 text-xs opacity-70">Đưa mã này cho nhân viên tại quầy để được giảm giá.</p>
      </div>

      <a
        href="/"
        className="mt-6 inline-block rounded-md bg-accent px-5 py-2 font-semibold text-accent-fg"
      >
        Thử lại ngày mai
      </a>
    </div>
  );
}
