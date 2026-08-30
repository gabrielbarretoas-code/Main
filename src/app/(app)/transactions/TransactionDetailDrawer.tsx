"use client";

import { useRef, useState, useTransition } from "react";
import { X, CheckCircle2, Clock, Pencil, Paperclip, Trash2 } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { CategoryOption } from "@/lib/categoryOptions";
import CategorySubcategoryPicker from "@/components/CategorySubcategoryPicker";
import {
  updateTransactionDetails,
  uploadAttachment,
  removeAttachment,
  type TransactionDetailsUpdate,
  type AttachmentResult,
} from "./actions";
import type { Entity } from "@/lib/types";
import type { TransactionRowData } from "./TransactionsTable";

type CostCenter = { id: string; name: string };

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|heic)$/i;

export default function TransactionDetailDrawer({
  transaction,
  categories,
  costCenters,
  entity,
  onClose,
  onSaved,
  onCreateCategory,
  onAttachmentChanged,
}: {
  transaction: TransactionRowData | null;
  categories: CategoryOption[];
  costCenters: CostCenter[];
  entity: Entity;
  onClose: () => void;
  onSaved: (id: string, patch: TransactionDetailsUpdate) => void;
  onCreateCategory: (
    name: string,
    type: TransactionRowData["type"],
    parentId: string | null
  ) => Promise<CategoryOption | null>;
  onAttachmentChanged: (id: string, attachmentUrl: string | null, attachmentName: string | null) => void;
}) {
  const open = transaction !== null;
  const [cached, setCached] = useState<TransactionRowData | null>(transaction);
  const [loadedId, setLoadedId] = useState<string | null>(transaction?.id ?? null);
  const [categoryId, setCategoryId] = useState(transaction?.categoryId ?? "");
  const [costCenterId, setCostCenterId] = useState(transaction?.costCenterId ?? "");
  const [isTransfer, setIsTransfer] = useState(transaction?.isTransfer ?? false);
  const [note, setNote] = useState(transaction?.note ?? "");
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [uploading, startUpload] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (transaction && transaction.id !== loadedId) {
    setLoadedId(transaction.id);
    setCached(transaction);
    setCategoryId(transaction.categoryId ?? "");
    setCostCenterId(transaction.costCenterId ?? "");
    setIsTransfer(transaction.isTransfer);
    setNote(transaction.note ?? "");
    setAttachmentError(null);
  }

  const wasAdjusted =
    cached?.reconciledAt != null &&
    new Date(cached.updatedAt).getTime() - new Date(cached.reconciledAt).getTime() > 60_000;

  function handleSave() {
    if (!cached) return;
    startTransition(async () => {
      const result = await updateTransactionDetails(
        cached.id,
        isTransfer ? null : categoryId || null,
        isTransfer ? null : costCenterId || null,
        isTransfer,
        note || null
      );
      if (result) {
        onSaved(cached.id, result);
        onClose();
      }
    });
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !cached) return;
    setAttachmentError(null);
    const formData = new FormData();
    formData.append("file", file);
    const id = cached.id;
    startUpload(async () => {
      const result: AttachmentResult = await uploadAttachment(id, formData);
      if (result.ok) {
        setCached((prev) => (prev ? { ...prev, attachmentUrl: result.attachmentUrl, attachmentName: result.attachmentName } : prev));
        onAttachmentChanged(id, result.attachmentUrl, result.attachmentName);
      } else {
        setAttachmentError(result.error);
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  }

  function handleRemoveAttachment() {
    if (!cached) return;
    const id = cached.id;
    startUpload(async () => {
      await removeAttachment(id);
      setCached((prev) => (prev ? { ...prev, attachmentUrl: null, attachmentName: null } : prev));
      onAttachmentChanged(id, null, null);
    });
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-900/40 transition-opacity duration-200 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-md bg-white shadow-2xl flex flex-col transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {cached && (
          <>
            <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-100">
              <div className="min-w-0">
                <p className="text-xs text-slate-400 mb-0.5">{formatDateTime(cached.date)}</p>
                <h2 className="font-semibold text-slate-900 truncate">{cached.description}</h2>
              </div>
              <button
                onClick={onClose}
                className="shrink-0 text-slate-400 hover:text-slate-700 rounded-full p-1 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div className="rounded-xl p-4 bg-gradient-to-br from-brand-navy to-brand-navy-dark text-white">
                <p className="text-xs text-slate-300">Valor</p>
                <p
                  className={`text-2xl font-bold ${
                    cached.type === "INCOME" ? "text-emerald-300" : "text-white"
                  }`}
                >
                  {cached.type === "INCOME" ? "+" : "-"}
                  {formatCurrency(cached.amount)}
                </p>
                <p className="text-xs text-slate-300 mt-1">
                  {cached.accountName} ·{" "}
                  {cached.source === "import"
                    ? "importado"
                    : cached.source === "whatsapp"
                      ? "via WhatsApp"
                      : cached.source === "open_finance"
                        ? "Open Finance"
                        : "manual"}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Status</p>
                {cached.reconciled ? (
                  <div className="flex items-start gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                    <span>
                      {cached.reconciledBy === "system"
                        ? "Conciliado automaticamente pelo sistema"
                        : cached.reconciledBy === "whatsapp"
                          ? "Registrado por você via WhatsApp (IA)"
                          : "Conciliado manualmente por você"}{" "}
                      em {cached.reconciledAt ? formatDateTime(cached.reconciledAt) : "—"}
                      {wasAdjusted && (
                        <span className="flex items-center gap-1 text-amber-700 mt-1">
                          <Pencil size={13} />
                          Ajustado por você em {formatDateTime(cached.updatedAt)}
                        </span>
                      )}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                    <Clock size={16} />
                    Pendente de conciliação
                  </div>
                )}
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={isTransfer}
                  onChange={(e) => setIsTransfer(e.target.checked)}
                />
                Transferência / aplicação automática — não conta como despesa/receita
              </label>

              {!isTransfer && (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                      Categoria e subcategoria
                    </p>
                    <CategorySubcategoryPicker
                      type={cached.type}
                      categories={categories}
                      value={categoryId}
                      onChange={setCategoryId}
                      onCategoryCreated={() => {}}
                      createCategory={onCreateCategory}
                    />
                  </div>

                  {entity === "BUSINESS" && costCenters.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                        Centro de custo
                      </p>
                      <select
                        value={costCenterId}
                        onChange={(e) => setCostCenterId(e.target.value)}
                        className="input w-full"
                      >
                        <option value="">Nenhum</option>
                        {costCenters.map((cc) => (
                          <option key={cc.id} value={cc.id}>
                            {cc.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                  Observação
                </p>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Anote qualquer detalhe sobre esse lançamento…"
                  rows={3}
                  className="input w-full resize-none"
                />
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                  Anexo (recibo, nota fiscal…)
                </p>
                {cached.attachmentUrl ? (
                  <div className="border border-slate-200 rounded-lg p-3 space-y-2">
                    {IMAGE_EXT.test(cached.attachmentName ?? "") ? (
                      <a href={`/api/attachments/transaction/${cached.id}`} target="_blank" rel="noopener noreferrer">
                        <img
                          src={`/api/attachments/transaction/${cached.id}`}
                          alt={cached.attachmentName ?? "Anexo"}
                          className="max-h-48 rounded-md border border-slate-100"
                        />
                      </a>
                    ) : (
                      <a
                        href={`/api/attachments/transaction/${cached.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-brand-navy hover:underline"
                      >
                        <Paperclip size={15} />
                        {cached.attachmentName ?? "Ver anexo"}
                      </a>
                    )}
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={handleRemoveAttachment}
                      className="flex items-center gap-1 text-xs text-red-500 hover:underline disabled:opacity-40"
                    >
                      <Trash2 size={13} />
                      Remover anexo
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 justify-center border border-dashed border-slate-300 rounded-lg py-3 text-sm text-slate-500 cursor-pointer hover:border-brand-navy hover:text-brand-navy">
                    <Paperclip size={15} />
                    {uploading ? "Enviando…" : "Anexar recibo ou nota"}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      disabled={uploading}
                      onChange={handleFileSelected}
                    />
                  </label>
                )}
                {attachmentError && (
                  <p className="text-xs text-red-500 mt-1.5">{attachmentError}</p>
                )}
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 flex items-center gap-3">
              <button
                type="button"
                disabled={pending || (!isTransfer && !categoryId)}
                onClick={handleSave}
                className="ml-auto bg-brand-navy text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-brand-navy-light disabled:opacity-40"
              >
                {cached.reconciled ? "Salvar alterações" : "Confirmar conciliação"}
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
