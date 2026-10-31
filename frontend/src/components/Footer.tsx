import Link from 'next/link';
import { Logo } from './Logo';

export function Footer() {
  return (
    <footer className="mt-20 border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-3 text-sm text-ink-soft">
            Gọi món trên điện thoại, trả bằng ví hoặc thẻ, tới quầy là có nước. Không cần tiền mặt, không cần xếp hàng.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm">
          <Link href="/" className="text-ink-soft hover:text-ink">
            Menu
          </Link>
          <Link href="/orders" className="text-ink-soft hover:text-ink">
            Đơn của tôi
          </Link>
          <Link href="/cart" className="text-ink-soft hover:text-ink">
            Giỏ hàng
          </Link>
          <Link href="/account" className="text-ink-soft hover:text-ink">
            Tài khoản
          </Link>
        </div>
      </div>
      <p className="mx-auto max-w-6xl px-4 pb-8 text-xs text-ink-mute sm:px-6">
        Bài tập lớn môn Công nghệ Phần mềm – Trường Đại học Sài Gòn, 2026. Thanh toán trong ứng dụng là giả lập.
      </p>
    </footer>
  );
}
