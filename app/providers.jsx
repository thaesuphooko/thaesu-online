'use client';
import { NextIntlClientProvider } from 'next-intl';
import { useLocale } from 'next-intl';

export default function Providers({ children, locale, messages }) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
