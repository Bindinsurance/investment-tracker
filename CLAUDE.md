# CLAUDE.md — Investment Tracker

Este arquivo contém instruções permanentes para o Claude neste projeto.
Lido automaticamente no início de cada conversa.

---

## Regra principal: toda mudança deve ser documentada, salva e publicada

**Após qualquer trabalho concluído, Claude deve automaticamente — sem esperar o usuário pedir:**

1. **Salvar memória** — registrar erros encontrados, causa raiz e solução nos arquivos de memória (`memory/project_*.md`). Incluir: action type problemático, regra adicionada/removida, contas/tickers afetados. Objetivo: economizar tokens em sessões futuras.
2. **Atualizar README.md** — adicionar o fix/feature na seção "Known Issues & Fixes Applied" ou "Features", com causa, solução e snippet de código quando relevante.
3. **Atualizar PRD.md** — refletir a mudança na seção de funcionalidades, regras de negócio, stack ou histórico (seção 13).
4. **Atualizar CLAUDE.md** (este arquivo) — se a mudança afetar a arquitetura, decisões de design ou contexto importante para futuras sessões.
5. **Commitar e publicar no GitHub** — executar o script `push-all.bat` via File Explorer (clique direito → Abrir), sem que o usuário precise fazer nada manualmente.

---

## Como Claude faz o push automaticamente

Claude usa computer-use para:
1. Pedir acesso ao "Explorador de Arquivos"
2. Navegar até a pasta do projeto
3. Clicar com o botão direito em `push-all.bat` → Abrir

**Importante:** CMD é tier "click" (sem digitação). Sempre usar File Explorer para executar `.bat`. Nunca pedir para o usuário rodar manualmente.

---

## Projeto: Investment Tracker

**URL em produção:** https://investment-tracker-murex-rho.vercel.app  
**GitHub:** https://github.com/Bindinsurance/investment-tracker  
**Supabase:** https://supabase.com/dashboard/project/zsjqupeygncbchkgxmup  
**Vercel:** Deploy automático a cada push para `main`

---

## Stack

- Next.js 14 App Router + TypeScript strict
- Supabase (PostgreSQL + Auth + RLS)
- Tailwind CSS + shadcn/ui
- Recharts, jsPDF, PapaParse, Zod
- Yahoo Finance (preços, sem chave de API)
- Vercel (deploy + cron job diário de preços)

---

## Arquitetura e decisões importantes

### Preços de ativos
- Fonte: Yahoo Finance (`query1.finance.yahoo.com/v8/finance/chart/{ticker}`)
- Sem chave de API. `price_source: 'manual'` no banco mapeia para Yahoo Finance no código.
- Rota `/api/prices/update` aceita `GET` (cron Vercel, autenticado via `CRON_SECRET`) e `POST` (botão UI, autenticado via sessão).

### Preços na página de Assets
- **Não usar** PostgREST embedded join (`select('*, price_cache(*)')`) — falha silenciosamente com RLS.
- **Usar** duas queries separadas: uma para `assets`, outra para `price_cache` com `.in('asset_id', assetIds)`, depois construir um `priceMap` em TypeScript.
- Sempre incluir `export const dynamic = 'force-dynamic'` em `assets/page.tsx` para evitar cache SSR.

### Radix UI Select
- `<SelectItem value="">` lança erro — Radix UI reserva string vazia para "sem seleção".
- Usar `value="__skip__"` e converter de volta no `onValueChange`.

### FIFO e tax lots
- Toda compra cria um tax lot em `tax_lots`.
- Vendas consomem lotes na ordem FIFO via `lib/calculations/fifo.ts`.
- Dividendos não criam nem consomem lotes (quantity=0, price=0).

### null safety em portfolio.ts
- `buildPortfolioPositions()` deve sempre checar `if (!asset || !account) continue` antes de acessar propriedades, pois joins do Supabase podem retornar null.

### CSV import
- Tipos aceitos: `buy`, `sell`, `dividend`, `fee`
- Novos assets criados com `price_source: 'manual'` (Yahoo Finance)
- Detecção de duplicatas: client-side (preview badges) + server-side (antes do INSERT)
- Critério: ticker + data + tipo + quantidade (±0.01%) + preço (±0.01%)

