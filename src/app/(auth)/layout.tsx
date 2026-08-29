import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-navy px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <Image
            src="/logo-oportuno.jpeg"
            alt="Oportuno"
            width={220}
            height={73}
            className="rounded-md"
            priority
          />
        </div>
        {children}
        <p className="text-center text-xs text-slate-400 mt-6">Oportuno Finanças</p>
      </div>
    </div>
  );
}
