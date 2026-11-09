-- Migração de access_points para equipamentos
-- Faça backup do banco antes de executar.
-- Execute primeiro as consultas de pré-validação.

-- 1) Esta consulta precisa retornar ZERO linhas: IDs de AP já usados.
SELECT ap.id
FROM access_points ap
INNER JOIN equipamentos e ON e.id = ap.id;

-- 2) Migre os APs preservando IDs e datas.
-- Campos específicos ficam no JSON detalhes.
INSERT INTO equipamentos (
  id, patrimonio, tipo, fabricante, modelo, numero_serie, localizacao,
  status, observacoes, detalhes, created_at, updated_at, unidade_id
)
SELECT
  ap.id,
  NULL,
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
    'macAddress', UPPER(REPLACE(ap.mac_address, '-', ':')),
    'potenciaDbm', CAST(ap.potencia_dbm AS DECIMAL(5,2))
  ),
  ap.created_at,
  ap.updated_at,
  ap.unidade_id
FROM access_points ap
WHERE NOT EXISTS (
  SELECT 1 FROM equipamentos e WHERE e.id = ap.id
);

-- 3) Os totais precisam ser iguais.
SELECT COUNT(*) AS total_antigo FROM access_points;
SELECT COUNT(*) AS total_novo FROM equipamentos WHERE tipo = 'access-point';

-- 4) Confira os dados migrados.
SELECT id, unidade_id, fabricante, modelo, status, detalhes
FROM equipamentos
WHERE tipo = 'access-point'
ORDER BY unidade_id, id;

-- NÃO exclua access_points agora.
-- Após validar os totais, o cadastro, a edição e a exclusão pela aplicação,
-- a tabela antiga poderá ser removida em uma etapa separada.
