-- Padroniza os perfis do Chromebook Manager em apenas admin e usuario.
-- Administradores sempre possuem acesso aos dois colégios.
UPDATE usuarios
SET perfil = 'admin', unidade_id = NULL
WHERE perfil = 'admin_geral';

-- O antigo administrador de unidade passa a ser usuário comum,
-- mantendo a unidade que já estava atribuída à conta.
UPDATE usuarios
SET perfil = 'usuario'
WHERE perfil = 'admin_unidade';

UPDATE usuarios
SET unidade_id = NULL
WHERE perfil = 'admin';
