# 💸 GastosApp — Controle de Gastos Pessoais

Aplicação web full-stack para controle de finanças pessoais com autenticação de usuários, lançamento de transações e dashboards com gráficos.

## Stack

- **Frontend**: React + Vite + Tailwind CSS + Recharts
- **Backend**: Python + FastAPI
- **Banco de Dados**: Supabase (PostgreSQL)

---

## Pré-requisitos

- Node.js 18+
- Python 3.11+
- Conta gratuita no [Supabase](https://supabase.com)

---

## 1. Configurar o Supabase

### 1.1 Criar projeto
1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto
2. Anote a **URL** e as **chaves** (Settings → API)

### 1.2 Executar o schema
1. Vá em **SQL Editor** no painel do Supabase
2. Cole o conteúdo do arquivo `backend/supabase_schema.sql` e execute
3. Isso cria as tabelas `profiles` e `transactions` com as políticas de segurança (RLS)

---

## 2. Configurar o Backend

```bash
cd backend

# Copiar arquivo de variáveis de ambiente
cp .env.example .env
```

Edite o `.env` com suas credenciais do Supabase:

```env
SUPABASE_URL=https://SEU_PROJETO.supabase.co
SUPABASE_KEY=sua_anon_key_aqui
SUPABASE_SERVICE_KEY=sua_service_role_key_aqui
JWT_SECRET=qualquer_string_secreta_aqui
FRONTEND_URL=http://localhost:5173
```

```bash
# Instalar dependências
pip install -r requirements.txt

# Iniciar o servidor
uvicorn main:app --reload --port 8000
```

A API estará disponível em `http://localhost:8000`.
Documentação automática: `http://localhost:8000/docs`

---

## 3. Configurar o Frontend

```bash
cd frontend

# Instalar dependências
npm install

# Iniciar o servidor de desenvolvimento
npm run dev
```

O app estará disponível em `http://localhost:5173`.

> O Vite está configurado para fazer proxy de `/api` → `http://localhost:8000`, então os dois servidores precisam estar rodando.

---

## 4. Estrutura do Projeto

```
gastos-app/
├── backend/
│   ├── main.py              # FastAPI app principal
│   ├── auth.py              # Rotas de autenticação
│   ├── transactions.py      # Rotas de transações
│   ├── models.py            # Modelos Pydantic
│   ├── database.py          # Cliente Supabase
│   ├── supabase_schema.sql  # Schema do banco de dados
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── api.js           # Cliente HTTP (Axios)
    │   ├── hooks/
    │   │   └── useAuth.js   # Context de autenticação
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   ├── Dashboard.jsx
    │   │   └── Transactions.jsx
    │   └── components/
    │       ├── Layout.jsx
    │       └── TransactionForm.jsx
    ├── package.json
    └── vite.config.js
```

---

## 5. Funcionalidades

- **Autenticação** — Cadastro e login com email/senha via Supabase Auth
- **Transações** — Criar, editar, excluir receitas e despesas
- **Categorias** — Alimentação, Transporte, Moradia, Saúde, Lazer, Educação, Vestuário, Outros
- **Filtros** — Por data, categoria, tipo e valor
- **Dashboard** — Cards de resumo, gráfico de barras anual, gráfico de pizza por categoria, últimas transações
- **Segurança** — Row Level Security no Supabase garante que cada usuário só acessa seus próprios dados

---

## 6. API Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/auth/register` | Criar conta |
| POST | `/auth/login` | Login |
| POST | `/auth/logout` | Logout |
| GET | `/auth/me` | Dados do usuário logado |
| GET | `/transactions/` | Listar transações (com filtros) |
| POST | `/transactions/` | Criar transação |
| PUT | `/transactions/{id}` | Atualizar transação |
| DELETE | `/transactions/{id}` | Excluir transação |
| GET | `/transactions/summary/monthly` | Resumo mensal |
| GET | `/transactions/summary/yearly` | Resumo anual |

---

## 7. Deploy (sugestões)

- **Backend**: [Railway](https://railway.app), [Render](https://render.com), ou [Fly.io](https://fly.io)
- **Frontend**: [Vercel](https://vercel.com) ou [Netlify](https://netlify.com)
- **Banco**: Supabase já está hospedado ✅

---

Feito com ❤️ — GastosApp
