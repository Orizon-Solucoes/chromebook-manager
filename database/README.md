# Banco de dados

A aplicação atual utiliza as tabelas universais `equipamentos`, `historico_equipamentos` e `historico_equipamento_anexos`, além das tabelas de autenticação, usuários e unidades.

## Migrações estruturais

Os arquivos SQL numerados na raiz desta pasta documentam a evolução do esquema. **Não execute todos em sequência em uma base que já está em produção.** Antes de qualquer alteração, faça backup, confira a estrutura atual e aplique somente a migração que ainda não foi executada.

- `001_criar_equipamentos_universais.sql`: estrutura inicial do inventário universal.
- `002_criar_historico_unificado.sql`: histórico e anexos vinculados aos equipamentos.
- `007_gestao_usuarios.sql` e `008_acesso_multiplas_unidades.sql`: alterações históricas da autenticação e do acesso por unidade.
- `migrations/2026-11-09-unificar-access-points.sql`: migração histórica dos APs para `equipamentos`.

## Atenção: Access Points

A migração de 09/11/2026 já foi aplicada no banco utilizado pela aplicação. Os APs agora são registros de `equipamentos` com `tipo = 'access-point'`, e os campos específicos ficam em `detalhes`.

**Não execute novamente** `migrations/2026-11-09-unificar-access-points.sql`: ela adiciona uma coluna e um índice únicos e copia registros; não é idempotente. A tabela antiga `access_points` foi mantida no banco durante a validação. Não a remova sem antes confirmar que nenhuma implantação ou rotina ainda a utiliza e que existe backup.

O antigo script `006_access_points.sql` e os arquivos de importação com inventário real foram retirados do repositório porque continham identificadores e detalhes operacionais da infraestrutura. Os dados devem ser mantidos no banco privado, não no Git.

## Configuração

Defina `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` e `DB_NAME` nas variáveis de ambiente. Nunca inclua credenciais, dumps ou inventários reais neste repositório.

Para dúvidas sobre a estrutura atual, consulte o esquema diretamente no ambiente autorizado antes de executar qualquer SQL.
