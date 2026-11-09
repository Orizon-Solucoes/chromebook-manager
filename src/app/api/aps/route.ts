import { randomUUID } from "node:crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { obterUsuarioAutenticado, podeAcessarUnidade } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Unidade = "CE" | "JP";
type APDetalhes = { bloco: string; rack: string; macAddress: string; potenciaDbm: number };
type APRow = RowDataPacket & {
  id: string; unidade_id: Unidade; fabricante: string | null; modelo: string | null;
  localizacao: string | null; status: string; observacoes: string | null;
  detalhes: APDetalhes | string | null; created_at: string | Date; updated_at: string | Date;
};
const erro = (mensagem: string, status: number) =>
  NextResponse.json({ erro: mensagem }, { status, headers: { "Cache-Control": "no-store" } });
const ehUnidade = (v: unknown): v is Unidade => v === "CE" || v === "JP";

async function contexto(request: Request) {
  const usuario = await obterUsuarioAutenticado();
  if (!usuario) return { erro: erro("Não autenticado.", 401) } as const;
  const p = new URL(request.url).searchParams.get("unidade");
  const geral = usuario.perfil === "admin_geral" || usuario.perfil === "admin";
  const podeAlternar = geral || usuario.unidade_id === "AMBOS";
  const propria = ehUnidade(usuario.unidade_id) ? usuario.unidade_id : "CE";
  if (p && !ehUnidade(p)) return { erro: erro("Unidade inválida.", 400) } as const;
  const unidade = podeAlternar ? (ehUnidade(p) ? p : propria) : propria;
  if (!podeAcessarUnidade(usuario, unidade)) return { erro: erro("Sem permissão para acessar esta unidade.", 403) } as const;
  return { unidade } as const;
}

type ValoresAP = { bloco: string; rack: string; marca: string; modelo: string; macAddress: string; potenciaDbm: number; status: string; observacoes: string | null };
type ResultadoValidacao = { ok: false; erro: string } | { ok: true; valores: ValoresAP };

function validar(b: Record<string, unknown>): ResultadoValidacao {
  const bloco = String(b.bloco ?? "").trim();
  const rack = String(b.rack ?? "").trim();
  const marca = String(b.marca ?? "").trim();
  const modelo = String(b.modelo ?? "").trim();
  const macAddress = String(b.macAddress ?? "").trim().toUpperCase().replace(/-/g, ":");
  const potenciaDbm = Number(b.potenciaDbm);
  const status = String(b.status ?? "OK");
  const observacoes = String(b.observacoes ?? "").trim() || null;
  if (!bloco || !rack || !marca || !modelo || !macAddress) return { ok: false, erro: "Preencha bloco, rack, marca, modelo e MAC Address." };
  if (!/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(macAddress)) return { ok: false, erro: "MAC inválido. Use AA:BB:CC:DD:EE:FF." };
  if (!Number.isFinite(potenciaDbm) || potenciaDbm < 0 || potenciaDbm > 100) return { ok: false, erro: "Informe uma potência válida em dBm." };
  if (!["OK", "Atenção", "Em manutenção", "Inativo"].includes(status)) return { ok: false, erro: "Status inválido." };
  return { ok: true, valores: { bloco, rack, marca, modelo, macAddress, potenciaDbm, status, observacoes } };
}

function lerDetalhes(valor: APRow["detalhes"]): APDetalhes {
  if (typeof valor === "string") {
    try { return JSON.parse(valor) as APDetalhes; } catch { return { bloco: "", rack: "", macAddress: "", potenciaDbm: 0 }; }
  }
  return valor && typeof valor === "object" ? valor : { bloco: "", rack: "", macAddress: "", potenciaDbm: 0 };
}

function apresentar(r: APRow) {
  const d = lerDetalhes(r.detalhes);
  return {
    id: r.id, unidadeId: r.unidade_id, bloco: d.bloco || "", rack: d.rack || r.localizacao || "",
    marca: r.fabricante || "", modelo: r.modelo || "", macAddress: d.macAddress || "",
    potenciaDbm: Number(d.potenciaDbm ?? 0), status: r.status,
    observacoes: r.observacoes ?? "", criadoEm: r.created_at, atualizadoEm: r.updated_at,
  };
}

