export type CategoryDef = {
  name: string;
  type: "INCOME" | "EXPENSE";
  entity: "PERSONAL" | "BUSINESS";
  color: string;
  icon: string;
  children?: string[];
};

export const DEFAULT_CATEGORY_TREE: CategoryDef[] = [
  // Pessoal — despesas
  {
    name: "Moradia",
    type: "EXPENSE",
    entity: "PERSONAL",
    color: "#6366f1",
    icon: "Home",
    children: [
      "Aluguel ou Financiamento",
      "Condomínio",
      "Energia Elétrica",
      "Água e Esgoto",
      "Internet e Telefone",
      "Manutenção e Reparos",
    ],
  },
  {
    name: "Alimentação",
    type: "EXPENSE",
    entity: "PERSONAL",
    color: "#f59e0b",
    icon: "UtensilsCrossed",
    children: ["Supermercado", "Restaurantes e Delivery", "Padaria e Conveniência"],
  },
  {
    name: "Transporte",
    type: "EXPENSE",
    entity: "PERSONAL",
    color: "#0ea5e9",
    icon: "Car",
    children: [
      "Combustível",
      "Aplicativos de Transporte",
      "Transporte Público",
      "Manutenção do Veículo",
      "Estacionamento e Pedágio",
    ],
  },
  {
    name: "Saúde",
    type: "EXPENSE",
    entity: "PERSONAL",
    color: "#ef4444",
    icon: "HeartPulse",
    children: ["Plano de Saúde", "Farmácia", "Consultas e Exames"],
  },
  {
    name: "Educação",
    type: "EXPENSE",
    entity: "PERSONAL",
    color: "#a855f7",
    icon: "GraduationCap",
    children: ["Mensalidade Escolar", "Cursos e Livros"],
  },
  { name: "Lazer e Entretenimento", type: "EXPENSE", entity: "PERSONAL", color: "#ec4899", icon: "PartyPopper" },
  { name: "Vestuário", type: "EXPENSE", entity: "PERSONAL", color: "#d946ef", icon: "Shirt" },
  { name: "Assinaturas e Streaming", type: "EXPENSE", entity: "PERSONAL", color: "#14b8a6", icon: "Tv" },
  { name: "Cuidados Pessoais", type: "EXPENSE", entity: "PERSONAL", color: "#f472b6", icon: "Sparkles" },
  { name: "Pets", type: "EXPENSE", entity: "PERSONAL", color: "#84cc16", icon: "PawPrint" },
  { name: "Viagens", type: "EXPENSE", entity: "PERSONAL", color: "#06b6d4", icon: "Plane" },
  { name: "Presentes e Doações", type: "EXPENSE", entity: "PERSONAL", color: "#f43f5e", icon: "Gift" },
  { name: "Impostos e Taxas", type: "EXPENSE", entity: "PERSONAL", color: "#78716c", icon: "Receipt" },
  { name: "Outros", type: "EXPENSE", entity: "PERSONAL", color: "#94a3b8", icon: "Tag" },

  // Pessoal — receitas
  { name: "Salário", type: "INCOME", entity: "PERSONAL", color: "#22c55e", icon: "Banknote" },
  { name: "Freelance / Renda Extra", type: "INCOME", entity: "PERSONAL", color: "#16a34a", icon: "HandCoins" },
  {
    name: "Rendimentos de Investimentos",
    type: "INCOME",
    entity: "PERSONAL",
    color: "#15803d",
    icon: "TrendingUp",
  },
  { name: "Reembolso", type: "INCOME", entity: "PERSONAL", color: "#4ade80", icon: "Receipt" },
  { name: "Outros", type: "INCOME", entity: "PERSONAL", color: "#86efac", icon: "Tag" },

  // Comercial — despesas
  { name: "Fornecedores", type: "EXPENSE", entity: "BUSINESS", color: "#6366f1", icon: "Truck" },
  {
    name: "Folha de Pagamento",
    type: "EXPENSE",
    entity: "BUSINESS",
    color: "#ef4444",
    icon: "Users",
    children: ["Salários", "Benefícios", "Encargos Trabalhistas"],
  },
  { name: "Pró-labore", type: "EXPENSE", entity: "BUSINESS", color: "#dc2626", icon: "Wallet" },
  { name: "Aluguel e Ocupação", type: "EXPENSE", entity: "BUSINESS", color: "#7c3aed", icon: "Building2" },
  { name: "Marketing e Publicidade", type: "EXPENSE", entity: "BUSINESS", color: "#ec4899", icon: "Megaphone" },
  {
    name: "Impostos e Taxas",
    type: "EXPENSE",
    entity: "BUSINESS",
    color: "#78716c",
    icon: "Landmark",
    children: ["Simples Nacional / DAS", "Impostos Federais", "Taxas Municipais"],
  },
  {
    name: "Serviços Profissionais",
    type: "EXPENSE",
    entity: "BUSINESS",
    color: "#0ea5e9",
    icon: "Briefcase",
    children: ["Contabilidade", "Jurídico", "Consultoria"],
  },
  { name: "Tecnologia e Software", type: "EXPENSE", entity: "BUSINESS", color: "#14b8a6", icon: "Laptop" },
  { name: "Manutenção e Infraestrutura", type: "EXPENSE", entity: "BUSINESS", color: "#a3a3a3", icon: "Wrench" },
  { name: "Logística e Frete", type: "EXPENSE", entity: "BUSINESS", color: "#f97316", icon: "PackageCheck" },
  { name: "Viagens Corporativas", type: "EXPENSE", entity: "BUSINESS", color: "#06b6d4", icon: "Plane" },
  { name: "Despesas Bancárias", type: "EXPENSE", entity: "BUSINESS", color: "#64748b", icon: "Landmark" },
  { name: "Outros", type: "EXPENSE", entity: "BUSINESS", color: "#94a3b8", icon: "Tag" },

  // Comercial — receitas
  { name: "Vendas de Produtos", type: "INCOME", entity: "BUSINESS", color: "#22c55e", icon: "ShoppingCart" },
  { name: "Serviços Prestados", type: "INCOME", entity: "BUSINESS", color: "#16a34a", icon: "Briefcase" },
  { name: "Outras Receitas", type: "INCOME", entity: "BUSINESS", color: "#86efac", icon: "Tag" },
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
    category: "Combustível",
    keywords: ["posto", "combustivel", "combustível", "shell", "ipiranga", "petrobras"],
  },
  {
    category: "Aplicativos de Transporte",
    keywords: ["uber", "99 ", "99app", "99pop", "cabify"],
  },
  { category: "Estacionamento e Pedágio", keywords: ["estacionamento", "pedagio", "pedágio", "zona azul"] },
  { category: "Farmácia", keywords: ["farmacia", "farmácia", "drogaria"] },
  { category: "Consultas e Exames", keywords: ["hospital", "clinica", "clínica", "laboratorio", "laboratório"] },
  { category: "Mensalidade Escolar", keywords: ["escola", "faculdade", "mensalidade escolar"] },
  { category: "Cursos e Livros", keywords: ["curso", "udemy", "livraria"] },
  {
    category: "Assinaturas e Streaming",
    keywords: ["netflix", "spotify", "amazon prime", "disney", "hbo", "youtube premium", "assinatura"],
  },
  { category: "Vestuário", keywords: ["renner", "riachuelo", "zara", "c&a", "loja de roupa"] },
  { category: "Pets", keywords: ["petshop", "pet shop", "veterinari"] },
  { category: "Viagens", keywords: ["hotel", "pousada", "passagem aerea", "passagem aérea", "airbnb", "latam", "gol linhas", "azul linhas"] },
  {
    category: "Internet e Telefone",
    keywords: ["internet fibra", "giga mais fibra", "vivo fibra", "claro net", "operadora de telefonia"],
  },
  { category: "Energia Elétrica", keywords: ["energia eletrica", "energia elétrica", "cemig", "enel", "light"] },
  { category: "Água e Esgoto", keywords: ["agua e esgoto", "água e esgoto", "sabesp", "copasa"] },
  { category: "Condomínio", keywords: ["condominio", "condomínio"] },
  { category: "Aluguel ou Financiamento", keywords: ["aluguel", "financiamento imobiliario", "financiamento imobiliário"] },
  { category: "Impostos e Taxas", keywords: ["darf", "das ", "irpf", "inss", "iof", "tarifa"] },
  { category: "Salário", keywords: ["salario", "salário", "folha de pagamento"] },
  { category: "Fornecedores", keywords: ["fornecedor", "distribuidora"] },
  { category: "Marketing e Publicidade", keywords: ["facebook ads", "google ads", "meta ads", "publicidade", "agencia de marketing"] },
  { category: "Tecnologia e Software", keywords: ["software", "saas", "hospedagem", "dominio", "domínio", "aws", "google cloud", "microsoft"] },
];

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
