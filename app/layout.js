import './globals.css';
import { ThemeProvider } from '@/hooks/useTheme';
import { AudioProvider } from '@/store/AudioContext';
import MediaWidget from '@/components/atoms/MediaWidget';
import { I18nProvider } from '@/lib/i18n';
import Link from 'next/link';

export const metadata = {
  title: 'Thaesu Online - Premium Marketplace',
  description: 'Myanmar premium online marketplace',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gradient-to-br from-white via-gray-50 to-gray-100 min-h-screen">
        <I18nProvider initialLocale="en">
          <ThemeProvider>
            <AudioProvider>
              <nav className="glass-card sticky top-0 z-50 p-3 flex gap-4 justify-center flex-wrap text-sm">
                <Link href="/">🏠 Home</Link>
                <Link href="/products">🛍️ Products</Link>
                <Link href="/cart">🛒 Cart</Link>
                <Link href="/wishlist">❤️ Wishlist</Link>
                <Link href="/profile">👤 Profile</Link>
                <Link href="/chat">💬 Chat</Link>
                <Link href="/vendor/dashboard">🏪 Vendor</Link>
                <Link href="/dashboard">⚙️ Admin</Link>
              </nav>
              {children}
              <MediaWidget />
            </AudioProvider>
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
