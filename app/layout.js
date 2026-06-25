import './globals.css';
import { ThemeProvider } from '@/hooks/useTheme';
import { AudioProvider } from '@/store/AudioContext';
import MediaWidget from '@/components/atoms/MediaWidget';

export const metadata = {
  title: {
    default: 'Thaesu Online - Premium Marketplace',
    template: '%s | Thaesu Online',
  },
  description: 'Myanmar premium online marketplace with Wave Pay & fast delivery.',
  keywords: 'marketplace, myanmar, shopping, wave pay',
  openGraph: {
    title: 'Thaesu Online',
    description: 'Premium Marketplace in Myanmar',
    url: 'https://thaesu-online.vercel.app',
    siteName: 'Thaesu Online',
    locale: 'my_MM',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="my">
      <body className="bg-gradient-to-br from-white via-gray-50 to-gray-100 min-h-screen">
        <ThemeProvider>
          <AudioProvider>
            {children}
            <MediaWidget />
          </AudioProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
