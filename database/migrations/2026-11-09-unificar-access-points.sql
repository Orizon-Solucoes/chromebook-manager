-- Migração de access_points para equipamentos
-- Faça backup do banco antes de executar.
-- Execute este arquivo uma única vez, na ordem apresentada.

-- 1) Pré-validação: precisa retornar ZERO linhas (IDs não podem colidir).
SELECT ap.id
FROM access_points ap
INNER JOIN equipamentos e ON e.id = ap.id;

-- 2) Cria uma coluna exclusiva opcional para MAC.
-- NULL é permitido para os demais tipos de equipamento.
ALTER TABLE equipamentos
  ADD COLUMN mac_address CHAR(17) NULL AFTER patrimonio;

-- 3) Impede MAC repetido dentro da mesma unidade.
-- MySQL/TiDB permite vários NULLs em índice UNIQUE.
CREATE UNIQUE INDEX uq_equipamentos_unidade_mac
  ON equipamentos (unidade_id, mac_address);

-- 4) Migra os APs preservando IDs, status, observações e datas.
INSERT INTO equipamentos (
  id, patrimonio, mac_address, tipo, fabricante, modelo, numero_serie,
  localizacao, status, observacoes, detalhes, created_at, updated_at, unidade_id
)
SELECT
  ap.id,
  NULL,
  UPPER(REPLACE(ap.mac_address, '-', ':')),
  'access-point',
  ap.marca,
  ap.modelo,
  NULL,
  ap.rack,
  ap.status,
  ap.observacoes,
  JSON_OBJECT(
    'bloco', ap.bloco,
    'rack', ap.rack,
    'potenciaDbm', CAST(ap.potencia_dbm AS DECIMAL(5,2))
  ),
  ap.created_at,
  ap.updated_at,
  ap.unidade_id
FROM access_points ap;

-- 5) Validação: estes dois totais precisam ser iguais.
SELECT COUNT(*) AS total_antigo FROM access_points;
SELECT COUNT(*) AS total_novo FROM equipamentos WHERE tipo = 'access-point';

-- 6) Confira os dados e a unicidade do MAC por unidade.
SELECT id, unidade_id, fabricante, modelo, mac_address, status, detalhes
FROM equipamentos
WHERE tipo = 'access-point'
ORDER BY unidade_id, id;

-- NÃO remova access_points ainda.
-- Depois de testar listagem, cadastro, edição e exclusão na aplicação,
-- a tabela antiga poderá ser removida em outra migração.
