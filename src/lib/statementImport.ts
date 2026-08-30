export type ParsedTransaction = {
  date: Date;
  description: string;
  amount: number; // signed: negative = despesa, positive = receita
  externalId?: string; // ex: FITID do OFX — identificador estável do banco, quando disponível
};

/** Normaliza a descrição para comparação (minúsculas, sem espaços duplicados/nas pontas). */
export function normalizeDescription(description: string): string {
  return description.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Chave de deduplicação de um lançamento importado. Usa o identificador do
 * banco (ex: FITID do OFX) quando disponível — é a forma mais confiável.
 * Sem isso, cai para uma assinatura por data+valor+descrição: não é infalível
 * (duas compras idênticas no mesmo dia colidem), mas cobre o caso real que
 * importa — reimportar o mesmo extrato (ou um extrato com sobreposição de
 * datas) não deve duplicar lançamento nenhum.
 */
export function computeDedupeKey(t: ParsedTransaction): string {
  if (t.externalId) return `id:${t.externalId}`;
  const day = t.date.toISOString().slice(0, 10);
  const cents = Math.round(t.amount * 100);
  return `sig:${day}:${cents}:${normalizeDescription(t.description)}`;
}

const DATE_KEYS = [
  "data",
  "date",
  "dt",
  "data lancamento",
  "data lançamento",
  "data movimento",
  "dt movimento",
];

const DESC_KEYS = [
  "descricao",
  "descrição",
  "description",
  "historico",
  "histórico",
  "memo",
  "lancamento",
  "lançamento",
  "detalhes",
];

const AMOUNT_KEYS = ["valor", "amount", "value", "valor (r$)", "valor r$"];
const DEBIT_KEYS = ["debito", "débito", "debit", "saida", "saída", "valor debito", "valor débito"];
const CREDIT_KEYS = ["credito", "crédito", "credit", "entrada", "valor credito", "valor crédito"];

export function parseAmount(raw: string): number {
  const cleaned = raw.replace(/[^\d,.-]/g, "");
  if (cleaned.includes(",") && cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")) {
    return parseFloat(cleaned.replace(/\./g, "").replace(",", "."));
  }
  return parseFloat(cleaned.replace(/,/g, ""));
}

export function parseDate(raw: string): Date | null {
  const trimmed = raw.trim();
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return new Date(trimmed);
  const brMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (brMatch) {
    const [, d, m, y] = brMatch;
    const year = y.length === 2 ? `20${y}` : y;
    return new Date(`${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
  }
  const brDashMatch = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})/);
  if (brDashMatch) {
    const [, d, m, y] = brDashMatch;
    const year = y.length === 2 ? `20${y}` : y;
    return new Date(`${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
  }
  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? null : d;
}

export function isBalanceLine(description: string): boolean {
  const stripped = description.replace(/\s+/g, "").toLowerCase();
  return stripped.startsWith("saldo") || stripped === "totalperiodo" || stripped === "total";
}

function pick(row: Record<string, string>, keys: string[]): string | undefined {
  const lowerMap = Object.fromEntries(
    Object.entries(row).map(([k, v]) => [k.trim().toLowerCase(), v])
  );
  for (const k of keys) {
    if (lowerMap[k] !== undefined && lowerMap[k] !== "") return lowerMap[k];
  }
  for (const k of keys) {
    const found = Object.entries(lowerMap).find(([header]) => header.startsWith(k));
    if (found && found[1] !== "") return found[1];
  }
  return undefined;
}

/** Normaliza uma linha genérica (objeto com cabeçalhos como chave) vinda de CSV ou Excel. */
export function normalizeGenericRow(row: Record<string, string>): ParsedTransaction | null {
  const dateRaw = pick(row, DATE_KEYS);
  const descRaw = pick(row, DESC_KEYS);
  if (!dateRaw || !descRaw) return null;
  if (isBalanceLine(descRaw)) return null;

  let amountValue: number | null = null;
  const amountRaw = pick(row, AMOUNT_KEYS);
  if (amountRaw !== undefined) {
    amountValue = parseAmount(amountRaw);
  } else {
    const debitRaw = pick(row, DEBIT_KEYS);
    const creditRaw = pick(row, CREDIT_KEYS);
    const debit = debitRaw ? Math.abs(parseAmount(debitRaw) || 0) : 0;
    const credit = creditRaw ? Math.abs(parseAmount(creditRaw) || 0) : 0;
    if (debit || credit) amountValue = credit - debit;
  }

  if (amountValue === null || isNaN(amountValue) || amountValue === 0) return null;

  const date = parseDate(dateRaw);
  if (!date) return null;

  return { date, description: descRaw.trim(), amount: amountValue };
}

export async function decodeFileText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    // Extratos de bancos brasileiros costumam vir em Latin-1/Windows-1252,
    // não UTF-8 — decodificar como UTF-8 corromperia os acentos.
    return new TextDecoder("windows-1252").decode(buffer);
  }
}

export function detectFileKind(fileName: string): "csv" | "xlsx" | "ofx" | "pdf" | "unknown" {
  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  if (ext === "csv" || ext === "txt") return "csv";
  if (ext === "xlsx" || ext === "xls") return "xlsx";
  if (ext === "ofx" || ext === "qfx") return "ofx";
  if (ext === "pdf") return "pdf";
  return "unknown";
}

function extractOfxTag(chunk: string, tag: string): string | null {
  const match = chunk.match(new RegExp(`<${tag}>([^<\r\n]*)`, "i"));
  return match ? match[1].trim() : null;
}

function parseOfxDate(raw: string): Date | null {
  const match = raw.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!match) return null;
  const [, y, m, d] = match;
  return new Date(`${y}-${m}-${d}`);
}

