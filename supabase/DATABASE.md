# Configuração do Banco de Dados - AgroSystem

## Como criar a tabela de usuários

### Opção 1: Via Dashboard do Supabase (Recomendado)

1. Acesse o [Dashboard do Supabase](https://app.supabase.com/)
2. Selecione seu projeto
3. Vá em **SQL Editor** (menu lateral)
4. Clique em **New Query**
5. Copie e cole o conteúdo do arquivo `supabase/migrations/001_criar_tabela_usuarios.sql`
6. Clique em **Run** para executar

### Opção 2: Via CLI do Supabase

```bash
# Instalar CLI do Supabase (se ainda não tiver)
npm install -g supabase

# Fazer login
supabase login

# Aplicar migration
supabase db push
```

## Estrutura da Tabela `usuarios`

| Campo          | Tipo                        | Descrição                                    |
|----------------|-----------------------------|----------------------------------------------|
| `id`           | UUID (PK)                   | Identificador único do usuário               |
| `nome`         | VARCHAR(255)                | Nome completo do usuário                     |
| `email`        | VARCHAR(255) UNIQUE         | Email único para login                       |
| `senha_hash`   | VARCHAR(255)                | Hash bcrypt da senha                         |
| `criado_em`    | TIMESTAMP WITH TIME ZONE    | Data/hora de criação (auto)                  |
| `atualizado_em`| TIMESTAMP WITH TIME ZONE    | Data/hora da última atualização (auto)       |

## Segurança (Row Level Security)

A tabela possui as seguintes políticas RLS:

- ✅ **Cadastro público** - Qualquer um pode se cadastrar (INSERT)
- ✅ **Leitura própria** - Usuários só veem seus próprios dados (SELECT)
- ✅ **Atualização própria** - Usuários só atualizam seus dados (UPDATE)
- ❌ **Exclusão bloqueada** - Ninguém pode deletar usuários (DELETE)

## Como funciona a autenticação

1. **Cadastro** - `POST /functions/v1/cadastro`
   - Valida email e senha
   - Cria hash da senha com bcrypt
   - Insere usuário na tabela `usuarios`

2. **Login** - `POST /functions/v1/login` (criar posteriormente)
   - Busca usuário por email
   - Compara senha com hash bcrypt
   - Retorna token JWT

## Próximos Passos

- [ ] Criar função de login
- [ ] Implementar tokens JWT
- [ ] Adicionar refresh tokens
- [ ] Criar endpoint de recuperação de senha
- [ ] Adicionar 2FA (autenticação de dois fatores)
