
import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { gerarHashSenha } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface UsuarioExistenteRow extends RowDataPacket {
  id: string;
}

interface ConfiguracaoRow extends RowDataPacket {
  id: number;
  chave: string;
}

function erro(mensagem: string, status: number) {
  return NextResponse.json(
    { erro: mensagem },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

export async function POST(request: Request) {
  let conexao: Awaited<ReturnType<typeof pool.getConnection>> | undefined;

  try {
    const entrada: unknown = await request.json();

    if (
      !entrada ||
      typeof entrada !== "object" ||
      Array.isArray(entrada)
    ) {
      return erro("Dados inválidos.", 400);
    }

    const body = entrada as Record<string, unknown>;

    const nome =
      typeof body.nome === "string" ? body.nome.trim() : "";

    const usuario =
      typeof body.usuario === "string"
        ? body.usuario.trim().toLowerCase()
        : "";

    const senha =
      typeof body.senha === "string" ? body.senha : "";

    if (!nome || !usuario || !senha) {
      return erro("Preencha todos os campos.", 400);
    }

    if (nome.length > 150 || usuario.length > 100) {
      return erro("Nome ou usuário muito longo.", 400);
    }

    if (senha.length < 8 || Buffer.byteLength(senha, "utf8") > 128) {
      return erro(
        "A senha deve ter pelo menos 8 caracteres e no máximo 128 bytes.",
        400,
      );
    }

    conexao = await pool.getConnection();
    await conexao.beginTransaction();

    // Bloqueia a configuração para evitar inicializações simultâneas.
    const [configuracoes] = await conexao.query<ConfiguracaoRow[]>(
      `SELECT id, chave
       FROM configuracao_sistema
       WHERE id = 1
       FOR UPDATE`,
    );

    if (configuracoes.length === 0) {
      await conexao.rollback();

      return erro(
        "A configuração do sistema não foi inicializada. Execute o script de criação das tabelas.",
        500,
      );
    }

    const [usuariosExistentes] =
      await conexao.query<UsuarioExistenteRow[]>(
        "SELECT id FROM usuarios LIMIT 1",
      );

    if (usuariosExistentes.length > 0) {
      await conexao.rollback();
      return erro("A configuração inicial já foi realizada.", 409);
    }

    // O primeiro usuário será o administrador geral das duas unidades.
    const id = randomUUID();
    const senhaHash = gerarHashSenha(senha);

    await conexao.execute(
      `INSERT INTO usuarios
        (id, nome, usuario, senha_hash, ativo, perfil, unidade_id)
       VALUES (?, ?, ?, ?, 1, 'admin', NULL)`,
      [id, nome, usuario, senhaHash],
    );

    await conexao.execute(
      "UPDATE configuracao_sistema SET valor = 'concluida' WHERE id = 1",
    );

    await conexao.commit();

    return NextResponse.json(
      {
        sucesso: true,
        mensagem: "Administrador criado. Faça login para continuar.",
      },
      {
        status: 201,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    if (conexao) {
      try {
        await conexao.rollback();
      } catch {
        // A transação pode já ter sido encerrada.
      }
    }

    console.error("Erro na configuração inicial:", error);

    return erro(
      "Não foi possível criar o administrador. Verifique os dados e a configuração do banco.",
      500,
    );
  } finally {
    conexao?.release();
  }
}