/** Formato OFX (Open Financial Exchange) — usado por praticamente todo internet banking. */
export function parseOfxTransactions(text: string): ParsedTransaction[] {
  const results: ParsedTransaction[] = [];
  const blocks = text.split(/<STMTTRN>/i).slice(1);

  for (const block of blocks) {
    const endIndex = block.search(/<\/STMTTRN>/i);
    const chunk = endIndex >= 0 ? block.slice(0, endIndex) : block;

    const dtposted = extractOfxTag(chunk, "DTPOSTED");
    const trnamt = extractOfxTag(chunk, "TRNAMT");
    const memo = extractOfxTag(chunk, "MEMO");
    const name = extractOfxTag(chunk, "NAME");
    const trntype = extractOfxTag(chunk, "TRNTYPE");
    const fitid = extractOfxTag(chunk, "FITID");

    if (!dtposted || !trnamt) continue;

    const date = parseOfxDate(dtposted);
    const amount = parseFloat(trnamt.replace(",", "."));
    const description = (memo || name || trntype || "Transação").trim();

    if (!date || isNaN(amount) || amount === 0) continue;
    if (isBalanceLine(description)) continue;

    results.push({ date, description, amount, externalId: fitid || undefined });
  }

  return results;
}

/**
 * Extrai transações de um PDF de extrato pelo texto (best-effort).
 * Funciona bem para PDFs com texto selecionável, uma transação por linha
 * (data no início, valor no fim). Não funciona com PDFs escaneados/imagem
 * — isso exigiria OCR.
 */
export async function parsePdfTransactions(file: File): Promise<ParsedTransaction[]> {
  const buffer = new Uint8Array(await file.arrayBuffer());
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  await parser.destroy();

  const lines = result.text
    .split("\n")
    .map((l: string) => l.trim())
    .filter(Boolean);

  const lineRegex =
    /^(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s+(.+?)\s+(-?\s?R?\$?\s?-?[\d.,]+)\s*([DC])?$/i;

  const results: ParsedTransaction[] = [];

  for (const line of lines) {
    const match = line.match(lineRegex);
    if (!match) continue;
    const [, dateRaw, descRaw, amountRaw, marker] = match;

    if (isBalanceLine(descRaw)) continue;

    const date = parseDate(dateRaw);
    let amount = parseAmount(amountRaw);
    if (isNaN(amount)) continue;

    const markerUpper = marker?.toUpperCase();
    if (markerUpper === "D") amount = -Math.abs(amount);
    if (markerUpper === "C") amount = Math.abs(amount);

    if (!date || amount === 0) continue;

    results.push({ date, description: descRaw.trim(), amount });
  }

  return results;
}

export async function parseXlsxRows(file: File): Promise<Record<string, string>[]> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
    defval: "",
    raw: false,
  });
  return rows;
}