### parseAction — regras e armadilhas conhecidas (import-client.tsx)
- `REDEMPTION FROM CORE ACCOUNT` (FDRXX/SPAXX) → **null** (skip). São saques internos do money market para financiar compras ou pagar despesas (HSA). NÃO são transações de investimento.
- `FOREIGN TAX PAID` / `ADJ FOREIGN TAX PAID` → **fee**. Imposto retido na fonte de dividendos de ADRs brasileiros (ex: PBR na Roth EDU).
- `DISTRIBUTION [TICKER] (Shares)` → **null** (skip). A Fidelity usa esse formato para stock splits (TSLA, GOOG, SHOP). Remover 'distribution' do match de sell era necessário porque "income distribution" já é capturado pela regra de dividend antes.
- `YOU BOUGHT`, `REINVESTMENT`, `PURCHASE INTO CORE ACCOUNT` → **buy**
- `YOU SOLD`, `SOLD` → **sell**
- `DIVIDEND RECEIVED` → **dividend**
- `FEE CHARGED` → **fee**
- Contas 401K usam: `contribution`, `exchange in/out`, `transfer in/out`, `employer match`, `rollover in/out` — todos mapeados.

### Extratos Fidelity por conta (pasta: Downloads/Brokers/)
- **Z08525877** (Conta Principal / Joint WROS-TOD): VOO, QQQ, NVDA, META, MSFT, AMZN, GOOGL, AAPL, DIS, TSLA, CCL, BA, ABNB, NU, SHOP, PLTR, PBR, SPAXX
- **243390432** (Roth EDU): PBR, VOO, NVDA, QQQ, SHOP, META, PLTR, AMZN, GOOG, SPAXX
- **244218673** (HSA): VOO, QQQ, FDRXX — muitos REDEMPTION (saques médicos mensais)
- **246551088** (Self Employer EDU): VOO, QQQ, QQQM, META, FXAIX, FDRXX
- **258189111** (Self Employer LARI): VOO, NVDA, QQQ, MSFT, AMZN, GOOGL, FDRXX

### Vercel Cron
- Configurado em `vercel.json`: `"schedule": "0 21 * * 1-5"` (21h UTC = 4pm ET)
- Envia `GET /api/prices/update` com header `Authorization: Bearer {CRON_SECRET}`
- Requer plano Pro do Vercel; no plano Hobby usar botão "Refresh Prices" na página de Assets

---

## Migrações do banco

| Arquivo | Descrição |
|---|---|
| `001_initial_schema.sql` | Cria todas as tabelas e índices |
| `002_rls_policies.sql` | Aplica políticas RLS |
| `003_add_dividend_type.sql` | Adiciona `'dividend'` ao enum `transaction_type` |

Ao criar nova migração, numerar sequencialmente e registrar aqui e no PRD.md (seção 6).

---

## Variáveis de ambiente

| Variável | Obrigatória |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Sim |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sim |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim |
| `CRON_SECRET` | Não (mas recomendado) |

---

## Padrão de commits

Usar prefixos semânticos:
- `feat:` nova funcionalidade
- `fix:` correção de bug
- `docs:` atualização de documentação
- `refactor:` refatoração sem mudança de comportamento
- `chore:` scripts, configs, dependências

---

## O que nunca fazer

- Nunca usar PostgREST embedded join para `price_cache` — usar query separada
- Nunca criar `<SelectItem value="">` — usar `"__skip__"` ou outro valor não-vazio
- Nunca setar `price_source: 'alphavantage'` em novos assets — usar `'manual'`
- Nunca acessar `account.x` ou `asset.x` sem null-check após joins do Supabase
- Nunca adicionar `SUPABASE_SERVICE_ROLE_KEY` a código client-side
- Nunca incluir `'distribution'` na regra de sell do parseAction — captura stock splits incorretamente
- Nunca mapear `REDEMPTION FROM CORE ACCOUNT` como sell — é saque interno de money market
- Nunca pedir para o usuário rodar push-all.bat manualmente — usar File Explorer via computer-use
- Nunca encerrar uma sessão de trabalho sem salvar memória, atualizar docs e publicar no GitHub
