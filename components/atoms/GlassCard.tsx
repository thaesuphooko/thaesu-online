export default function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`glass-card p-6 ${className}`}>
      {children}
    </div>
  );
}