export async function GET(request: Request) {
  try {
    const c = await contexto(request); if ("erro" in c) return c.erro;
    const [rows] = await pool.execute<APRow[]>(
      "SELECT id, unidade_id, fabricante, modelo, localizacao, status, observacoes, detalhes, created_at, updated_at FROM equipamentos WHERE unidade_id = ? AND tipo = 'access-point' ORDER BY JSON_UNQUOTE(JSON_EXTRACT(detalhes, '$.bloco')), localizacao, fabricante, modelo",
      [c.unidade],
    );
    return NextResponse.json(rows.map(apresentar), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("Erro ao listar APs:", e);
    return erro("Não foi possível carregar os APs.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const c = await contexto(request); if ("erro" in c) return c.erro;
    const b: unknown = await request.json();
    if (!b || typeof b !== "object" || Array.isArray(b)) return erro("Dados inválidos.", 400);
    const v = validar(b as Record<string, unknown>); if (!v.ok) return erro(v.erro, 400);
    const a = v.valores;
    const [duplicados] = await pool.execute<RowDataPacket[]>(
      "SELECT id FROM equipamentos WHERE unidade_id = ? AND tipo = 'access-point' AND JSON_UNQUOTE(JSON_EXTRACT(detalhes, '$.macAddress')) = ? LIMIT 1",
      [c.unidade, a.macAddress],
    );
    if (duplicados.length) return erro("Já existe um AP com esse MAC nesta unidade.", 409);
    const id = "AP-" + randomUUID();
    const detalhes: APDetalhes = { bloco: a.bloco, rack: a.rack, macAddress: a.macAddress, potenciaDbm: a.potenciaDbm };
    await pool.execute<ResultSetHeader>(
      "INSERT INTO equipamentos (id, patrimonio, tipo, fabricante, modelo, numero_serie, localizacao, status, observacoes, detalhes, unidade_id) VALUES (?, NULL, 'access-point', ?, ?, NULL, ?, ?, ?, ?, ?)",
      [id, a.marca, a.modelo, a.rack, a.status, a.observacoes, JSON.stringify(detalhes), c.unidade],
    );
    return NextResponse.json({ id, unidadeId: c.unidade, ...a }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("Erro ao cadastrar AP:", e);
    return erro("Não foi possível cadastrar o AP.", 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const c = await contexto(request); if ("erro" in c) return c.erro;
    const b: unknown = await request.json();
    if (!b || typeof b !== "object" || Array.isArray(b)) return erro("Dados inválidos.", 400);
    const entrada = b as Record<string, unknown>;
    const id = String(entrada.id ?? "").trim(); if (!id) return erro("ID do AP não informado.", 400);
    const v = validar(entrada); if (!v.ok) return erro(v.erro, 400);
    const a = v.valores;
    const [duplicados] = await pool.execute<RowDataPacket[]>(
      "SELECT id FROM equipamentos WHERE unidade_id = ? AND tipo = 'access-point' AND JSON_UNQUOTE(JSON_EXTRACT(detalhes, '$.macAddress')) = ? AND id <> ? LIMIT 1",
      [c.unidade, a.macAddress, id],
    );
    if (duplicados.length) return erro("Já existe um AP com esse MAC nesta unidade.", 409);
    const detalhes: APDetalhes = { bloco: a.bloco, rack: a.rack, macAddress: a.macAddress, potenciaDbm: a.potenciaDbm };
    const [r] = await pool.execute<ResultSetHeader>(
      "UPDATE equipamentos SET fabricante = ?, modelo = ?, localizacao = ?, status = ?, observacoes = ?, detalhes = ? WHERE id = ? AND unidade_id = ? AND tipo = 'access-point'",
      [a.marca, a.modelo, a.rack, a.status, a.observacoes, JSON.stringify(detalhes), id, c.unidade],
    );
    if (!r.affectedRows) {
      const [existe] = await pool.execute<RowDataPacket[]>(
        "SELECT id FROM equipamentos WHERE id = ? AND unidade_id = ? AND tipo = 'access-point' LIMIT 1", [id, c.unidade],
      );
      if (!existe.length) return erro("AP não encontrado nesta unidade.", 404);
    }
    return NextResponse.json({ id, unidadeId: c.unidade, ...a }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("Erro ao editar AP:", e);
    return erro("Não foi possível atualizar o AP.", 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const c = await contexto(request); if ("erro" in c) return c.erro;
    const id = new URL(request.url).searchParams.get("id")?.trim();
    if (!id) return erro("ID do AP não informado.", 400);
    const [r] = await pool.execute<ResultSetHeader>(
      "DELETE FROM equipamentos WHERE id = ? AND unidade_id = ? AND tipo = 'access-point'", [id, c.unidade],
    );
    if (!r.affectedRows) return erro("AP não encontrado nesta unidade.", 404);
    return NextResponse.json({ sucesso: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "ER_ROW_IS_REFERENCED_2" || code === "ER_ROW_IS_REFERENCED") return erro("Este AP possui histórico vinculado e não pode ser excluído.", 409);
    console.error("Erro ao excluir AP:", e);
    return erro("Não foi possível excluir o AP.", 500);
  }
}
