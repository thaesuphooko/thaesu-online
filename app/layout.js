import './globals.css';
import { ThemeProvider, useTrueTone } from '@/hooks/useTheme';
import { AudioProvider } from '@/store/AudioContext';
import MediaWidget from '@/components/atoms/MediaWidget';
import { I18nProvider } from '@/lib/i18n';
import StatusBar from '@/components/atoms/StatusBar';
import BottomNav from '@/components/organisms/BottomNav';
import ErudaLoader from '@/components/atoms/ErudaLoader';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Thaesu Online - Premium Marketplace',
  description: 'Myanmar premium online marketplace',
};

function ThemeToggle() {
  const { theme, toggleDarkLight } = useTrueTone();
  return (
    <Button variant="ghost" size="icon" onClick={toggleDarkLight} aria-label="Toggle theme">
      {theme === 'dark' ? '☀️' : '🌙'}
    </Button>
  );
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen pb-16">
        <I18nProvider initialLocale="en">
          <ThemeProvider>
            <AudioProvider>
              <StatusBar />
              <main className="animate-fadeIn">{children}</main>
              <MediaWidget />
              <BottomNav />
            </AudioProvider>
          </ThemeProvider>
        </I18nProvider>
        <ErudaLoader />
      </body>
    </html>
  );
}
