'use client';
'use client';
import { createContext, useContext, useState, useEffect } from 'react';

// Inline translations (no JSON import)
const translations = {
  en: {
    home: { title: "Thaesu Online", subtitle: "Premium Marketplace", shop_now: "Shop Now", open_shop: "Open Shop" }
  },
  my: {
    home: { title: "Thaesu Online", subtitle: "ကမ္ဘာ့အဆင့်မီ Marketplace", shop_now: "ဈေးဝယ်မယ်", open_shop: "ဆိုင်ဖွင့်မယ်" }
  }
};

const I18nContext = createContext({
  locale: 'en',
  t: (key) => key,
  switchLocale: () => {}
});

export function I18nProvider({ children, initialLocale = 'en' }) {
  const [locale, setLocale] = useState(initialLocale);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('locale');
      if (stored && (stored === 'en' || stored === 'my')) {
        setLocale(stored);
      }
    } catch (e) {
      // ignore during SSR
    }
  }, []);

  const t = (key) => {
    const keys = key.split('.');
    let value = translations[locale] || translations.en;
    for (const k of keys) {
      value = value?.[k];
    }
    return value || key;
  };

  const switchLocale = (newLocale) => {
    setLocale(newLocale);
    try {
      localStorage.setItem('locale', newLocale);
    } catch (e) {}
  };

  return (
    <I18nContext.Provider value={{ locale, t, switchLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  // Fallback in case context is missing
  return ctx || { locale: 'en', t: (key) => key, switchLocale: () => {} };
};
