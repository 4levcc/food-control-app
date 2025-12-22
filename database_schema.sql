-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabelas de Dados Auxiliares (Lookup Tables)

CREATE TABLE IF NOT EXISTS public.categorias_insumos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.categorias_sinteticas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.setores_responsaveis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.especialidades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.unidades_medida (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sigla VARCHAR(10) NOT NULL,
    descricao VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.dificuldades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(50) NOT NULL
);

-- População de unidades_medida (kg, g, L, ml, un)
INSERT INTO public.unidades_medida (sigla, descricao) VALUES
    ('kg', 'Quilograma'),
    ('g', 'Grama'),
    ('L', 'Litro'),
    ('ml', 'Mililitro'),
    ('un', 'Unidade')
ON CONFLICT DO NOTHING;


-- 2. Tabelas de Dados Principais

-- 2.1 Tabela insumos
CREATE TABLE IF NOT EXISTS public.insumos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome_padronizado VARCHAR(255) NOT NULL,
    descricao_produto VARCHAR(255),
    categoria_id UUID REFERENCES public.categorias_insumos(id),
    categoria_sintetica_id UUID REFERENCES public.categorias_sinteticas(id),
    custo_compra NUMERIC,
    quantidade_compra NUMERIC,
    unidade_compra_id UUID REFERENCES public.unidades_medida(id),
    peso_unidade NUMERIC,
    unidade_peso_id UUID REFERENCES public.unidades_medida(id),
    fator_correcao NUMERIC,
    fornecedor VARCHAR(255),
    data_cadastro TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.2 Tabela fichas_tecnicas
CREATE TABLE IF NOT EXISTS public.fichas_tecnicas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome_receita VARCHAR(255) NOT NULL,
    tipo_produto VARCHAR(50) NOT NULL CHECK (tipo_produto IN ('Final', 'Base')),
    setor_responsavel_id UUID REFERENCES public.setores_responsaveis(id) ON DELETE SET NULL,
    especialidade_id UUID REFERENCES public.especialidades(id) ON DELETE SET NULL,
    codigo_id VARCHAR(50) UNIQUE,
    data_criacao DATE DEFAULT CURRENT_DATE,
    dificuldade_id UUID REFERENCES public.dificuldades(id) ON DELETE SET NULL,
    tempo_preparo VARCHAR(50),
    e_insumo BOOLEAN DEFAULT FALSE,
    rendimento_kg NUMERIC,
    observacoes TEXT
);

-- 3. Tabela de Relacionamento (M:N)

-- 3.1 Tabela ft_ingredientes
CREATE TABLE IF NOT EXISTS public.ft_ingredientes (
    ft_id UUID NOT NULL REFERENCES public.fichas_tecnicas(id) ON DELETE CASCADE,
    insumo_id UUID NOT NULL REFERENCES public.insumos(id) ON DELETE CASCADE,
    quantidade_utilizada NUMERIC NOT NULL,
    unidade_utilizada_id UUID NOT NULL REFERENCES public.unidades_medida(id),
    dica_uso VARCHAR(255),
    PRIMARY KEY (ft_id, insumo_id)
);
