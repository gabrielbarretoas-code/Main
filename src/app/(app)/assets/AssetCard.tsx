"use client";

import { useRef, useState, useTransition } from "react";
import { Home, Car, Paperclip, Trash2, FileText } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import CategorySubcategoryPicker from "@/components/CategorySubcategoryPicker";
import type { CategoryOption } from "@/lib/categoryOptions";
import type { Entity, TransactionType } from "@/lib/types";
import {
  deleteAsset,
  uploadAssetDocument,
  removeAssetDocument,
  createAssetTransaction,
  type AssetDocumentResult,
} from "./actions";
import { quickCreateCategory } from "../reconciliation/actions";

type Document = { id: string; url: string; name: string };
type Option = { id: string; name: string };

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|heic)$/i;

export default function AssetCard({
  asset,
  totalIncome,
  totalExpense,
  accounts,
  categories: initialCategories,
  entity,
}: {
  asset: {
    id: string;
    kind: "PROPERTY" | "VEHICLE";
    name: string;
    acquisitionDate: Date | null;
    acquisitionValue: number | null;
    currentValue: number | null;
    note: string | null;
    documents: Document[];
  };
  totalIncome: number;
  totalExpense: number;
  accounts: Option[];
  categories: CategoryOption[];
  entity: Entity;
}) {
  const [documents, setDocuments] = useState(asset.documents);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [uploading, startUpload] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [type, setType] = useState<TransactionType>("EXPENSE");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState(initialCategories);
  const formRef = useRef<HTMLFormElement>(null);

  const Icon = asset.kind === "PROPERTY" ? Home : Car;

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachmentError(null);
    const formData = new FormData();
    formData.append("file", file);
    startUpload(async () => {
      const result: AssetDocumentResult = await uploadAssetDocument(asset.id, formData);
      if (result.ok) {
        setDocuments((prev) => [...prev, { id: result.id, url: result.url, name: result.name }]);
      } else {
        setAttachmentError(result.error);
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  }

  function handleRemoveDocument(id: string) {
    startUpload(async () => {
      await removeAssetDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    });
  }

  async function handleCreateCategory(name: string, catType: TransactionType, parentId: string | null) {
    const created = await quickCreateCategory(name, catType, entity, parentId);
    if (!created) return null;
    const option: CategoryOption = { ...created, parentId, type: catType };
    setCategories((prev) => [...prev, option]);
    return option;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-full bg-brand-gold-light text-brand-navy flex items-center justify-center shrink-0">
            <Icon size={18} />
          </span>
          <div>
            <p className="font-medium text-slate-800">{asset.name}</p>
            <p className="text-xs text-slate-400">
              {asset.kind === "PROPERTY" ? "Imóvel" : "Automóvel"}
              {asset.acquisitionDate ? ` · adquirido em ${formatDate(asset.acquisitionDate)}` : ""}
            </p>
            {asset.note && <p className="text-xs text-slate-400 mt-0.5">{asset.note}</p>}
          </div>
        </div>
        <div className="text-right">
          {asset.currentValue != null && (
            <>
              <p className="text-xs text-slate-400">Valor atual</p>
              <p className="font-medium text-slate-800">{formatCurrency(asset.currentValue)}</p>
            </>
          )}
        </div>
        <form action={deleteAsset.bind(null, asset.id)}>
          <button className="text-xs text-red-500 hover:underline">Remover</button>
        </form>
      </div>

      <div className="flex flex-wrap gap-6 text-sm bg-slate-50 rounded-lg px-3 py-2">
        <span className="text-emerald-600">
          Receitas: <span className="font-medium">{formatCurrency(totalIncome)}</span>
        </span>
        <span className="text-red-600">
          Despesas: <span className="font-medium">{formatCurrency(totalExpense)}</span>
        </span>
      </div>

      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Documentos</p>
        {documents.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {documents.map((doc) => (
              <span
                key={doc.id}
                className="flex items-center gap-1.5 text-xs bg-slate-100 rounded-full pl-2.5 pr-1.5 py-1"
              >
                {IMAGE_EXT.test(doc.name) ? <Paperclip size={12} /> : <FileText size={12} />}
                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="hover:underline max-w-[140px] truncate">
                  {doc.name}
                </a>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => handleRemoveDocument(doc.id)}
                  className="text-slate-400 hover:text-red-500 disabled:opacity-40"
                >
                  <Trash2 size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
        <label className="inline-flex items-center gap-1.5 text-xs text-brand-navy cursor-pointer hover:underline">
          <Paperclip size={13} />
          {uploading ? "Enviando…" : "Anexar documento (escritura, CRLV, seguro…)"}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            disabled={uploading}
            onChange={handleFileSelected}
          />
        </label>
        {attachmentError && <p className="text-xs text-red-500 mt-1">{attachmentError}</p>}
      </div>

      <div className="border-t border-slate-100 pt-3">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
          Lançar despesa ou receita deste bem
        </p>
        <form
          ref={formRef}
          action={async (fd) => {
            fd.set("categoryId", categoryId);
            await createAssetTransaction(fd);
            formRef.current?.reset();
            setCategoryId("");
            setType("EXPENSE");
          }}
          className="flex flex-wrap gap-2 items-end"
        >
          <input type="hidden" name="assetId" value={asset.id} />
          <input type="hidden" name="entity" value={entity} />
          <input name="description" required placeholder="Ex: IPTU" className="input py-1.5 text-sm flex-1 min-w-[120px]" />
          <input
            name="amount"
            required
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            className="input py-1.5 text-sm w-24"
          />
          <select
            name="type"
            value={type}
            onChange={(e) => {
              setType(e.target.value as TransactionType);
              setCategoryId("");
            }}
            className="input py-1.5 text-sm"
          >
            <option value="EXPENSE">Despesa</option>
            <option value="INCOME">Receita</option>
          </select>
          <select name="accountId" required className="input py-1.5 text-sm">
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <CategorySubcategoryPicker
            type={type}
            categories={categories}
            value={categoryId}
            onChange={setCategoryId}
            onCategoryCreated={() => {}}
            createCategory={handleCreateCategory}
          />
          <input
            name="date"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="input py-1.5 text-sm"
          />
          <button
            disabled={accounts.length === 0}
            className="text-xs bg-slate-800 text-white rounded-md px-3 py-1.5 hover:bg-slate-900 disabled:opacity-50 whitespace-nowrap"
          >
            Lançar
          </button>
        </form>
      </div>
    </div>
  );
}
