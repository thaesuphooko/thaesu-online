'use client';
import { ThemeProvider, useTrueTone } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';

// ThemeToggle ကို ဒီထဲမှာပဲ ထည့်လိုက်ပါ
export function ThemeToggle() {
  const { theme, toggleDarkLight } = useTrueTone();
  return (
    <Button variant="ghost" size="icon" onClick={toggleDarkLight}>
      {theme === 'dark' ? '☀️' : '🌙'}
    </Button>
  );
}

export function ThemeWrapper({ children }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}


