
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import {
  obterUsuarioAutenticado,
  podeAcessarUnidade,
  type UsuarioAutenticado,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIPOS = [
  "chromebook",
  "notebook",
  "projetor",
  "catraca",
  "impressora",
] as const;

const STATUS = [
  "disponivel",
  "em-uso",
  "em-reparo",
  "inativo",
  "para-descarte",
] as const;

type TipoEquipamento = (typeof TIPOS)[number];
type StatusEquipamento = (typeof STATUS)[number];

type EquipamentoRow = RowDataPacket & {
  id: string;
  unidade_id: string;
};

type ResultadoAutenticacao =
  | { usuario: UsuarioAutenticado; erro: null }
  | { usuario: null; erro: NextResponse };

function erroJson(mensagem: string, status: number) {
  return NextResponse.json(
    { erro: mensagem },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

async function verificarAutenticacao(): Promise<ResultadoAutenticacao> {
  try {
    const usuario = await obterUsuarioAutenticado();

    if (!usuario) {
      return {
        usuario: null,
        erro: erroJson("Não autenticado.", 401),
      };
    }

    return { usuario, erro: null };
  } catch (erro) {
    console.error("Erro ao verificar autenticação:", erro);

    return {
      usuario: null,
      erro: erroJson("Não foi possível verificar a sessão.", 500),
    };
  }
}

function texto(valor: unknown): string {
  return typeof valor === "string" || typeof valor === "number"
    ? String(valor).trim()
    : "";
}

function detalhesValidos(valor: unknown): Record<string, unknown> {
  return valor &&
    typeof valor === "object" &&
    !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : {};
}

async function obterEquipamentoPermitido(
  id: string,
  usuario: UsuarioAutenticado,
): Promise<EquipamentoRow | null> {
  const [rows] = await pool.execute<EquipamentoRow[]>(
    `
      SELECT id, unidade_id
      FROM equipamentos
      WHERE id = ?
      LIMIT 1
    `,
    [id],
  );

  const equipamento = rows[0];

  if (!equipamento) {
    return null;
  }

  if (!podeAcessarUnidade(usuario, equipamento.unidade_id)) {
    // Retornamos null para não revelar se o ID existe em outra unidade.
    return null;
  }

  return equipamento;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const autenticacao = await verificarAutenticacao();

  if (autenticacao.erro) {
    return autenticacao.erro;
  }

  const usuario = autenticacao.usuario;
  const { id } = await context.params;

  try {
    const equipamento = await obterEquipamentoPermitido(id, usuario);

    if (!equipamento) {
      return erroJson("Equipamento não encontrado.", 404);
    }

    const entrada: unknown = await request.json();

    if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) {
      return erroJson("Os dados enviados são inválidos.", 400);
    }

    const body = entrada as Record<string, unknown>;

    const patrimonio = texto(body.patrimonio) || null;
    if (patrimonio) {
      const [duplicados] = await pool.execute<RowDataPacket[]>(
        "SELECT id FROM equipamentos WHERE unidade_id = ? AND patrimonio = ? AND id <> ? LIMIT 1",
        [equipamento.unidade_id, patrimonio, id],
      );
      if (duplicados.length > 0) {
        return erroJson("Já existe um equipamento com essa identificação nesta unidade. Escolha outro número.", 409);
      }
    }
    const tipo = texto(body.tipo);
    const fabricante = texto(body.fabricante) || null;
    const modelo = texto(body.modelo) || null;
    const numeroSerie = texto(body.numeroSerie) || null;
    const localizacao = texto(body.localizacao) || null;
    const status = texto(body.status);
    const observacoes = texto(body.observacoes) || null;
    const detalhes = detalhesValidos(body.detalhes);

    if (!TIPOS.includes(tipo as TipoEquipamento)) {
      return erroJson("Selecione um tipo de equipamento válido.", 400);
    }

    if (!STATUS.includes(status as StatusEquipamento)) {
      return erroJson("Selecione um status válido.", 400);
    }

    const limites: [string, string | null, number][] = [
      ["patrimônio", patrimonio, 100],
      ["fabricante", fabricante, 150],
      ["modelo", modelo, 150],
      ["número de série", numeroSerie, 150],
      ["localização", localizacao, 150],
    ];

    for (const [nome, valor, limite] of limites) {
      if (valor && valor.length > limite) {
        return erroJson(
          `O campo ${nome} ultrapassa ${limite} caracteres.`,
          400,
        );
      }
    }

    if (observacoes && observacoes.length > 60000) {
      return erroJson(
        "As observações ultrapassam o tamanho permitido.",
        400,
      );
    }

    // Mantém o equipamento na unidade original.
    // Mesmo o administrador geral não altera a unidade por esta rota.
    const [resultado] = await pool.execute<ResultSetHeader>(
      `
        UPDATE equipamentos
        SET
          patrimonio = ?,
          tipo = ?,
          fabricante = ?,
          modelo = ?,
          numero_serie = ?,
          localizacao = ?,
          status = ?,
          observacoes = ?,
          detalhes = ?
        WHERE id = ? AND unidade_id = ?
      `,
      [
        patrimonio,
        tipo,
        fabricante,
        modelo,
        numeroSerie,
        localizacao,
        status,
        observacoes,
        JSON.stringify(detalhes),
        id,
        equipamento.unidade_id,
      ],
    );

    if (resultado.affectedRows === 0) {
      // Pode ser um UPDATE sem mudanças ou uma alteração concorrente.
      const [atuais] = await pool.execute<EquipamentoRow[]>(
        `
          SELECT id, unidade_id
          FROM equipamentos
          WHERE id = ? AND unidade_id = ?
          LIMIT 1
        `,
        [id, equipamento.unidade_id],
      );

      if (!atuais.length) {
        return erroJson("Equipamento não encontrado.", 404);
      }
    }

    return NextResponse.json(
      { sucesso: true, id },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (erro) {
    const erroBanco = erro as { code?: string };

    if (erroBanco.code === "ER_DUP_ENTRY") {
      return erroJson(
        "Já existe um equipamento com esse patrimônio nesta unidade.",
        409,
      );
    }

    console.error("Erro ao editar equipamento:", erro);

    return erroJson(
      "Não foi possível salvar as alterações do equipamento.",
      500,
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const autenticacao = await verificarAutenticacao();
  if (autenticacao.erro) return autenticacao.erro;

  const usuario = autenticacao.usuario;
  const { id } = await context.params;
  let conexao: Awaited<ReturnType<typeof pool.getConnection>> | null = null;
  let transacaoIniciada = false;

  try {
    const permitido = await obterEquipamentoPermitido(id, usuario);
    if (!permitido) return erroJson("Equipamento não encontrado.", 404);

    conexao = await pool.getConnection();
    await conexao.beginTransaction();
    transacaoIniciada = true;

    const [equipamentos] = await conexao.execute<
      (RowDataPacket & { id: string; unidade_id: string })[]
    >(
      "SELECT id, unidade_id FROM equipamentos WHERE id = ? FOR UPDATE",
      [id],
    );
    const equipamento = equipamentos[0];

    if (!equipamento || equipamento.unidade_id !== permitido.unidade_id) {
      await conexao.rollback();
      transacaoIniciada = false;
      return erroJson("Equipamento não encontrado.", 404);
    }

    if (!podeAcessarUnidade(usuario, equipamento.unidade_id)) {
      await conexao.rollback();
      transacaoIniciada = false;
      return erroJson("Você não tem permissão para excluir este equipamento.", 403);
    }

    const [historicos] = await conexao.execute<
      (RowDataPacket & { total: number })[]
    >(
      "SELECT COUNT(*) AS total FROM historico_equipamentos WHERE equipamento_id = ?",
      [id],
    );

    if (Number(historicos[0]?.total ?? 0) > 0) {
      await conexao.rollback();
      transacaoIniciada = false;
      return erroJson(
        "Este equipamento possui histórico vinculado e não pode ser excluído. Preserve os registros e altere o status para Inativo, se necessário.",
        409,
      );
    }

    const [resultado] = await conexao.execute<ResultSetHeader>(
      "DELETE FROM equipamentos WHERE id = ? AND unidade_id = ?",
      [id, equipamento.unidade_id],
    );

    if (resultado.affectedRows === 0) {
      await conexao.rollback();
      transacaoIniciada = false;
      return erroJson("Equipamento não encontrado.", 404);
    }

    await conexao.commit();
    transacaoIniciada = false;

    return NextResponse.json(
      { sucesso: true, id },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (erro) {
    if (conexao && transacaoIniciada) {
      try { await conexao.rollback(); } catch { /* transação já encerrada */ }
    }
    console.error("Erro ao excluir equipamento:", erro);
    return erroJson("Não foi possível excluir o equipamento.", 500);
  } finally {
    conexao?.release();
  }
}
