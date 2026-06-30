import './globals.css';
import { ThemeProvider } from '@/hooks/useTheme';
import { AudioProvider } from '@/store/AudioContext';
import { I18nProvider } from '@/lib/i18n';
import BottomNav from '@/components/organisms/BottomNav';
import ErudaLoader from '@/components/atoms/ErudaLoader';
import ErrorBoundary from '@/components/atoms/ErrorBoundary';
import Toast from '@/components/atoms/Toast';
import WaveformNavbar from '@/components/organisms/WaveformNavbar';

export const metadata = {
  title: 'Thaesu Online - Premium Marketplace',
  description: 'Myanmar premium online marketplace',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen pb-16">
        <ErrorBoundary>
          <I18nProvider initialLocale="en">
            <ThemeProvider>
              <AudioProvider>
                <WaveformNavbar />
                <main className="animate-fadeIn">{children}</main>
                <BottomNav />
                <Toast />
              </AudioProvider>
            </ThemeProvider>
          </I18nProvider>
        </ErrorBoundary>
        <ErudaLoader />
      </body>
    </html>
  );
}
