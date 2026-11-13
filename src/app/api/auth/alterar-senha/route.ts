import { NextResponse } from "next/server";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { cookies } from "next/headers";
import { pool } from "@/lib/db";
import {
  obterUsuarioSessao,
  verificarSenha,
  gerarHashSenha,
  criarHashToken,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SenhaRow extends RowDataPacket {
  senha_hash: string | null;
}

function erro(mensagem: string, status: number) {
  return NextResponse.json(
    { erro: mensagem },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("cm_session")?.value;
    if (!token) return erro("Sua sessão expirou. Entre novamente.", 401);

    const usuario = await obterUsuarioSessao(token);
    if (!usuario) return erro("Sua sessão expirou. Entre novamente.", 401);

    const entrada: unknown = await request.json();
    if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) {
      return erro("Dados inválidos.", 400);
    }

    const body = entrada as Record<string, unknown>;
    const senhaAtual = typeof body.senhaAtual === "string" ? body.senhaAtual : "";
    const novaSenha = typeof body.novaSenha === "string" ? body.novaSenha : "";
    const confirmarSenha = typeof body.confirmarSenha === "string" ? body.confirmarSenha : "";

    if (!senhaAtual || !novaSenha || !confirmarSenha) {
      return erro("Preencha todos os campos.", 400);
    }
    if (novaSenha.length < 8 || Buffer.byteLength(novaSenha, "utf8") > 128) {
      return erro("A nova senha deve ter pelo menos 8 caracteres e no máximo 128 bytes.", 400);
    }
    if (novaSenha !== confirmarSenha) return erro("A confirmação não confere.", 400);
    if (senhaAtual === novaSenha) return erro("Escolha uma senha diferente da atual.", 400);

    const [rows] = await pool.execute<SenhaRow[]>(
      "SELECT senha_hash FROM usuarios WHERE id = ? AND ativo = 1 LIMIT 1",
      [usuario.id],
    );
    const conta = rows[0];

    if (!conta?.senha_hash || !verificarSenha(senhaAtual, conta.senha_hash)) {
      return erro("A senha atual está incorreta.", 400);
    }

    const novoHash = gerarHashSenha(novaSenha);
    const [resultado] = await pool.execute<ResultSetHeader>(
      "UPDATE usuarios SET senha_hash = ? WHERE id = ? AND senha_hash = ? AND ativo = 1",
      [novoHash, usuario.id, conta.senha_hash],
    );

    if (resultado.affectedRows !== 1) {
      return erro("A senha foi alterada em outra operação. Atualize a página e tente novamente.", 409);
    }

    // Mantém a sessão atual e invalida as demais sessões da mesma conta.
    await pool.execute(
      "DELETE FROM sessoes WHERE usuario_id = ? AND token_hash <> ?",
      [usuario.id, criarHashToken(token)],
    );

    return NextResponse.json(
      { sucesso: true, mensagem: "Senha alterada com sucesso." },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Erro ao alterar senha:", error);
    return erro("Não foi possível alterar a senha. Tente novamente.", 500);
  }
}
