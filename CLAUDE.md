# CLAUDE.md — Investment Tracker

Este arquivo contém instruções permanentes para o Claude neste projeto.
Lido automaticamente no início de cada conversa.

---

## Regra principal: toda mudança deve ser documentada e publicada

**Após qualquer alteração em código ou arquivos do projeto, Claude deve:**

1. **Atualizar README.md** — adicionar o fix/feature na seção "Known Issues & Fixes Applied" ou "Features", com causa, solução e snippet de código quando relevante.
2. **Atualizar PRD.md** — refletir a mudança na seção de funcionalidades, regras de negócio, stack ou histórico (seção 13).
3. **Atualizar CLAUDE.md** (este arquivo) — se a mudança afetar a arquitetura, decisões de design ou contexto importante para futuras sessões.
4. **Commitar e publicar no GitHub** — executar o script `push-all.bat` via terminal, sem que o usuário precise fazer nada manualmente.

Claude executa o push usando o computer-use para abrir o CMD e rodar `push-all.bat`. O usuário **não precisa clicar em nenhum arquivo**.

---

## Como Claude faz o push automaticamente

Claude usa a ferramenta de computer-use para:
1. Pedir acesso ao app "Prompt de Comando" (CMD)
2. Abrir o CMD
3. Navegar até a pasta do projeto
4. Rodar o script `push-all.bat`

Alternativa: se o CMD já estiver aberto, Claude digita os comandos diretamente.

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
- Tipos aceitos: `buy`, `sell`, `dividend`
- Novos assets criados com `price_source: 'manual'` (Yahoo Finance)
- Detecção de duplicatas: client-side (preview badges) + server-side (antes do INSERT)
- Critério: ticker + data + tipo + quantidade (±0.01%) + preço (±0.01%)

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
