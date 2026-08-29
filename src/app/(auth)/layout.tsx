export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <span className="text-2xl">💰</span>
          <span className="text-xl font-semibold text-white">Finanças</span>
        </div>
        {children}
      </div>
    </div>
  );
}
