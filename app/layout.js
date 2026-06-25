import './globals.css';
import { ThemeProvider } from '@/hooks/useTheme';
import { AudioProvider } from '@/store/AudioContext';
import MediaWidget from '@/components/atoms/MediaWidget';

export const metadata = {
  title: 'Thaesu Online',
  description: 'Premium Marketplace',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
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
