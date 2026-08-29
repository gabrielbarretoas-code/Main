export const DEFAULT_CATEGORIES = [
  // Pessoal — despesas
  { name: "Moradia", type: "EXPENSE", entity: "PERSONAL", color: "#6366f1" },
  { name: "Supermercado", type: "EXPENSE", entity: "PERSONAL", color: "#f59e0b" },
  { name: "Restaurantes e Delivery", type: "EXPENSE", entity: "PERSONAL", color: "#fb923c" },
  { name: "Transporte", type: "EXPENSE", entity: "PERSONAL", color: "#0ea5e9" },
  { name: "Saúde", type: "EXPENSE", entity: "PERSONAL", color: "#ef4444" },
  { name: "Educação", type: "EXPENSE", entity: "PERSONAL", color: "#a855f7" },
  { name: "Lazer e Entretenimento", type: "EXPENSE", entity: "PERSONAL", color: "#ec4899" },
  { name: "Vestuário", type: "EXPENSE", entity: "PERSONAL", color: "#d946ef" },
  { name: "Assinaturas e Streaming", type: "EXPENSE", entity: "PERSONAL", color: "#14b8a6" },
  { name: "Cuidados Pessoais", type: "EXPENSE", entity: "PERSONAL", color: "#f472b6" },
  { name: "Pets", type: "EXPENSE", entity: "PERSONAL", color: "#84cc16" },
  { name: "Viagens", type: "EXPENSE", entity: "PERSONAL", color: "#06b6d4" },
  { name: "Presentes e Doações", type: "EXPENSE", entity: "PERSONAL", color: "#f43f5e" },
  { name: "Impostos e Taxas", type: "EXPENSE", entity: "PERSONAL", color: "#78716c" },
  { name: "Investimentos", type: "EXPENSE", entity: "PERSONAL", color: "#22c55e" },
  { name: "Outros", type: "EXPENSE", entity: "PERSONAL", color: "#94a3b8" },

  // Pessoal — receitas
  { name: "Salário", type: "INCOME", entity: "PERSONAL", color: "#22c55e" },
  { name: "Freelance / Renda Extra", type: "INCOME", entity: "PERSONAL", color: "#16a34a" },
  { name: "Rendimentos de Investimentos", type: "INCOME", entity: "PERSONAL", color: "#15803d" },
  { name: "Reembolso", type: "INCOME", entity: "PERSONAL", color: "#4ade80" },
  { name: "Outros", type: "INCOME", entity: "PERSONAL", color: "#86efac" },

  // Comercial — despesas
  { name: "Fornecedores", type: "EXPENSE", entity: "BUSINESS", color: "#6366f1" },
  { name: "Folha de Pagamento", type: "EXPENSE", entity: "BUSINESS", color: "#ef4444" },
  { name: "Pró-labore", type: "EXPENSE", entity: "BUSINESS", color: "#dc2626" },
  { name: "Aluguel e Ocupação", type: "EXPENSE", entity: "BUSINESS", color: "#7c3aed" },
  { name: "Marketing e Publicidade", type: "EXPENSE", entity: "BUSINESS", color: "#ec4899" },
  { name: "Impostos e Taxas", type: "EXPENSE", entity: "BUSINESS", color: "#78716c" },
  { name: "Serviços Profissionais", type: "EXPENSE", entity: "BUSINESS", color: "#0ea5e9" },
  { name: "Tecnologia e Software", type: "EXPENSE", entity: "BUSINESS", color: "#14b8a6" },
  { name: "Manutenção e Infraestrutura", type: "EXPENSE", entity: "BUSINESS", color: "#a3a3a3" },
  { name: "Logística e Frete", type: "EXPENSE", entity: "BUSINESS", color: "#f97316" },
  { name: "Viagens Corporativas", type: "EXPENSE", entity: "BUSINESS", color: "#06b6d4" },
  { name: "Despesas Bancárias", type: "EXPENSE", entity: "BUSINESS", color: "#64748b" },
  { name: "Outros", type: "EXPENSE", entity: "BUSINESS", color: "#94a3b8" },

  // Comercial — receitas
  { name: "Vendas de Produtos", type: "INCOME", entity: "BUSINESS", color: "#22c55e" },
  { name: "Serviços Prestados", type: "INCOME", entity: "BUSINESS", color: "#16a34a" },
  { name: "Outras Receitas", type: "INCOME", entity: "BUSINESS", color: "#86efac" },
] as const;

/**
 * Padrões de descrição que costumam indicar movimentação entre contas ou
 * aplicação/resgate automático (ex: "varredura" de saldo do banco para um
 * fundo de investimento) — não são despesa nem receita de verdade.
 */
export const TRANSFER_KEYWORDS = [
  "rende facil",
  "rende fácil",
  "cofrinho",
  "aplicacao automatica",
  "aplicação automática",
  "resgate automatico",
  "resgate automático",
  "poupanca automatica",
  "poupança automática",
  "transferencia entre contas",
  "transferência entre contas",
  "ted mesma titularidade",
  "doc mesma titularidade",
];

export const DEFAULT_COST_CENTERS = [
  "Administrativo",
  "Comercial e Vendas",
  "Marketing",
  "Operacional",
  "Financeiro",
] as const;

/**
 * Dicionário de palavras-chave para sugerir automaticamente uma categoria a
 * partir da descrição de um lançamento importado. A primeira categoria cujo
 * nome existir na organização e cuja palavra-chave bater é sugerida.
 */
export const CATEGORY_KEYWORD_RULES: { category: string; keywords: string[] }[] = [
  { category: "Supermercado", keywords: ["supermercado", "mercado", "atacad", "hortifruti"] },
  {
    category: "Restaurantes e Delivery",
    keywords: ["restaurante", "lanchonete", "ifood", "rappi", "delivery", "padaria", "cafeteria", "pizzaria"],
  },
  {
    category: "Transporte",
    keywords: ["uber", "99 ", "99app", "posto", "combustivel", "combustível", "estacionamento", "pedagio", "pedágio"],
  },
  { category: "Saúde", keywords: ["farmacia", "farmácia", "drogaria", "hospital", "clinica", "clínica", "laboratorio"] },
  { category: "Educação", keywords: ["escola", "faculdade", "curso", "mensalidade escolar", "udemy"] },
  {
    category: "Assinaturas e Streaming",
    keywords: ["netflix", "spotify", "amazon prime", "disney", "hbo", "youtube premium", "assinatura"],
  },
  { category: "Vestuário", keywords: ["renner", "riachuelo", "zara", "c&a", "loja de roupa"] },
  { category: "Pets", keywords: ["petshop", "pet shop", "veterinari"] },
  { category: "Viagens", keywords: ["hotel", "pousada", "passagem aerea", "passagem aérea", "airbnb", "latam", "gol linhas", "azul linhas"] },
  { category: "Moradia", keywords: ["aluguel", "condominio", "condomínio", "energia eletrica", "energia elétrica", "iptu", "agua e esgoto", "internet fibra", "giga mais fibra"] },
  { category: "Impostos e Taxas", keywords: ["darf", "das ", "irpf", "inss", "iof", "tarifa"] },
  { category: "Salário", keywords: ["salario", "salário", "folha de pagamento"] },
  { category: "Fornecedores", keywords: ["fornecedor", "distribuidora"] },
  { category: "Marketing e Publicidade", keywords: ["facebook ads", "google ads", "meta ads", "publicidade", "agencia de marketing"] },
  { category: "Tecnologia e Software", keywords: ["software", "saas", "hospedagem", "dominio", "domínio", "aws", "google cloud", "microsoft"] },
];
