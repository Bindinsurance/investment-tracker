# Guia de Deploy — Investment Tracker

Projeto: `investment-tracker`
GitHub: https://github.com/Bindinsurance/investment-tracker
Supabase: https://zsjqupeygncbchkgxmup.supabase.co

---

## ✅ O que já está pronto

- Todo o código Next.js (dashboard, transações, relatórios, import CSV, etc.)
- Schema do banco de dados (migrations SQL)
- Configuração do Supabase (.env.local)
- vercel.json (cron job de preços)
- Página de login com sign in + sign up

---

## 📋 Passos para finalizar

### PASSO 1 — Instalar dependências (1 vez)

Abra o **Terminal** ou **Prompt de Comando**, navegue até a pasta do projeto e rode:

```
cd "C:\Users\agent1\Downloads\App_ Controle de investimentos\App de controle de investimentos"
npm install
```

Para testar localmente depois:
```
npm run dev
```
Acesse: http://localhost:3000

---

### PASSO 2 — Criar repositório no GitHub

1. Acesse https://github.com/new
2. Nome do repositório: `investment-tracker`
3. Deixe **Private** (recomendado — contém dados financeiros)
4. **Não** inicialize com README (já temos)
5. Clique **Create repository**

---

### PASSO 3 — Enviar código para o GitHub

Dê um duplo clique no arquivo `setup-git.bat` na pasta do projeto.

Ele vai:
- Inicializar o git
- Fazer o commit de todos os arquivos
- Conectar ao repositório `investment-tracker`
- Fazer o push para o GitHub

> ⚠️ Se pedir autenticação, use seu token do GitHub (Settings > Developer Settings > Personal Access Tokens).

---

### PASSO 4 — Configurar o banco no Supabase

Acesse: https://supabase.com/dashboard/project/zsjqupeygncbchkgxmup

1. Vá em **SQL Editor**
2. Cole e execute o conteúdo de `supabase/migrations/001_initial_schema.sql`
3. Cole e execute o conteúdo de `supabase/migrations/002_rls_policies.sql`
4. (Opcional) Cole e execute `supabase/seed.sql` para dados iniciais (brokers e tipos de conta)

Em **Authentication > Providers**, confirme que **Email** está habilitado.

Em **Authentication > URL Configuration**, adicione nas Redirect URLs:
```
http://localhost:3000/**
https://seu-app.vercel.app/**
```

---

### PASSO 5 — Deploy no Vercel

1. Acesse https://vercel.com → **Add New Project**
2. Importe o repositório `Bindinsurance/investment-tracker` do GitHub
3. Vercel detecta Next.js automaticamente — não mude nada em framework
4. Em **Environment Variables**, adicione:

| Variável | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://zsjqupeygncbchkgxmup.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (copie do .env.local) |
| `SUPABASE_SERVICE_ROLE_KEY` | (copie do .env.local) |
| `ALPHA_VANTAGE_API_KEY` | (opcional — grátis em alphavantage.co) |
| `TWELVE_DATA_API_KEY` | (opcional — grátis em twelvedata.com) |

5. Clique **Deploy**

---

### PASSO 6 — Atualizar URL no Supabase

Após o deploy, o Vercel dará uma URL como `https://investment-tracker-xyz.vercel.app`.

Volte no Supabase → **Authentication > URL Configuration** e adicione:
```
https://investment-tracker-xyz.vercel.app/**
```

---

## 🔑 Chaves de API de Preços (opcional mas recomendado)

| Serviço | Para | Plano gratuito | Link |
|---|---|---|---|
| Alpha Vantage | Ações e ETFs | 25 req/dia | https://www.alphavantage.co/support/#api-key |
| Twelve Data | Ações e ETFs (alternativa) | 800 req/dia | https://twelvedata.com/pricing |
| CoinGecko | Criptomoedas | Sem chave necessária | — |

---

## 🚀 Após o deploy

1. Acesse o app e crie sua conta (aba "Create account" na tela de login)
2. Vá em **Settings** para adicionar brokers e tipos de conta
3. Vá em **Assets** para cadastrar seus ativos (AAPL, BTC, etc.)
4. Vá em **Accounts** para criar suas contas (ex: Roth IRA na Fidelity)
5. Registre transações em **Transactions > New Buy**
6. Use **Update Prices** no dashboard para buscar preços atuais

---

## 📁 Estrutura importante do projeto

```
investment-tracker/
├── app/
│   ├── (auth)/login/       → Sign in + Sign up
│   ├── (auth)/forgot-password/
│   ├── (dashboard)/        → Dashboard, Brokers, Accounts, Assets,
│   │                          Transactions, Import, Reports, Settings
│   └── api/                → Rotas: buy, sell, prices, positions, reports, import
├── supabase/
│   ├── migrations/         → SQL para executar no Supabase
│   └── seed.sql            → Dados iniciais opcionais
├── lib/
│   ├── calculations/       → FIFO e cálculos de portfólio
│   ├── prices/             → Alpha Vantage, Twelve Data, CoinGecko
│   └── validators/         → Zod schemas
├── .env.local              → Suas credenciais (NÃO vai para o GitHub)
├── vercel.json             → Cron job de preços (dias úteis 21h UTC)
└── setup-git.bat           → Script para push ao GitHub
```
