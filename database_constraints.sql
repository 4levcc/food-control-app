-- Add UNIQUE constraints to allow UPSERT operations

-- 1. Categorias Insumos
ALTER TABLE categorias_insumos 
ADD CONSTRAINT categorias_insumos_nome_key UNIQUE (nome);

-- 2. Categorias Sintéticas
ALTER TABLE categorias_sinteticas 
ADD CONSTRAINT categorias_sinteticas_nome_key UNIQUE (nome);

-- 3. Insumos (Nome Padronizado must be unique for Update/Upsert logic to work)
ALTER TABLE insumos
ADD CONSTRAINT insumos_nome_padronizado_key UNIQUE (nome_padronizado);
