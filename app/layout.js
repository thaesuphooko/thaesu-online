import './globals.css';
import { ThemeProvider } from '@/hooks/useTheme';
import { AudioProvider } from '@/store/AudioContext';
import { I18nProvider } from '@/lib/i18n';
import StatusBar from '@/components/atoms/StatusBar';
import BottomNav from '@/components/organisms/BottomNav';
import ErudaLoader from '@/components/atoms/ErudaLoader';
import ErrorBoundary from '@/components/atoms/ErrorBoundary';
import Toast from '@/components/atoms/Toast';

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
                <StatusBar />
                <main className="animate-fadeIn pt-10">{children}</main>
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
