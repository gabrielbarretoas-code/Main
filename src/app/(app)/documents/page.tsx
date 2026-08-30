import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { parseEntity } from "@/lib/types";
import { requireOrganizationId } from "@/lib/session";
import { formatCurrency, formatDate } from "@/lib/format";
import { FileText, Paperclip } from "lucide-react";

export const dynamic = "force-dynamic";

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|heic)$/i;

export default async function DocumentsPage({
  searchParams,
}: PageProps<"/documents">) {
  const sp = await searchParams;
  const entity = parseEntity(sp.entity);
  const organizationId = await requireOrganizationId();

  const documents = await prisma.transaction.findMany({
    where: { organizationId, entity, attachmentUrl: { not: null } },
    include: { account: true, category: true },
    orderBy: { date: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Documentos Fiscais — {entity === "PERSONAL" ? "Pessoal" : "Comercial"}
        </h1>
        <p className="text-sm text-slate-500">
          Recibos e notas fiscais anexados aos seus lançamentos, reunidos aqui para consulta rápida.
        </p>
      </div>

      {documents.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 flex flex-col items-center text-center gap-3">
          <span className="w-14 h-14 rounded-full bg-brand-gold-light text-brand-navy flex items-center justify-center">
            <FileText size={26} />
          </span>
          <p className="font-medium text-slate-700">Nenhum documento ainda</p>
          <p className="text-sm text-slate-500 max-w-md">
            Clique em um lançamento na tela de Lançamentos e anexe um recibo ou nota fiscal — ele
            aparece aqui automaticamente.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {documents.map((t) => (
            <Link
              key={t.id}
              href={`/transactions?entity=${entity}&open=${t.id}`}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-brand-navy hover:shadow-sm transition-shadow"
            >
              <div className="aspect-[4/3] bg-slate-50 flex items-center justify-center overflow-hidden">
                {IMAGE_EXT.test(t.attachmentName ?? "") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/attachments/transaction/${t.id}`}
                    alt={t.attachmentName ?? "Documento"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Paperclip size={28} className="text-slate-300" />
                )}
              </div>
              <div className="p-3">
                <p className="text-sm font-medium text-slate-800 truncate">{t.description}</p>
                <p className="text-xs text-slate-400 truncate">
                  {formatDate(t.date)} · {t.account.name}
                  {t.category ? ` · ${t.category.name}` : ""}
                </p>
                <p
                  className={`text-sm font-medium mt-1 ${
                    t.type === "INCOME" ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {t.type === "INCOME" ? "+" : "-"}
                  {formatCurrency(t.amount)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
