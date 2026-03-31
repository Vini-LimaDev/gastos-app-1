-- ═══════════════════════════════════════════════════════════
-- CONTROLE DE GASTOS — Schema Supabase (v2)
-- ═══════════════════════════════════════════════════════════

-- ── Profiles ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users can view own profile"   ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- ── Transactions ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description          TEXT NOT NULL CHECK (char_length(description) BETWEEN 1 AND 200),
  amount               NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  type                 TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  category             TEXT NOT NULL CHECK (category IN (
                         'Alimentação','Transporte','Moradia','Saúde',
                         'Lazer','Educação','Vestuário','Outros')),
  date                 DATE NOT NULL,
  notes                TEXT,
  is_recurring         BOOLEAN DEFAULT FALSE,
  recurrence_interval  TEXT CHECK (recurrence_interval IN ('monthly','weekly','yearly')),
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id  ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date      ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type      ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_category  ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_recurring ON transactions(user_id, is_recurring);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users can manage own transactions" ON transactions
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Budgets ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS budgets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category     TEXT NOT NULL CHECK (category IN (
                 'Alimentação','Transporte','Moradia','Saúde',
                 'Lazer','Educação','Vestuário','Outros')),
  limit_amount NUMERIC(12,2) NOT NULL CHECK (limit_amount > 0),
  month        INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year         INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  -- Each category can only have one budget per month/year per user
  UNIQUE (user_id, category, month, year)
);

CREATE INDEX IF NOT EXISTS idx_budgets_user_month ON budgets(user_id, month, year);

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users can manage own budgets" ON budgets
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── Goals ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS goals (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  target_amount  NUMERIC(12,2) NOT NULL CHECK (target_amount > 0),
  current_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  deadline       DATE,
  emoji          TEXT DEFAULT '🎯',
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users can manage own goals" ON goals
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_goals_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
