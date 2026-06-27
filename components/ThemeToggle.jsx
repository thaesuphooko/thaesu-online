'use client';

import { useTrueTone } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { theme, toggleDarkLight } = useTrueTone();
  return (
    <Button variant="ghost" size="icon" onClick={toggleDarkLight} aria-label="Toggle theme">
      {theme === 'dark' ? '☀️' : '🌙'}
    </Button>
  );
}
