# PRD — App de Controle de Investimentos

**Produto:** Investment Tracker  
**Versão:** 1.0  
**Data:** 2026-05-06  
**Status:** Em produção — https://investment-tracker-murex-rho.vercel.app

---

## 1. Visão Geral

Aplicação web pessoal para controle e acompanhamento de investimentos em ações, ETFs e criptomoedas. O usuário pode registrar compras e vendas, acompanhar o portfólio em tempo real, calcular ganhos/perdas com metodologia FIFO e gerar relatórios fiscais estimados.

---

## 2. Objetivos

- Centralizar o controle de todos os investimentos em um único lugar
- Calcular automaticamente o custo médio e ganho/perda por lote (FIFO)
- Suportar múltiplos brokers e tipos de conta (corretora, IRA, 401k, etc.)
- Gerar relatórios para declaração de imposto de renda com ganhos realizados
- Atualizar preços automaticamente via APIs gratuitas
- Ser acessível de qualquer dispositivo (desktop e mobile)

---

## 3. Usuários

Investidor pessoa física que:
- Possui ativos em uma ou mais corretoras
- Quer acompanhar o desempenho do portfólio sem depender de planilhas
- Precisa de estimativas de ganho/perda para fins fiscais
- Não é necessariamente técnico — interface deve ser simples e direta

---

## 4. Funcionalidades

### 4.1 Autenticação
- Cadastro e login com e-mail e senha (Supabase Auth)
- Recuperação de senha por e-mail
- Todos os dados são isolados por usuário (Row Level Security)

### 4.2 Dashboard
- Valor total do portfólio (em tempo real com preços atualizados)
- Lucro/perda não realizado total e por ativo
- Alocação por tipo de ativo (gráfico de pizza)
- Evolução histórica do portfólio (gráfico de linha)
- Botão para atualizar preços manualmente

### 4.3 Brokers
- Cadastro de corretoras (nome, tipo)
- Brokers padrão pré-populados via seed: Fidelity, Vanguard, Coinbase, Robinhood, Webull

### 4.4 Tipos de Conta
- Cadastro de tipos de conta com tratamento fiscal
- Padrão pré-populado: Brokerage, Roth IRA, Traditional IRA, 401k, HSA

### 4.5 Contas
- Contas vinculam um broker + tipo de conta
- Ex: "Roth IRA na Fidelity"
- Suporte a múltiplas contas simultâneas

### 4.6 Ativos (Assets)
- Cadastro de ativos com ticker, nome, tipo (STOCK, ETF, CRYPTO) e fonte de preço
- Preços atualizados via **Yahoo Finance** (ações/ETFs, gratuito, sem chave de API)
- Botão "Refresh Prices" na página de ativos para atualização manual imediata

### 4.7 Transações
- Registro de compra (Buy): ativo, conta, data, quantidade, preço unitário, taxa
- Registro de venda (Sell): seleciona lotes disponíveis via FIFO
- Registro de dividendos (Dividend): valor recebido sem movimentação de lotes
- Histórico completo de transações com filtros

### 4.8 Engine FIFO
- Cada compra cria um tax lot
- Vendas consomem lotes na ordem FIFO (first in, first out)
- Classificação automática: curto prazo (<1 ano) vs longo prazo (>1 ano)
- Ganho/perda calculado por lote com custo de base exato

### 4.9 Import CSV
- Upload de CSV com mapeamento de colunas
- Importação em lote de histórico de qualquer corretora
- Suporte a tipos: BUY, SELL e DIVIDEND
- Detecção de duplicatas em duas camadas:
  - **Preview (client-side):** linhas duplicadas são marcadas em amarelo antes de importar
  - **Servidor (safety net):** duplicatas são ignoradas antes do INSERT mesmo sem filtro client-side
- Critério de duplicata: ticker + data + tipo + quantidade (±0.01%) + preço (±0.01%)
- Toast de confirmação mostra quantas transações foram importadas e quantas duplicatas foram ignoradas

