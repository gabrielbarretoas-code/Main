import type { LucideIcon } from "lucide-react";

export default function ComingSoon({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <div className="bg-white rounded-xl border border-slate-200 p-10 flex flex-col items-center text-center gap-3">
        <span className="w-14 h-14 rounded-full bg-brand-gold-light text-brand-navy flex items-center justify-center">
          <Icon size={26} />
        </span>
        <p className="font-medium text-slate-700">Em construção</p>
        <p className="text-sm text-slate-500 max-w-md">{description}</p>
      </div>
    </div>
  );
}
