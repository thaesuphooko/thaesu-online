'use client';
import { createContext, useContext, useState, useEffect } from 'react';
const CurrencyContext = createContext();
export function CurrencyProvider({ children }) {
  const [currency, setCurrency] = useState('MMK');
  const [rate, setRate] = useState(1);
  useEffect(() => {
    const stored = localStorage.getItem('currency');
    if (stored) setCurrency(stored);
  }, []);
  useEffect(() => {
    if (currency === 'USD') setRate(2100);
    else setRate(1);
    localStorage.setItem('currency', currency);
  }, [currency]);
  const convert = (amount) => Math.round(amount / rate * 100) / 100;
  return <CurrencyContext.Provider value={{ currency, setCurrency, convert }}>{children}</CurrencyContext.Provider>;
}
export const useCurrency = () => useContext(CurrencyContext);
