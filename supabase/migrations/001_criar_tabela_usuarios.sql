-- ============================================
-- TABELA DE USUÁRIOS - AgroSystem
-- ============================================

-- Criar tabela de usuários
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Criar índice para busca rápida por email
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);

-- Criar índice para busca por nome
CREATE INDEX IF NOT EXISTS idx_usuarios_nome ON usuarios(nome);

-- Criar função para atualizar o campo atualizado_em automaticamente
CREATE OR REPLACE FUNCTION atualizar_campo_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para atualizar atualizado_em
DROP TRIGGER IF EXISTS trigger_atualizar_usuarios ON usuarios;
CREATE TRIGGER trigger_atualizar_usuarios
  BEFORE UPDATE ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_campo_atualizado_em();

-- Habilitar Row Level Security (RLS)
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Política: Permitir inserção (cadastro público)
CREATE POLICY "Permitir cadastro de novos usuários"
  ON usuarios
  FOR INSERT
  WITH CHECK (true);

-- Política: Usuários podem ler apenas seus próprios dados
CREATE POLICY "Usuários podem ler próprios dados"
  ON usuarios
  FOR SELECT
  USING (id = current_setting('app.user_id', true)::uuid);

-- Política: Usuários podem atualizar apenas seus próprios dados
CREATE POLICY "Usuários podem atualizar próprios dados"
  ON usuarios
  FOR UPDATE
  USING (id = current_setting('app.user_id', true)::uuid);

-- Política: Ninguém pode deletar (desabilite se quiser permitir)
CREATE POLICY "Proibir exclusão de usuários"
  ON usuarios
  FOR DELETE
  USING (false);

-- Comentários para documentação
COMMENT ON TABLE usuarios IS 'Tabela de usuários do sistema AgroSystem';
COMMENT ON COLUMN usuarios.id IS 'Identificador único do usuário (UUID)';
COMMENT ON COLUMN usuarios.nome IS 'Nome completo do usuário';
COMMENT ON COLUMN usuarios.email IS 'Email único do usuário para login';
COMMENT ON COLUMN usuarios.senha_hash IS 'Hash bcrypt da senha do usuário';
COMMENT ON COLUMN usuarios.criado_em IS 'Data e hora de criação do registro';
COMMENT ON COLUMN usuarios.atualizado_em IS 'Data e hora da última atualização';

-- ============================================
-- DADOS DE EXEMPLO (OPCIONAL - REMOVER EM PRODUÇÃO)
-- ============================================

-- Inserir usuário de teste (senha: "teste123")
-- Hash gerado com bcrypt para "teste123"
-- INSERT INTO usuarios (nome, email, senha_hash) 
-- VALUES ('Usuário Teste', 'teste@agrosystem.com', '$2a$10$YourHashHere');
