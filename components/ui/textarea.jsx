import * as React from "react"
import { cn } from "@/lib/utils"

const Textarea = React.forwardRef(({ className, error, maxLength, value, onChange, ...props }, ref) => {
  const [charCount, setCharCount] = React.useState(0)
  React.useEffect(() => {
    if (maxLength && value) setCharCount(String(value).length)
  }, [value, maxLength])

  const handleChange = (e) => {
    if (onChange) onChange(e)
    if (maxLength) setCharCount(e.target.value.length)
  }

  return (
    <div className="relative w-full">
      <textarea
        ref={ref}
        className={cn(
          "flex min-h-[100px] w-full rounded-xl border bg-white/5 px-4 py-3 text-sm text-white placeholder:text-zinc-500 backdrop-blur-sm transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50",
          "disabled:cursor-not-allowed disabled:opacity-40",
          error
            ? "border-red-500/70 focus:ring-red-500/50 focus:border-red-500/50"
            : "border-white/10 hover:border-white/20",
          className
        )}
        maxLength={maxLength}
        value={value}
        onChange={handleChange}
        {...props}
      />
      {maxLength && (
        <div className="absolute bottom-2 right-3 text-xs text-zinc-500 tabular-nums">
          {charCount}/{maxLength}
        </div>
      )}
      {error && (
        <p className="mt-1 text-xs text-red-400 animate-fadeIn">{error}</p>
      )}
    </div>
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
