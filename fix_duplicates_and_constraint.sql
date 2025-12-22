-- Script to clean duplicates and apply the missing constraint

-- 1. Identify and Delete Duplicates in 'insumos'
-- (Keeps the most recently updated/created record)
DELETE FROM insumos a USING (
    SELECT MIN(ctid) as ctid, nome_padronizado
    FROM insumos 
    GROUP BY nome_padronizado 
    HAVING COUNT(*) > 1
) b
WHERE a.nome_padronizado = b.nome_padronizado 
AND a.ctid <> b.ctid;

-- 2. Now try to apply the constraint again
ALTER TABLE insumos
ADD CONSTRAINT insumos_nome_padronizado_key UNIQUE (nome_padronizado);