### 4.10 Relatórios
- Relatório de ganhos realizados com custo de base, preço de venda, ganho/perda
- Estimativa de imposto baseada nas alíquotas configuradas por ano
- Export em PDF e CSV

### 4.11 Settings
- Gerenciamento de brokers e tipos de conta
- Configuração de alíquotas de imposto por ano (curto prazo e longo prazo)
- Tema claro / escuro

### 4.12 Atualização Automática de Preços
- Cron job diário configurado no Vercel: `0 21 * * 1-5` (21h UTC = 4pm ET)
- Vercel Cron envia requisição `GET /api/prices/update` (autenticado via `CRON_SECRET`)
- Botão "Refresh Prices" na página de Assets envia `POST /api/prices/update` (autenticado via sessão)
- Fonte: Yahoo Finance — gratuito, sem chave de API
- Salva snapshot diário do portfólio para o gráfico histórico

---

## 5. Stack Técnica

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 14 (App Router) |
| Linguagem | TypeScript (strict mode) |
| Estilo | Tailwind CSS + shadcn/ui |
| Banco de dados | PostgreSQL via Supabase |
| Autenticação | Supabase Auth (e-mail/senha) |
| ORM | Supabase JS Client (sem ORM) |
| Segurança | Row Level Security (RLS) em todas as tabelas |
| Gráficos | Recharts |
| PDF export | jsPDF + jspdf-autotable |
| CSV parsing | PapaParse |
| Validação | Zod + React Hook Form |
| Deploy | Vercel (hobby plan) |
| Preços — ações/ETFs | Yahoo Finance via API pública (sem chave) |
| Preços — crypto | CoinGecko (sem chave) |

---

## 6. Schema do Banco de Dados

### Tabelas principais

| Tabela | Descrição |
|---|---|
| `profiles` | Nome do usuário, criado automaticamente no signup |
| `brokers` | Definições de corretoras |
| `account_types` | Tipos de conta com tratamento fiscal |
| `accounts` | Contas do usuário (broker + account_type) |
| `assets` | Ativos (ticker, nome, tipo, fonte de preço) |
| `transactions` | Todas as compras e vendas |
| `tax_lots` | Lotes abertos para FIFO |
| `realized_gains` | Lotes fechados com ganho/perda calculado |
| `price_cache` | Preços mais recentes por ativo |
| `portfolio_snapshots` | Snapshots diários do valor total |
| `import_batches` | Histórico de importações CSV |
| `tax_rate_settings` | Alíquotas de IR por ano |

### Segurança
- RLS habilitado em todas as tabelas
- Cada linha é filtrada pelo `auth.uid()` do usuário autenticado
- `SUPABASE_SERVICE_ROLE_KEY` usado apenas em rotas de API server-side

### Migrations executadas
1. `supabase/migrations/001_initial_schema.sql` — cria todas as tabelas e índices
2. `supabase/migrations/002_rls_policies.sql` — aplica políticas RLS
3. `supabase/migrations/003_add_dividend_type.sql` — adiciona `'dividend'` ao enum `transaction_type`

---

## 7. Estrutura de Arquivos

