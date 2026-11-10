
import { randomUUID } from "node:crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import {
  obterUsuarioAutenticado,
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
  "access-point",
] as const;

const STATUS = [
  "disponivel",
  "em-uso",
  "em-reparo",
  "inativo",
  "para-descarte",
] as const;

const UNIDADES = ["CE", "JP"] as const;

type TipoEquipamento = (typeof TIPOS)[number];
type StatusEquipamento = (typeof STATUS)[number];
type UnidadeId = (typeof UNIDADES)[number];

type EquipamentoRow = RowDataPacket & {
  id: string;
  patrimonio: string | null;
  tipo: TipoEquipamento;
  fabricante: string | null;
  modelo: string | null;
  numero_serie: string | null;
  localizacao: string | null;
  mac_address: string | null;
  status: StatusEquipamento;
  observacoes: string | null;
  detalhes: Record<string, unknown> | string | null;
  unidade_id: UnidadeId;
  created_at: string | Date;
  updated_at: string | Date;
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

function ehAdministrador(usuario: UsuarioAutenticado): boolean {
  return usuario.perfil === "admin";
}

function unidadeValida(valor: unknown): valor is UnidadeId {
  return (
    typeof valor === "string" &&
    UNIDADES.includes(valor as UnidadeId)
  );
}

function unidadeDoUsuario(usuario: UsuarioAutenticado): UnidadeId {
  return unidadeValida(usuario.unidade_id)
    ? usuario.unidade_id
    : "CE";
}

const PREFIXOS_PATRIMONIO: Record<TipoEquipamento, string> = {
  chromebook: "CHROME",
  notebook: "NOTE",
  projetor: "PROJ",
  catraca: "CATRACA",
  impressora: "IMP",
  "access-point": "AP",
};

async function obterProximoPatrimonio(tipo: TipoEquipamento): Promise<string> {
  const prefixo = PREFIXOS_PATRIMONIO[tipo];
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT patrimonio FROM equipamentos WHERE patrimonio IS NOT NULL",
  );
  const usados = new Set<number>();

  for (const row of rows) {
    const correspondencia = new RegExp("^" + prefixo + "-(\\d+)$", "i").exec(
      String(row.patrimonio ?? "").trim(),
    );
    if (correspondencia) usados.add(Number(correspondencia[1]));
  }

  let proximo = 1;
  while (usados.has(proximo)) proximo++;
  return `${prefixo}-${String(proximo).padStart(3, "0")}`;
}

function texto(valor: unknown): string {
  return typeof valor === "string" || typeof valor === "number"
    ? String(valor).trim()
    : "";
}

function normalizarDetalhes(valor: unknown): Record<string, unknown> {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) {
    return {};
  }

  return valor as Record<string, unknown>;
}

function apresentarEquipamento(row: EquipamentoRow) {
  let detalhes: Record<string, unknown> = {};

  if (row.detalhes && typeof row.detalhes === "object") {
    detalhes = row.detalhes;
  } else if (typeof row.detalhes === "string") {
    try {
      const parseado: unknown = JSON.parse(row.detalhes);
      detalhes = normalizarDetalhes(parseado);
    } catch {
      detalhes = {};
    }
  }

  if (row.tipo === "access-point") {
    detalhes = {
      ...detalhes,
      bloco: detalhes.bloco ?? "",
      rack: detalhes.rack ?? row.localizacao ?? "",
      macAddress: row.mac_address ?? detalhes.macAddress ?? "",
      potenciaDbm: detalhes.potenciaDbm ?? 0,
    };
  }

  return {
    id: row.id,
    patrimonio: row.patrimonio ?? "",
    tipo: row.tipo,
    fabricante: row.fabricante ?? "",
    modelo: row.modelo ?? "",
    numeroSerie: row.numero_serie ?? "",
    localizacao: row.localizacao ?? "",
    status: row.status,
    observacoes: row.observacoes ?? "",
    detalhes,
    unidadeId: row.unidade_id,
    criadoEm: row.created_at,
    atualizadoEm: row.updated_at,
  };
}

