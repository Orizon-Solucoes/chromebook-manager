
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import {
  obterUsuarioAutenticado,
  type UsuarioAutenticado,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type UnidadeId = "CE" | "JP" | "AMBOS";

function erro(mensagem: string, status: number) {
  return NextResponse.json(
    { erro: mensagem },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

function ehAdministrador(usuario: UsuarioAutenticado): boolean {
  return usuario.perfil === "admin" || usuario.perfil === "admin_geral";
}

function unidadeValida(valor: unknown): valor is UnidadeId {
  return valor === "CE" || valor === "JP" || valor === "AMBOS";
}

async function administrador() {
  const usuario = await obterUsuarioAutenticado();

  if (!usuario) {
    return {
      usuario: null,
      resposta: erro("Não autenticado.", 401),
    };
  }

  const autorizado = ehAdministrador(usuario);

  if (!autorizado) {
    return {
      usuario: null,
      resposta: erro(
        "Apenas administradores podem gerenciar usuários.",
        403,
      ),
    };
  }

  return { usuario, resposta: null };
}

interface UsuarioRow extends RowDataPacket {
  id: string;
  nome: string;
  usuario: string;
  perfil: string;
  ativo: number;
  unidade_id: string | null;
  precisa_ativar: number;
  created_at: string | Date;
}

export async function GET() {
  try {
    const auth = await administrador();

    if (auth.resposta) return auth.resposta;

    const usuarioAtual = auth.usuario!;

    const [rows] = await pool.query<UsuarioRow[]>(
      `SELECT id, nome, usuario, perfil, ativo, unidade_id,
              (senha_hash IS NULL) AS precisa_ativar, created_at
       FROM usuarios ORDER BY created_at DESC, nome ASC`,
    );

    return NextResponse.json(
      rows.map((row) => ({
        id: row.id,
        nome: row.nome,
        usuario: row.usuario,
        perfil: ehAdministrador({ perfil: row.perfil } as UsuarioAutenticado) ? "admin" : "usuario",
        unidadeId: ehAdministrador({ perfil: row.perfil } as UsuarioAutenticado) ? "AMBOS" : row.unidade_id ?? "AMBOS",
        ativo: Number(row.ativo) === 1,
        precisaAtivar: Number(row.precisa_ativar) === 1,
        criadoEm: row.created_at,
        proprioUsuario: row.id === usuarioAtual.id,
      })),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Erro ao listar usuários:", error);

    return erro(
      "Não foi possível listar os usuários. Confirme se a estrutura do banco está atualizada.",
      500,
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await administrador();

    if (auth.resposta) return auth.resposta;
    const entrada: unknown = await request.json();

    if (
      !entrada ||
      typeof entrada !== "object" ||
      Array.isArray(entrada)
    ) {
      return erro("Os dados enviados são inválidos.", 400);
    }

    const body = entrada as Record<string, unknown>;

    const nome =
      typeof body.nome === "string" ? body.nome.trim() : "";

    const usuario =
      typeof body.usuario === "string"
        ? body.usuario.trim().toLowerCase()
        : "";

    if (!nome || !usuario) {
      return erro("Informe o nome e o nome de usuário.", 400);
    }

    if (nome.length > 150) {
      return erro("O nome deve ter no máximo 150 caracteres.", 400);
    }

    if (
      usuario.length < 3 ||
      usuario.length > 100 ||
      !/^[a-z0-9._-]+$/.test(usuario)
    ) {
      return erro(
        "O usuário deve ter de 3 a 100 caracteres e usar letras sem acento, números, ponto, hífen ou underline.",
        400,
      );
    }

    const perfilRecebido = body.perfil === undefined ? "usuario" : body.perfil;
    if (perfilRecebido !== "admin" && perfilRecebido !== "usuario") return erro("Selecione um perfil válido: admin ou usuario.", 400);
    const unidadeRecebida = body.unidadeId ?? body.unidade_id ?? "CE";
    if (perfilRecebido === "usuario" && !unidadeValida(unidadeRecebida)) return erro("Selecione uma unidade válida: CE, JP ou AMBOS.", 400);
    const perfil: "admin" | "usuario" = perfilRecebido;
    const unidadeId: UnidadeId = perfil === "admin" ? "AMBOS" : unidadeRecebida as UnidadeId;

    const id = randomUUID();
    const codigo = randomBytes(8).toString("hex").toUpperCase();
    const codigoHash = createHash("sha256")
      .update(codigo)
      .digest("hex");

    await pool.execute<ResultSetHeader>(
      `INSERT INTO usuarios (
         id,
         nome,
         usuario,
         senha_hash,
         codigo_ativacao_hash,
         perfil,
         ativo,
         unidade_id
       )
       VALUES (?, ?, ?, NULL, ?, ?, 1, ?)`,
      [id, nome, usuario, codigoHash, perfil, perfil === "admin" || unidadeId === "AMBOS" ? null : unidadeId],
    );

    return NextResponse.json(
      {
        sucesso: true,
        usuario: {
          id,
          nome,
          usuario,
          perfil,
          unidadeId,
          precisaAtivar: true,
        },
        codigoPrimeiroAcesso: codigo,
        mensagem:
          "Conta criada. Copie o código de primeiro acesso agora; ele não será exibido novamente.",
      },
      {
        status: 201,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    const dbError = error as { code?: string };

    if (dbError.code === "ER_DUP_ENTRY") {
      return erro("Esse nome de usuário já está em uso.", 409);
    }

    console.error("Erro ao criar usuário:", error);

    return erro(
      "Não foi possível criar a conta. Confirme se a estrutura do banco está atualizada.",
      500,
    );
  }
}
