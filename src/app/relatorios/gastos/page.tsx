"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useUnidade } from "@/components/UnidadeProvider";


type Periodo = "7-dias" | "30-dias" | "6-meses" | "1-ano" | "todo";
type Registro = {
  id: string;
  equipamentoId: string;
  unidadeId: "CE" | "JP";
  equipamento: { patrimonio: string; tipo: string; fabricante: string; modelo: string; localizacao: string };
  tipo: string; categoria: string; data: string; descricao: string; observacao: string;
  custo: number; destinoReparo: string; resultado: string;
};
const TIPOS: Record<string, string> = { chromebook: "Chromebook", notebook: "Notebook", projetor: "Projetor", catraca: "Catraca", impressora: "Impressora" };
const REGISTROS: Record<string, string> = { ocorrencia: "Ocorrência", manutencao: "Manutenção interna", "reposicao-de-peca": "Reposição de peça", "envio-para-reparo": "Envio para reparo", "retorno-de-reparo": "Retorno do reparo" };
const campo = "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none dark:border-[#555555] dark:bg-[#333333] dark:text-white";
const moeda = (valor: number) => valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataBR = (valor: string) => { const partes = (valor || "").slice(0, 10).split("-"); return partes.length === 3 ? partes[2] + "/" + partes[1] + "/" + partes[0] : valor || "—"; };
function limitePeriodo(periodo: Periodo): string | null {
  if (periodo === "todo") return null;
  const data = new Date(); data.setHours(0, 0, 0, 0);
  if (periodo === "7-dias") data.setDate(data.getDate() - 6);
  else if (periodo === "30-dias") data.setDate(data.getDate() - 29);
  else if (periodo === "6-meses") data.setMonth(data.getMonth() - 6);
  else data.setFullYear(data.getFullYear() - 1);
  return data.getFullYear() + "-" + String(data.getMonth() + 1).padStart(2, "0") + "-" + String(data.getDate()).padStart(2, "0");
}
function csv(valor: string | number) { return '"' + String(valor).replace(/"/g, '""') + '"'; }

function temCustoContabilizavel(tipo: string) {
  return tipo === "manutencao" || tipo === "reposicao-de-peca" || tipo === "retorno-de-reparo";
}


export default function RelatorioGastosPage() {
  const { unidadeAtiva, unidadeCarregada } = useUnidade();

  const [registros, setRegistros] = useState<Registro[]>([]);
  const [periodo, setPeriodo] = useState<Periodo>("1-ano");
  const [equipamentoId, setEquipamentoId] = useState("todos");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!unidadeCarregada) return;

    let ativo = true;

    async function carregarRegistros() {
      setCarregando(true);
      setErro("");
      setRegistros([]);
      setEquipamentoId("todos");

      try {
        const resposta = await fetch(
          `/api/historico-equipamentos?unidade=${encodeURIComponent(unidadeAtiva)}`,
          {
            cache: "no-store",
            credentials: "same-origin",
          },
        );

        const dados = await resposta.json().catch(() => []);

        if (!resposta.ok) {
          throw new Error(
            dados.erro || "Não foi possível carregar o relatório.",
          );
        }

        if (ativo) {
          // Defesa adicional: só exibe registros da unidade solicitada.
          const registrosDaUnidade = Array.isArray(dados)
            ? (dados as Registro[]).filter((item) => item.unidadeId === unidadeAtiva)
            : [];
          setRegistros(registrosDaUnidade);
        }
      } catch (erro: unknown) {
        if (ativo) {
          setErro(
            erro instanceof Error
              ? erro.message
              : "Erro ao carregar relatório.",
          );
          setRegistros([]);
        }
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    void carregarRegistros();

    return () => {
      ativo = false;
    };
  }, [unidadeAtiva, unidadeCarregada]);

  const equipamentos = useMemo(() => {
    const mapa = new Map<string, Registro["equipamento"]>();
    registros.forEach((item) => mapa.set(item.equipamentoId, item.equipamento));
    return Array.from(mapa.entries()).map(([id, equipamento]) => ({ id, equipamento }));
  }, [registros]);

  const filtrados = useMemo(() => {
    const limite = limitePeriodo(periodo);
    return registros.filter((item) => {
      if (equipamentoId !== "todos" && item.equipamentoId !== equipamentoId) return false;
      if (limite && item.data < limite) return false;
      return true;
    }).sort((a, b) => b.data.localeCompare(a.data));
  }, [registros, periodo, equipamentoId]);

  const gastos = useMemo(() => filtrados.filter((item) => temCustoContabilizavel(item.tipo)), [filtrados]);
  const manutencoesInternas = gastos.filter((item) => item.tipo === "manutencao" || item.tipo === "reposicao-de-peca");
  const retornos = gastos.filter((item) => item.tipo === "retorno-de-reparo");
  const totalManutencaoInterna = manutencoesInternas.reduce((soma, item) => soma + (Number(item.custo) || 0), 0);
  const totalReparoExterno = retornos.reduce((soma, item) => soma + (Number(item.custo) || 0), 0);
  const total = totalManutencaoInterna + totalReparoExterno;
  const envios = filtrados.filter((item) => item.tipo === "envio-para-reparo").length;


  const meses = useMemo(() => {
    const agora = new Date();

    return Array.from({ length: 12 }, (_, indice) => {
      const data = new Date(
        agora.getFullYear(),
        agora.getMonth() - (11 - indice),
        1,
      );

      const chave =
        data.getFullYear() +
        "-" +
        String(data.getMonth() + 1).padStart(2, "0");

      const nome = data
        .toLocaleDateString("pt-BR", { month: "short" })
        .replace(".", "");

      const valor = filtrados
        .filter((item) => (item.data || "").slice(0, 7) === chave)
        .reduce((soma, item) => soma + (Number(item.custo) || 0), 0);

      return {
        chave,
        nome: nome.charAt(0).toUpperCase() + nome.slice(1),
        valor,
      };
    });
  }, [filtrados]);

  const maxMes = Math.max(...meses.map((m) => m.valor), 1);

  const ranking = useMemo(() => {
    const mapa = new Map<string, { nome: string; tipo: string; total: number; quantidade: number }>();
    gastos.filter((item) => (Number(item.custo) || 0) > 0).forEach((item) => {
      const nome = item.equipamento.patrimonio || item.equipamentoId;
      const atual = mapa.get(item.equipamentoId) || { nome, tipo: TIPOS[item.equipamento.tipo] || item.equipamento.tipo, total: 0, quantidade: 0 };
      atual.total += Number(item.custo) || 0; atual.quantidade += 1; mapa.set(item.equipamentoId, atual);
    });
    return Array.from(mapa.values()).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [gastos]);

  function exportarCSV() {
    const cabecalho = ["Data", "ID do registro", "ID do equipamento", "Patrimônio", "Tipo de equipamento", "Fabricante", "Modelo", "Localização", "Registro", "Categoria", "Descrição", "Destino do reparo", "Resultado", "Custo (R$)"];
    const linhas = filtrados.map((item) => [dataBR(item.data), item.id, item.equipamentoId, item.equipamento.patrimonio, TIPOS[item.equipamento.tipo] || item.equipamento.tipo, item.equipamento.fabricante, item.equipamento.modelo, item.equipamento.localizacao, REGISTROS[item.tipo] || item.tipo, item.categoria, item.descricao, item.destinoReparo, item.resultado, temCustoContabilizavel(item.tipo) && (item.tipo !== "retorno-de-reparo" && (Number(item.custo) || 0) <= 0) ? "" : temCustoContabilizavel(item.tipo) ? (Number(item.custo) || 0).toFixed(2).replace(".", ",") : ""]);
    const texto = [cabecalho, ...linhas].map((linha) => linha.map(csv).join(";")).join("\r\n");
    const blob = new Blob(["\uFEFF", texto], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a");
    link.href = url; link.download = "relatorio-gastos-" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  }

  const indicadores = [
    { nome: "Total geral", valor: moeda(total), detalhe: "Manutenção interna + reparo externo", icone: "↗", estilo: "from-gray-700 to-gray-700", fundo: "bg-gray-100 dark:bg-[#3a3a3a]", texto: "text-gray-800 dark:text-gray-200" },
    { nome: "Manutenção interna", valor: moeda(totalManutencaoInterna), detalhe: "Serviços internos e reposição de peças", icone: "🔧", estilo: "from-gray-700 to-gray-700", fundo: "bg-gray-100 dark:bg-[#3a3a3a]", texto: "text-gray-700 dark:text-gray-300" },
    { nome: "Reparo externo", valor: moeda(totalReparoExterno), detalhe: "Custos informados no retorno", icone: "↩", estilo: "from-gray-700 to-gray-700", fundo: "bg-gray-100 dark:bg-[#3a3a3a]", texto: "text-gray-800 dark:text-gray-200" },
    { nome: "Envios à assistência", valor: String(envios), detalhe: "Envios sem custo até o retorno", icone: "⇧", estilo: "from-gray-700 to-gray-700", fundo: "bg-gray-100 dark:bg-[#3a3a3a]", texto: "text-gray-700 dark:text-gray-300" },
  ];

  return (
    <main className="min-h-screen bg-gray-100 p-4 sm:p-7 xl:p-9 dark:bg-[#3a3a3f]">
      <div className="mx-auto max-w-[1500px]">
        <header className="relative isolate overflow-hidden rounded-[28px] bg-white p-6 text-gray-900 shadow-sm dark:bg-[#2d2d2d] dark:text-gray-100 sm:p-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-200 dark:border-[#555555] dark:bg-[#3a3a3a] dark:text-gray-200 dark:hover:bg-[#454545]">← Dashboard</Link>
              <p className="mt-5 text-xs font-bold uppercase tracking-[.2em] text-gray-500 dark:text-gray-400">Financeiro · Gestão de ativos</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Relatório de gastos</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300">Acompanhe separadamente os gastos da equipe interna e os custos de assistência técnica externa.</p>
            </div>
            <button type="button" onClick={exportarCSV} disabled={carregando || filtrados.length === 0} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-gray-900 shadow-lg transition hover:-translate-y-0.5 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50">↓ Exportar para Excel</button>
          </div>
          <div className="mt-7 flex flex-wrap gap-2 text-xs font-semibold text-gray-700 dark:text-gray-200">
            <span className="rounded-full border border-gray-200 bg-gray-100 px-3 py-1.5 dark:border-[#414141] dark:bg-[#3a3a3a]">● Dados do histórico oficial</span>
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5">Gastos internos no serviço/peça e externos no retorno</span>
          </div>
        </header>

        {erro && <div role="alert" className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">{erro}</div>}

        <section className="mt-5 grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
          {indicadores.map((item) => <article key={item.nome} className="group relative overflow-hidden rounded-2xl border border-white bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-[#414141] dark:bg-[#2d2d2d]">
            <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${item.estilo}`} />
            <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{item.nome}</p><p className={`mt-3 text-2xl font-black tracking-tight ${item.texto}`}>{carregando ? "—" : item.valor}</p></div><span className={`flex h-11 w-11 items-center justify-center rounded-2xl text-xl font-bold ${item.fundo} ${item.texto}`}>{item.icone}</span></div>
            <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">{item.detalhe}</p>
          </article>)}
        </section>

        <section className="mt-5 grid grid-cols-1 gap-5">
          <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 dark:border-[#414141] dark:bg-[#2d2d2d]">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-gray-600 dark:text-gray-300">Visão financeira</p><h2 className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white">Evolução dos gastos</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Despesas de manutenção interna e reparos externos nos últimos 12 meses.</p></div><span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-800 dark:bg-gray-800 dark:text-gray-200">Anual · 12 meses</span></div>
            <div className="mt-6 grid h-64 grid-cols-6 items-end gap-2 sm:grid-cols-12 sm:gap-4 border-b border-dashed border-slate-200 px-2 dark:border-slate-700">
              {meses.map((mes) => <div key={mes.chave} className="flex h-full min-w-0 flex-col items-center justify-end gap-2">
                <span className="whitespace-nowrap text-[10px] font-semibold text-slate-500 dark:text-slate-400 sm:text-xs">{mes.valor > 0 ? moeda(mes.valor) : "—"}</span>
                <div className="flex h-[72%] w-full items-end justify-center"><div title={`${mes.nome}: ${moeda(mes.valor)}`} className={`w-full max-w-12 rounded-t-lg bg-gray-600 dark:bg-gray-400 shadow-sm shadow-black/5 transition-all ${mes.valor > 0 ? "min-h-2" : "h-1"}`} style={{ height: mes.valor > 0 ? `${Math.max(8, (mes.valor / maxMes) * 100)}%` : "4px" }} /></div>
                <span className="pb-2 text-xs font-bold text-slate-600 dark:text-slate-300">{mes.nome}</span>
              </div>)}
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-gray-100 px-4 py-3 dark:bg-[#333333]"><span className="text-sm font-medium text-gray-800 dark:text-gray-100">Total do filtro selecionado</span><strong className="text-lg font-black text-gray-700 dark:text-gray-200">{carregando ? "—" : moeda(total)}</strong></div>
          </article>

          <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 dark:border-[#414141] dark:bg-[#2d2d2d]">
            <p className="text-xs font-bold uppercase tracking-[.16em] text-gray-800 dark:text-gray-200">Onde pesa mais</p><h2 className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white">Maiores custos</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Equipamentos com maior gasto registrado.</p>
            {ranking.length === 0 ? <div className="mt-7 rounded-xl bg-gray-100 p-5 text-center dark:bg-[#333333]"><span className="text-2xl">◇</span><p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Sem custos neste filtro</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">São exibidos os equipamentos com despesas internas ou externas registradas.</p></div> : <div className="mt-5 space-y-4">{ranking.map((item, index) => <div key={item.nome}><div className="flex items-center gap-3"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black ${index === 0 ? "bg-gray-200 text-gray-700 dark:bg-[#454545] dark:text-gray-200" : "bg-gray-100 text-gray-700 dark:bg-[#3a3a3a] dark:text-gray-200"}`}>{String(index + 1).padStart(2, "0")}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">{item.nome}</p><p className="text-xs text-slate-500 dark:text-slate-400">{item.tipo} · {item.quantidade} reparo(s)</p></div><strong className="text-sm font-extrabold text-gray-800 dark:text-gray-200">{moeda(item.total)}</strong></div><div className="ml-11 mt-2 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-[#454545]"><div className="h-full rounded-full bg-gray-600 dark:bg-gray-400" style={{ width: `${Math.max(2, (item.total / Math.max(...ranking.map((r) => r.total), 1)) * 100)}%` }} /></div></div>)}</div>}
          </article>
        </section>

        <section className="mt-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 dark:border-[#414141] dark:bg-[#2d2d2d]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-gray-700 dark:text-gray-300">Refine a consulta</p><h2 className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white">Filtros do relatório</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Aplique um período e, se quiser, veja apenas um equipamento.</p></div><button type="button" onClick={() => { setPeriodo("1-ano"); setEquipamentoId("todos"); }} className="self-start rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 dark:border-gray-500 dark:bg-gray-300 dark:text-gray-900 dark:hover:bg-gray-200 dark:focus-visible:ring-offset-[#2d2d2d]">Limpar filtros ↺</button></div>
          <div className="mt-5 grid gap-4 md:grid-cols-2"><label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">Período</span><select id="periodo" className={campo} value={periodo} onChange={(e) => setPeriodo(e.target.value as Periodo)}><option value="7-dias">Últimos 7 dias</option><option value="30-dias">Últimos 30 dias</option><option value="6-meses">Últimos 6 meses</option><option value="1-ano">Últimos 12 meses (anual)</option><option value="todo">Todo o histórico</option></select></label><label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">Equipamento</span><select id="equipamento" className={campo} value={equipamentoId} onChange={(e) => setEquipamentoId(e.target.value)}><option value="todos">Todos os equipamentos</option>{equipamentos.map(({ id, equipamento }) => <option key={id} value={id}>{equipamento.patrimonio || id} · {TIPOS[equipamento.tipo] || equipamento.tipo} · {equipamento.modelo}</option>)}</select></label></div>
          <div className="mt-4 flex flex-wrap gap-2"><span className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 dark:bg-[#3a3a3a] dark:text-gray-200">{filtrados.length} registro(s)</span><span className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 dark:bg-[#3a3a3a] dark:text-gray-200">{retornos.length} retorno(s) contabilizados</span><span className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 dark:bg-[#3a3a3a] dark:text-gray-200">Envios não somam custo até o retorno</span></div>
        </section>

        <section className="mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-[#414141] dark:bg-[#2d2d2d]">
          <div className="flex flex-col gap-2 border-b border-gray-200 bg-gray-50 px-5 py-5 sm:flex-row sm:items-center sm:justify-between dark:border-[#414141] dark:bg-[#333333]"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-gray-700 dark:text-gray-300">Detalhamento</p><h2 className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white">Histórico financeiro</h2></div><span className="w-fit rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm dark:bg-[#3a3a3a] dark:text-slate-200">{filtrados.length} registro(s)</span></div>
          {carregando ? <div className="p-12 text-center"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-600" /><p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Carregando dados financeiros...</p></div> : filtrados.length === 0 ? <div className="px-5 py-14 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-2xl text-gray-600 dark:bg-[#3a3a3a] dark:text-gray-300">⌕</div><p className="mt-4 font-bold text-slate-800 dark:text-white">Nenhum registro encontrado</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Tente aumentar o período ou selecionar todos os equipamentos.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="border-b border-gray-200 text-[10px] uppercase tracking-[.13em] text-slate-500 dark:border-[#414141] dark:text-slate-400"><tr>{["Data", "Equipamento", "Registro", "Descrição / assistência", "Custo"].map((titulo) => <th key={titulo} className="px-4 py-3.5 font-bold">{titulo}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 dark:divide-[#414141]">{filtrados.map((item) => <tr key={item.id} className="hover:bg-gray-100/60 dark:hover:bg-[#3a3a3a]"><td className="whitespace-nowrap px-4 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400">{dataBR(item.data)}</td><td className="px-4 py-4"><p className="font-bold text-slate-900 dark:text-white">{item.equipamento.patrimonio || item.equipamento.tipo}</p><p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{[item.equipamento.fabricante, item.equipamento.modelo].filter(Boolean).join(" ") || TIPOS[item.equipamento.tipo] || item.equipamento.tipo}</p></td><td className="px-4 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${item.tipo === "retorno-de-reparo" ? "bg-gray-100 text-gray-700 dark:bg-[#3a3a3a] dark:text-gray-200" : item.tipo === "envio-para-reparo" ? "bg-gray-200 text-gray-700 dark:bg-[#454545] dark:text-gray-200" : "bg-gray-100 text-gray-700 dark:bg-[#3a3a3a] dark:text-gray-200"}`}>{REGISTROS[item.tipo] || item.tipo}</span></td><td className="max-w-lg px-4 py-4"><p className="line-clamp-2 text-slate-700 dark:text-slate-200">{item.descricao || "Sem descrição"}</p>{item.destinoReparo && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Assistência: {item.destinoReparo}</p>}</td><td className="whitespace-nowrap px-4 py-4 text-right font-extrabold text-gray-800 dark:text-gray-200">{item.tipo === "retorno-de-reparo" || (temCustoContabilizavel(item.tipo) && (Number(item.custo) || 0) > 0) ? moeda(Number(item.custo) || 0) : <span className="font-medium text-slate-400">—</span>}</td></tr>)}</tbody><tfoot className="border-t border-gray-200 bg-gray-100/70 dark:border-[#414141] dark:bg-[#333333]"><tr><td colSpan={4} className="px-4 py-4 text-right text-sm font-bold text-gray-800 dark:text-gray-100">Total de despesas contabilizadas</td><td className="whitespace-nowrap px-4 py-4 text-right text-base font-black text-gray-700 dark:text-gray-200">{moeda(total)}</td></tr></tfoot></table></div>}
        </section>
        <p className="mt-4 px-1 text-xs leading-5 text-slate-500 dark:text-slate-400">O total geral soma cada custo registrado em manutenção interna/reposição de peças e cada custo de reparo externo informado no retorno. Envios à assistência não geram despesa por si só. Compras de equipamentos serão adicionadas em uma etapa futura.</p>
      </div>
    </main>
  );
}