export async function GET(request: Request) {
  const autenticacao = await verificarAutenticacao();

  if (autenticacao.erro) {
    return autenticacao.erro;
  }

  const usuario = autenticacao.usuario;
  const administrador = ehAdministrador(usuario);
  const podeAlternarUnidade = administrador || usuario.unidade_id === "AMBOS";

  const parametros = new URL(request.url).searchParams;
  const tipoParaSugestao = parametros.get("tipo");
  if (parametros.get("proximoPatrimonio") === "1") {
    if (!TIPOS.includes(tipoParaSugestao as TipoEquipamento)) {
      return erroJson("Selecione um tipo de equipamento válido.", 400);
    }
    try {
      const patrimonio = await obterProximoPatrimonio(tipoParaSugestao as TipoEquipamento);
      return NextResponse.json(
        { patrimonio },
        { headers: { "Cache-Control": "no-store" } },
      );
    } catch (erro) {
      console.error("Erro ao gerar sugestão de patrimônio:", erro);
      return erroJson("Não foi possível consultar uma identificação livre.", 500);
    }
  }

  const unidadeSolicitada = parametros.get("unidade");

  let unidade: UnidadeId;

  if (podeAlternarUnidade) {
    if (unidadeSolicitada && !unidadeValida(unidadeSolicitada)) {
      return erroJson("Selecione uma unidade válida: CE ou JP.", 400);
    }

    unidade = unidadeValida(unidadeSolicitada)
      ? unidadeSolicitada
      : unidadeDoUsuario(usuario);
  } else {
    unidade = unidadeDoUsuario(usuario);

    if (
      unidadeSolicitada &&
      unidadeSolicitada !== unidade
    ) {
      return erroJson(
        "Você não tem permissão para acessar outra unidade.",
        403,
      );
    }
  }

  try {
    const [rows] = await pool.execute<EquipamentoRow[]>(
      `
        SELECT
          id,
          patrimonio,
          tipo,
          fabricante,
          modelo,
          numero_serie,
          localizacao,
          mac_address,
          status,
          observacoes,
          detalhes,
          unidade_id,
          created_at,
          updated_at
        FROM equipamentos
        WHERE unidade_id = ?
        ORDER BY tipo, patrimonio, created_at
      `,
      [unidade],
    );

    return NextResponse.json(
      rows.map(apresentarEquipamento),
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (erro) {
    console.error("Erro ao listar equipamentos:", erro);

    return erroJson(
      "Não foi possível listar os equipamentos. Confira a conexão e a estrutura do banco.",
      500,
    );
  }
}

export async function POST(request: Request) {
  const autenticacao = await verificarAutenticacao();

  if (autenticacao.erro) {
    return autenticacao.erro;
  }

  const usuario = autenticacao.usuario;
  const administrador = ehAdministrador(usuario);
  const podeAlternarUnidade = administrador || usuario.unidade_id === "AMBOS";

  try {
    const entrada: unknown = await request.json();

    if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) {
      return erroJson("Os dados enviados são inválidos.", 400);
    }

    const body = entrada as Record<string, unknown>;

    let patrimonio = texto(body.patrimonio) || null;
    const tipo = texto(body.tipo);
    const fabricante = texto(body.fabricante) || null;
    const modelo = texto(body.modelo) || null;
    const numeroSerie = texto(body.numeroSerie) || null;
    const localizacao = texto(body.localizacao) || null;
    const status = texto(body.status || "disponivel");
    const observacoes = texto(body.observacoes) || null;
    const detalhes = normalizarDetalhes(body.detalhes);

    const unidadeEnviada = texto(
      body.unidadeId ?? body.unidade_id,
    );

    let unidade: UnidadeId;

    if (podeAlternarUnidade) {
      if (unidadeEnviada && !unidadeValida(unidadeEnviada)) {
        return erroJson("Selecione uma unidade válida: CE ou JP.", 400);
      }

      unidade = unidadeValida(unidadeEnviada)
        ? unidadeEnviada
        : unidadeDoUsuario(usuario);
    } else {
      unidade = unidadeDoUsuario(usuario);

      if (unidadeEnviada && unidadeEnviada !== unidade) {
        return erroJson(
          "Você não tem permissão para cadastrar equipamentos em outra unidade.",
          403,
        );
      }
    }

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

    if (!patrimonio) {
      // Gera o menor identificador livre para o tipo selecionado, consultando todas as unidades.
      patrimonio = await obterProximoPatrimonio(tipo as TipoEquipamento);
    }

    const [patrimonioDuplicado] = await pool.execute<RowDataPacket[]>(
      "SELECT id FROM equipamentos WHERE patrimonio = ? LIMIT 1",
      [patrimonio],
    );
    if (patrimonioDuplicado.length > 0) {
      return erroJson("Essa identificação já está em uso no sistema. Escolha outro valor.", 409);
    }

    const id = `EQ-${randomUUID()}`;

    await pool.execute<ResultSetHeader>(
      `
        INSERT INTO equipamentos (
          id,
          patrimonio,
          tipo,
          fabricante,
          modelo,
          numero_serie,
          localizacao,
          status,
          observacoes,
          detalhes,
          unidade_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        patrimonio,
        tipo,
        fabricante,
        modelo,
        numeroSerie,
        localizacao,
        status,
        observacoes,
        JSON.stringify(detalhes),
        unidade,
      ],
    );

    return NextResponse.json(
      {
        id,
        patrimonio: patrimonio ?? "",
        tipo,
        fabricante: fabricante ?? "",
        modelo: modelo ?? "",
        numeroSerie: numeroSerie ?? "",
        localizacao: localizacao ?? "",
        status,
        observacoes: observacoes ?? "",
        detalhes,
        unidadeId: unidade,
      },
      {
        status: 201,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (erro) {
    const erroBanco = erro as { code?: string };

    if (erroBanco.code === "ER_DUP_ENTRY") {
      return erroJson(
        "Essa identificação já está em uso no sistema.",
        409,
      );
    }

    console.error("Erro ao cadastrar equipamento:", erro);

    return erroJson(
      "Não foi possível cadastrar o equipamento. Confira a conexão e a estrutura do banco.",
      500,
    );
  }
}
