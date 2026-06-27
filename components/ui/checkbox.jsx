'use client';
import * as React from 'react';
import { cn } from '@/lib/utils';

const Checkbox = React.forwardRef(({ className, checked, onCheckedChange, ...props }, ref) => {
  return (
    <input
      type="checkbox"
      ref={ref}
      checked={checked}
      onChange={onCheckedChange}
      className={cn(
        'h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer',
        className
      )}
      {...props}
    />
  );
});
Checkbox.displayName = 'Checkbox';

export { Checkbox };