```
investment-tracker/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx          → Sign in + Sign up (tabs)
│   │   └── forgot-password/        → Recuperação de senha
│   ├── auth/callback/route.ts      → OAuth callback do Supabase
│   ├── (dashboard)/
│   │   ├── layout.tsx              → Layout com sidebar e header
│   │   ├── dashboard/              → Página principal com gráficos
│   │   ├── brokers/                → CRUD de corretoras
│   │   ├── accounts/               → CRUD de contas
│   │   ├── assets/                 → CRUD de ativos
│   │   ├── transactions/           → Histórico + compra + venda
│   │   ├── import/                 → Upload e mapeamento de CSV
│   │   ├── reports/                → Relatórios fiscais
│   │   └── settings/               → Configurações gerais
│   └── api/
│       ├── transactions/buy/       → Registra compra + cria tax lot
│       ├── transactions/sell/      → Registra venda + FIFO + realiza ganho
│       ├── prices/update/          → Atualiza preços e salva snapshot
│       ├── positions/              → Calcula posições abertas
│       ├── reports/                → Gera relatório de ganhos
│       └── import/csv/             → Processa CSV importado
├── lib/
│   ├── calculations/
│   │   ├── fifo.ts                 → Engine FIFO de lotes
│   │   └── portfolio.ts            → Cálculos de posição e P&L
│   ├── prices/provider.ts          → Alpha Vantage, Twelve Data, CoinGecko
│   ├── supabase/
│   │   ├── client.ts               → Cliente browser
│   │   └── server.ts               → Cliente server (com cookies)
│   ├── validators/transaction.ts   → Schemas Zod para validação
│   └── utils.ts                    → Funções auxiliares
├── components/
│   ├── layout/                     → Sidebar, Header, MobileNav
│   ├── providers/                  → ThemeProvider
│   └── ui/                         → shadcn/ui components
├── middleware.ts                   → Proteção de rotas + refresh de sessão
├── tsconfig.json                   → target: ES2017 (necessário para Map iteration)
├── vercel.json                     → Cron job de preços
├── .env.local                      → Credenciais (não vai ao GitHub)
├── .env.example                    → Template de variáveis de ambiente
├── supabase/
│   ├── migrations/001_initial_schema.sql
│   ├── migrations/002_rls_policies.sql
│   └── seed.sql                    → Dados iniciais (brokers, account types, tax brackets)
├── README.md                       → Documentação geral + erros corrigidos
├── DEPLOY-GUIDE.md                 → Guia passo a passo de deploy
└── PRD.md                          → Este arquivo
```

---

## 8. Variáveis de Ambiente

| Variável | Onde usar | Obrigatória |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client e Server | Sim |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client e Server | Sim |
| `SUPABASE_SERVICE_ROLE_KEY` | Apenas Server (API routes) | Sim |
| `CRON_SECRET` | Server (rota GET /api/prices/update) | Não (mas recomendado) |

> ⚠️ Nunca expor `SUPABASE_SERVICE_ROLE_KEY` no client-side. Usar apenas em rotas de API.
> 
> As variáveis `ALPHA_VANTAGE_API_KEY` e `TWELVE_DATA_API_KEY` foram removidas — preços agora são buscados via Yahoo Finance sem chave de API.

---

## 9. Regras de Negócio

- **FIFO obrigatório:** Vendas sempre consomem o lote mais antigo primeiro
- **Classificação de prazo:** Lote mantido < 1 ano = curto prazo; ≥ 1 ano = longo prazo
- **Preços:** Yahoo Finance (`query1.finance.yahoo.com/v8/finance/chart/{ticker}`) — sem chave de API. Dividendos não geram movimentação de lotes.
- **CSV import:** Duplicatas detectadas em duas camadas — preview client-side (badge amarelo) e safety net server-side antes do INSERT. Critério: ticker + data + tipo + quantidade (±0.01%) + preço unitário (±0.01%).
- **Multi-tenant:** RLS garante que usuário A nunca veja dados de usuário B
- **Seed opcional:** brokers e account_types padrão podem ser adicionados via `seed.sql` ou pela UI em Settings

---

## 10. Decisões de Design

- **App Router (Next.js 14):** Escolhido sobre Pages Router por server components nativos e melhor integração com Supabase SSR
- **`@supabase/ssr` v0.5.1:** Necessário para autenticação em server components e middleware; requer tipo explícito no `setAll` (veja README → Known Issues)
- **TypeScript strict:** Forçado pelo Vercel no build; erros de `noImplicitAny` foram corrigidos com anotações explícitas
- **FIFO vs LIFO:** FIFO escolhido por ser o método padrão para fins fiscais nos EUA
- **shadcn/ui:** Componentes copiados para a pasta `components/ui/` (não é uma dependência externa), o que evita conflitos de versão

