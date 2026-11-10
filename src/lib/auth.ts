
import {
  createHash,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import type { RowDataPacket } from "mysql2/promise";
import { pool } from "@/lib/db";

const DURACAO_SESSAO_DIAS = 7;

export type PerfilUsuario = "admin" | "usuario";

export type UnidadeId = "CE" | "JP";
export type UnidadeAcesso = UnidadeId | "AMBOS";

export interface UsuarioAutenticado {
  id: string;
  nome: string;
  usuario: string;
  perfil: PerfilUsuario | string;
  unidade_id: UnidadeAcesso | string | null;
}

interface UsuarioSessaoRow extends RowDataPacket {
  id: string;
  nome: string;
  usuario: string;
  perfil: string;
  unidade_id: string | null;
}

export function gerarHashSenha(senha: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(senha, salt, 64).toString("hex");

  return `${salt}:${hash}`;
}

export function verificarSenha(senha: string, senhaHash: string) {
  const [salt, hashArmazenado] = senhaHash.split(":");

  if (!salt || !hashArmazenado) {
    return false;
  }

  try {
    const hashCalculado = scryptSync(senha, salt, 64);
    const hashEsperado = Buffer.from(hashArmazenado, "hex");

    return (
      hashCalculado.length === hashEsperado.length &&
      timingSafeEqual(hashCalculado, hashEsperado)
    );
  } catch {
    return false;
  }
}

export function criarHashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function criarSessao(usuarioId: string) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = criarHashToken(token);

  const expiraEm = new Date(Date.now() + DURACAO_SESSAO_DIAS * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");

  await pool.execute(
    `INSERT INTO sessoes (token_hash, usuario_id, expira_em)
     VALUES (?, ?, ?)`,
    [tokenHash, usuarioId, expiraEm],
  );

  return token;
}

export async function criarAdministrador(
  nome: string,
  usuario: string,
  senha: string,
) {
  const id = randomUUID();
  const senhaHash = gerarHashSenha(senha);

  await pool.execute(
    `INSERT INTO usuarios
      (id, nome, usuario, senha_hash, ativo, perfil, unidade_id)
     VALUES (?, ?, ?, ?, 1, 'admin', NULL)`,
    [id, nome, usuario, senhaHash],
  );

  return { id, nome, usuario };
}

export function ehAdministrador(
  usuario: Pick<UsuarioAutenticado, "perfil"> | null,
): boolean {
  return usuario?.perfil === "admin";
}

// Compatibilidade temporária com contas antigas até a migração do banco.
export function normalizarPerfil(perfil: string): PerfilUsuario {
  return perfil === "admin" || perfil === "admin_geral" ? "admin" : "usuario";
}

export function podeAcessarUnidade(
  usuario: Pick<UsuarioAutenticado, "perfil" | "unidade_id"> | null,
  unidadeId: string,
): boolean {
  if (!usuario) {
    return false;
  }

  if (normalizarPerfil(usuario.perfil) === "admin") {
    return unidadeId === "CE" || unidadeId === "JP";
  }

  if (normalizarPerfil(usuario.perfil) !== "usuario") return false;

  return usuario.unidade_id === "AMBOS" || usuario.unidade_id === unidadeId;
}

export async function obterUsuarioSessao(
  token: string,
): Promise<UsuarioAutenticado | null> {
  if (!token || token.length !== 64 || !/^[a-f0-9]+$/i.test(token)) {
    return null;
  }

  const tokenHash = criarHashToken(token);

  const [rows] = await pool.execute<UsuarioSessaoRow[]>(
    `SELECT
       u.id,
       u.nome,
       u.usuario,
       u.perfil,
       u.unidade_id
     FROM sessoes s
     INNER JOIN usuarios u ON u.id = s.usuario_id
     WHERE s.token_hash = ?
       AND s.expira_em > NOW()
       AND u.ativo = 1
     LIMIT 1`,
    [tokenHash],
  );

  const row = rows[0];

  if (!row) {
    return null;
  }

  // Normaliza perfis antigos sem exigir a migração imediata do banco.
  const perfil = normalizarPerfil(row.perfil);
  return {
    ...row,
    perfil,
    unidade_id: perfil === "admin" ? "AMBOS" : row.unidade_id ?? "AMBOS",
  };
}

export async function obterUsuarioAutenticado() {
  const cookieStore = await cookies();
  const token = cookieStore.get("cm_session")?.value;

  if (!token) {
    return null;
  }

  return obterUsuarioSessao(token);
}

export async function encerrarSessao(token: string) {
  const tokenHash = criarHashToken(token);

  await pool.execute(
    "DELETE FROM sessoes WHERE token_hash = ?",
    [tokenHash],
  );
}
