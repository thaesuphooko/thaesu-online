'use client';
import { useI18n } from '@/lib/i18n';

export default function Home() {
  const { t, switchLocale, locale } = useI18n();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <div className="mb-4">
        <button onClick={() => switchLocale('en')} className={`mr-2 px-3 py-1 rounded ${locale==='en' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>EN</button>
        <button onClick={() => switchLocale('my')} className={`px-3 py-1 rounded ${locale==='my' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>MY</button>
      </div>

      <h1 className="text-5xl font-extrabold bg-gradient-to-r from-orange-400 to-purple-600 bg-clip-text text-transparent mb-4">
        {t('home.title')}
      </h1>
      <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-xl">
        {t('home.subtitle')} • ထုတ်ကုန်ပေါင်း ၁၀၀,၀၀၀+
      </p>
      <div className="flex flex-wrap gap-4 justify-center mb-12">
        <a href="/products" className="px-8 py-3 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 transition font-bold text-lg">
          🛍️ {t('home.shop_now')}
        </a>
        <a href="/vendor/register" className="px-8 py-3 bg-purple-600 text-white rounded-xl shadow-lg hover:bg-purple-700 transition font-bold text-lg">
          🏪 {t('home.open_shop')}
        </a>
      </div>
    </div>
  );
}
