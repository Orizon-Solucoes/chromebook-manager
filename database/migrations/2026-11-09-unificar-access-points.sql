-- MIGRAÇÃO HISTÓRICA: access_points -> equipamentos.
-- Esta migração já foi aplicada no banco de produção em 09/11/2026.
-- A tabela antiga access_points foi removida após a validação em 10/11/2026.
-- NÃO EXECUTE ESTE ARQUIVO NOVAMENTE: ele não é idempotente.
-- O SQL abaixo é mantido somente como registro do procedimento realizado.
--
-- Antes de executar migrações em qualquer outro ambiente, confira o esquema
-- atual e aplique somente as alterações que ainda não existirem.

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

-- 5) Validação realizada durante a migração: os totais antigo e novo deveriam ser iguais.
SELECT COUNT(*) AS total_antigo FROM access_points;
SELECT COUNT(*) AS total_novo FROM equipamentos WHERE tipo = 'access-point';

-- 6) Consulta de conferência utilizada após a migração.
SELECT id, unidade_id, fabricante, modelo, mac_address, status, detalhes
FROM equipamentos
WHERE tipo = 'access-point'
ORDER BY unidade_id, id;

-- A tabela antiga foi removida somente depois dos testes de listagem,
-- cadastro, edição e exclusão. Este arquivo não deve ser usado para
-- recriar ou alterar a estrutura atual do banco.
