-- Remover tabelas antigas se existirem
DROP TABLE IF EXISTS public.vendas CASCADE;
DROP TABLE IF EXISTS public.rotas CASCADE;
DROP TABLE IF EXISTS public.vendedores CASCADE;

-- Tabela de Vendedores
CREATE TABLE public.vendedores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nome character varying NOT NULL,
  CONSTRAINT vendedores_pkey PRIMARY KEY (id)
);

-- Tabela de Rotas
CREATE TABLE public.rotas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nome character varying NOT NULL,
  vendedor_id uuid NOT NULL,
  data_criacao timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  data_termino timestamp with time zone,
  CONSTRAINT rotas_pkey PRIMARY KEY (id),
  CONSTRAINT rotas_vendedor_fkey FOREIGN KEY (vendedor_id) REFERENCES public.vendedores(id) ON DELETE CASCADE
);

-- Tabela de Vendas (ID vem do Asaas)
CREATE TABLE public.vendas (
  id character varying NOT NULL, -- ID do Asaas (não é UUID gerado automaticamente)
  rota_id uuid NOT NULL,
  CONSTRAINT vendas_pkey PRIMARY KEY (id),
  CONSTRAINT vendas_rota_fkey FOREIGN KEY (rota_id) REFERENCES public.rotas(id) ON DELETE CASCADE
);

-- Índices
CREATE INDEX idx_rotas_vendedor ON public.rotas(vendedor_id);
CREATE INDEX idx_vendas_rota ON public.vendas(rota_id);