---

## 11. Limitações Conhecidas (v1.0)

- Cron job de preços requer plano Pro do Vercel (no plano Hobby, usar o botão "Refresh Prices" na página de Assets)
- Yahoo Finance é uma API pública não oficial — pode ter limitações de rate ou mudar sem aviso
- Sem suporte a frações de ações (fractional shares) abaixo de 0.0001
- Relatórios fiscais são estimativas — não substituem orientação de contador
- Sem suporte a múltiplas moedas (apenas USD)

---

## 12. Próximas Funcionalidades (Backlog)

- [ ] Notificações por e-mail de variação de preço
- [ ] Suporte a múltiplas moedas (BRL, EUR)
- [x] ~~Dividendos e rendimentos~~ — **implementado** (tipo DIVIDEND no CSV import e transações)
- [ ] Integração direta com APIs de corretoras (Open Finance)
- [ ] App mobile (React Native ou PWA)
- [ ] Compartilhamento de portfólio (link público somente leitura)
- [ ] Benchmarking contra índices (S&P 500, IBOV)

---

## 13. Histórico de Implementação

### Sessão de deploy inicial — 2026-05-06

**Objetivo:** Construir e publicar o app do zero.

Etapas:
- Criação de todo o código-base (Next.js 14 + Supabase + shadcn/ui)
- Configuração do projeto no GitHub (`Bindinsurance/investment-tracker`)
- Execução das migrations no Supabase via SQL Editor
- Deploy no Vercel com variáveis de ambiente
- Correção de 4 erros de build TypeScript (ver README → Known Issues, Fixes 1–4)
- Configuração das URLs de redirect no Supabase Auth via Management API

### Sessão de correções pós-deploy — 2026-05-06

**Problema 1 — Preços não apareciam (mostravam "—"):**
- Diagnóstico: PostgREST embedded join `select('*, price_cache(*)')` falhava silenciosamente com RLS
- Solução: Duas queries separadas + priceMap manual + `force-dynamic` em `assets/page.tsx`

**Problema 2 — "Application error" ao abrir a página de import CSV:**
- Diagnóstico: `<SelectItem value="">` viola a API do Radix UI (string vazia reservada)
- Solução: Mudança para `value="__skip__"` com conversão no `onValueChange`

**Problema 3 — Dashboard crashava após operações de dados:**
- Diagnóstico: `buildPortfolioPositions()` acessava `account.broker?.name` sem checar se `account` era null
- Solução: Guard `if (!asset || !account) continue` no loop de agrupamento

**Problema 4 — Cron job nunca atualizava preços:**
- Diagnóstico: Vercel Cron envia `GET`; a rota só tinha handler `POST`
- Solução: Adicionado handler `GET` com validação via `CRON_SECRET`

**Problema 5 — Ativos criados via CSV não recebiam preços:**
- Diagnóstico: CSV import criava assets com `price_source: 'alphavantage'` (sem chave)
- Solução: Corrigido para `price_source: 'manual'` (Yahoo Finance, sem chave)

### Funcionalidades adicionadas — 2026-05-06

- **Yahoo Finance como provedor padrão:** Substituiu Alpha Vantage. Sem chave de API. Endpoint: `query1.finance.yahoo.com/v8/finance/chart/{ticker}`
- **Botão "Refresh Prices":** Adicionado em `assets/assets-client.tsx`; mostra spinner e recarrega a página após atualização
- **Tipo DIVIDEND no import CSV:** Suporte a linhas de dividendo (quantity=0, price=0, apenas total_amount); não gera movimentação de lotes FIFO
- **Detecção de duplicatas no import CSV:**
  - Client-side: preview marca linhas duplicadas em amarelo com badge de contagem
  - Server-side: safety net antes do INSERT — duplicatas retornam como `duplicates` na resposta
  - Toast de conclusão informa quantas foram importadas e quantas ignoradas
