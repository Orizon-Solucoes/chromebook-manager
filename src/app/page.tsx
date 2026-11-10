"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useUnidade } from "@/components/UnidadeProvider";

type Equipamento = {
  id: string;
  patrimonio: string;
  tipo: string;
  fabricante: string;
  modelo: string;
  localizacao: string;
  status: string;
};

type Registro = {
  id: string;
  equipamentoId: string;
  equipamento: {
    patrimonio: string;
    tipo: string;
    fabricante: string;
    modelo: string;
    localizacao: string;
  };
  tipo: string;
  data: string;
  descricao: string;
  custo: number;
  destinoReparo: string;
  resultado: string;
};

const TIPOS: Record<string, string> = {
  chromebook: "Chromebooks",
  notebook: "Notebooks",
  projetor: "Projetores",
  catraca: "Catracas",
  impressora: "Impressoras",
  "access-point": "Access Points (APs)",
};

const ROTAS_CATEGORIAS: Record<string, string> = {
  chromebook: "/chromebooks",
  notebook: "/notebooks",
  projetor: "/projetores",
  catraca: "/catracas",
  impressora: "/impressoras",
  "access-point": "/aps",
};

const TIPOS_HISTORICO: Record<string, string> = {
  manutencao: "Manutenção",
  "reposicao-de-peca": "Reposição de peça",
  "envio-para-reparo": "Envio para reparo",
  "retorno-de-reparo": "Retorno do reparo",
};

function formatarData(valor: string) {
  if (!valor) return "—";

  const partes = valor.slice(0, 10).split("-");

  return partes.length === 3
    ? `${partes[2]}/${partes[1]}/${partes[0]}`
    : valor;
}

function moeda(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function Home() {
  const { unidadeAtiva, unidadeCarregada } = useUnidade();

  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [historico, setHistorico] = useState<Registro[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!unidadeCarregada) return;

    let ativo = true;

    async function carregarDashboard() {
      setCarregando(true);
      setErro("");
      setEquipamentos([]);
      setHistorico([]);

      try {
        const unidade = encodeURIComponent(unidadeAtiva);

        const [respostaEquipamentos, respostaHistorico] = await Promise.all([
          fetch(`/api/equipamentos?unidade=${unidade}`, {
            cache: "no-store",
            credentials: "same-origin",
          }),
          fetch(`/api/historico-equipamentos?unidade=${unidade}`, {
            cache: "no-store",
            credentials: "same-origin",
          }),
        ]);

        const [dadosEquipamentos, dadosHistorico] = await Promise.all([
          respostaEquipamentos.json().catch(() => []),
          respostaHistorico.json().catch(() => []),
        ]);

        if (!respostaEquipamentos.ok) {
          throw new Error(dadosEquipamentos.erro || "Falha ao consultar equipamentos.");
        }
        if (!respostaHistorico.ok) {
          throw new Error(dadosHistorico.erro || "Falha ao consultar histórico.");
        }
        if (!ativo) return;

        setEquipamentos(Array.isArray(dadosEquipamentos) ? dadosEquipamentos : []);
        setHistorico(Array.isArray(dadosHistorico) ? dadosHistorico : []);

      } catch (e: unknown) {
        if (ativo) {
          setErro(
            e instanceof Error
              ? e.message
              : "Não foi possível carregar o dashboard.",
          );
        }
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    void carregarDashboard();

    return () => {
      ativo = false;
    };
  }, [unidadeAtiva, unidadeCarregada]);

  const porTipo = useMemo(
    () =>
      Object.keys(TIPOS).map((tipo) => ({
        tipo,
        nome: TIPOS[tipo],
        quantidade: equipamentos.filter(
          (item) => item.tipo === tipo,
        ).length,
      })),
    [equipamentos],
  );

  const emReparo = equipamentos.filter(
    (item) => item.status === "em-reparo",
  ).length;

  const emUso = equipamentos.filter(
    (item) => item.status === "em-uso",
  ).length;

  const custoReparos = historico
    .filter((item) => item.tipo === "retorno-de-reparo")
    .reduce(
      (total, item) => total + (Number(item.custo) || 0),
      0,
    );

  const maioresGastos = useMemo(() => {
    const mapa = new Map<
      string,
      {
        id: string;
        nome: string;
        tipo: string;
        modelo: string;
        total: number;
        reparos: number;
      }
    >();

    historico
      .filter(
        (item) =>
          item.tipo === "retorno-de-reparo" && (Number(item.custo) || 0) > 0,
      )
      .forEach((item) => {
        const atual = mapa.get(item.equipamentoId) || {
          id: item.equipamentoId,
          nome:
            item.equipamento.patrimonio ||
            item.equipamentoId,
          tipo:
            TIPOS[item.equipamento.tipo] ||
            item.equipamento.tipo,
          modelo: [
            item.equipamento.fabricante,
            item.equipamento.modelo,
          ]
            .filter(Boolean)
            .join(" "),
          total: 0,
          reparos: 0,
        };

        atual.total += Number(item.custo) || 0;
        atual.reparos += 1;

        mapa.set(item.equipamentoId, atual);
      });

    return Array.from(mapa.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [historico]);

  const maisManutencoes = useMemo(() => {
    const mapa = new Map<
      string,
      {
        id: string;
        nome: string;
        tipo: string;
        modelo: string;
        manutencoes: number;
      }
    >();

    historico
      .filter((item) => item.tipo === "manutencao")
      .forEach((item) => {
        const atual = mapa.get(item.equipamentoId) || {
          id: item.equipamentoId,
          nome: item.equipamento.patrimonio || item.equipamentoId,
          tipo: TIPOS[item.equipamento.tipo] || item.equipamento.tipo,
          modelo: [item.equipamento.fabricante, item.equipamento.modelo]
            .filter(Boolean)
            .join(" "),
          manutencoes: 0,
        };

        atual.manutencoes += 1;
        mapa.set(item.equipamentoId, atual);
      });

    return Array.from(mapa.values())
      .sort((a, b) => b.manutencoes - a.manutencoes || a.nome.localeCompare(b.nome))
      .slice(0, 5);
  }, [historico]);

  const cards = [
    {
      titulo: "Equipamentos cadastrados",
      valor: equipamentos.length,
      descricao: "Total de itens no inventário",
      icone: "▦",
    },
    {
      titulo: "Em uso",
      valor: emUso,
      descricao: "Equipamentos em utilização",
      icone: "✓",
    },
    {
      titulo: "Em reparo",
      valor: emReparo,
      descricao: "Itens enviados à assistência",
      icone: "⚒",
    },
    {
      titulo: "Custo de reparos",
      valor: moeda(custoReparos),
      descricao: "Total registrado nos retornos",
      icone: "R$",
    },
  ];

  return (
    <main className="min-h-screen bg-gray-100 p-4 sm:p-7 xl:p-9 dark:bg-[#2b2b2b]">
      <div className="mx-auto max-w-[1500px]">
        <header className="rounded-xl border border-gray-300 bg-white p-6 shadow-sm sm:p-8 dark:border-gray-600 dark:bg-[#383838]">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                Central administrativa · Tecnologia
              </p>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl dark:text-gray-100">
                Dashboard
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300">
                Visão geral do patrimônio, da disponibilidade dos
                equipamentos e das atividades de suporte.
              </p>
            </div>

            <Link
              href="/cadastros"
              className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-lg border border-gray-400 bg-gray-200 px-5 py-3 text-sm font-semibold text-gray-900 transition hover:bg-gray-300 sm:self-center dark:border-gray-500 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
            >
              ＋ Novo registro
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-gray-200 pt-4 text-xs text-gray-500 dark:border-gray-600 dark:text-gray-400">
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-gray-500" />
              Inventário e patrimônio · Unidade {unidadeAtiva}
            </span>

            <span>Manutenção e suporte técnico</span>
          </div>
        </header>

        {erro && (
          <div
            role="alert"
            className="mt-5 rounded-lg border border-gray-400 bg-gray-200 p-4 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          >
            {erro}
          </div>
        )}

        <section
          aria-label="Indicadores principais"
          className="mt-5 grid gap-4 sm:grid-cols-2 2xl:grid-cols-4"
        >
          {cards.map((item, index) => (
            <article
              key={item.titulo}
              className="rounded-xl border border-gray-300 bg-white p-5 shadow-sm transition hover:border-gray-400 dark:border-gray-600 dark:bg-[#383838] dark:hover:border-gray-500"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  {item.titulo}
                </p>

                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-gray-100 text-sm font-bold text-gray-700 dark:border-gray-600 dark:bg-[#464646] dark:text-gray-100">
                  {item.icone}
                </span>
              </div>

              <p className="mt-5 text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
                {carregando ? "—" : item.valor}
              </p>

              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {item.descricao}
              </p>

              <div
                className={`mt-5 h-1 rounded-full ${
                  index === 0
                    ? "bg-gray-500"
                    : index === 1
                      ? "bg-gray-400"
                      : index === 2
                        ? "bg-gray-600"
                        : "bg-gray-300 dark:bg-gray-500"
                }`}
              />
            </article>
          ))}
        </section>

        <section className="mt-5 grid grid-cols-1 gap-5">
          <article className="overflow-hidden rounded-2xl border border-gray-300 bg-white shadow-sm dark:border-gray-600 dark:bg-[#383838]">
            <div className="flex items-center justify-between gap-4 border-b border-gray-200 px-4 py-3 sm:px-5 dark:border-gray-600">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-xl text-amber-800 dark:bg-amber-400/15 dark:text-amber-300"
                  aria-hidden="true"
                >
                  ▦
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.13em] text-gray-500 dark:text-gray-400">
                    Distribuição
                  </p>

                  <h2 className="mt-0.5 text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Inventário por categoria
                  </h2>
                </div>
              </div>

              <Link
                href="/equipamentos"
                className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-gray-400 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Ver inventário <span aria-hidden="true">→</span>
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 lg:grid-cols-6">
              {porTipo.map((item) => {
                const proporcao = equipamentos.length
                  ? Math.round(
                      (item.quantidade / equipamentos.length) * 100,
                    )
                  : 0;

                const simbolos: Record<string, string> = {
                  chromebook: "▣",
                  notebook: "▱",
                  projetor: "◉",
                  catraca: "↔",
                  impressora: "▤",
                  "access-point": "⌁",
                };

                return (
                  <Link
                    key={item.tipo}
                    href={ROTAS_CATEGORIAS[item.tipo] ?? "/equipamentos"}
                    className="group min-w-0 rounded-lg border border-gray-200 bg-gray-50/70 p-3 transition duration-150 hover:-translate-y-0.5 hover:border-amber-500 hover:bg-gray-100 dark:border-gray-600 dark:bg-[#30302f] dark:hover:border-amber-400 dark:hover:bg-[#3c382d]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-base text-gray-700 dark:border-gray-600 dark:bg-[#464646] dark:text-gray-100"
                        aria-hidden="true"
                      >
                        {simbolos[item.tipo] || "▦"}
                      </span>

                      <span className="rounded-full border border-gray-300 bg-gray-200 px-2 py-0.5 text-[10px] font-bold tabular-nums text-gray-800 dark:border-gray-500 dark:bg-[#454542] dark:text-gray-100">
                        {carregando ? "—" : `${proporcao}%`}
                      </span>
                    </div>

                    <p className="mt-2 text-xs font-medium text-gray-600 dark:text-gray-300">
                      {item.nome}
                    </p>

                    <div className="mt-1 flex items-end justify-between gap-2">
                      <p className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
                        {carregando ? "—" : item.quantidade}
                      </p>

                      <span className="pb-0.5 text-[10px] text-gray-500 transition group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white">
                        Ver itens{" "}
                        <span aria-hidden="true">↗</span>
                      </span>
                    </div>

                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                      <div
                        className="h-full rounded-full bg-[#9a6b00] transition-all duration-500 dark:bg-[#e0b43d]"
                        style={{
                          width: carregando ? "0%" : `${proporcao}%`,
                        }}
                      />
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-gray-200 px-5 py-2.5 dark:border-gray-600">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Total de equipamentos cadastrados · {unidadeAtiva}
              </span>

              <span className="text-sm font-bold tabular-nums text-gray-900 dark:text-gray-100">
                {carregando ? "—" : equipamentos.length}
              </span>
            </div>
          </article>
        </section>

        <section className="mt-6">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
              Análise preventiva · {unidadeAtiva}
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
              Equipamentos que merecem atenção
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Identifique os equipamentos com manutenção recorrente ou maior custo acumulado de reparo.
            </p>
          </div>

          <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2">
            <article className="flex h-full min-w-0 flex-col rounded-2xl border border-gray-300 bg-white p-5 shadow-sm dark:border-gray-600 dark:bg-[#383838]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
                    Recorrência
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Mais manutenções
                  </h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                    Top 5 por quantidade de registros de manutenção interna.
                  </p>
                </div>
                <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-300 bg-gray-100 text-lg text-gray-700 dark:border-gray-600 dark:bg-[#464646] dark:text-gray-100">
                  ⚒
                </span>
              </div>

              {carregando ? (
                <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  Calculando manutenções...
                </p>
              ) : maisManutencoes.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  Ainda não há manutenções internas registradas.
                </p>
              ) : (
                <div className="mt-4 flex-1 divide-y divide-gray-200 dark:divide-gray-600">
                  {maisManutencoes.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-3 py-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-sm font-bold text-gray-700 dark:bg-gray-700 dark:text-gray-100">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-gray-900 dark:text-gray-100">
                          {item.nome}
                        </p>
                        <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                          {item.tipo}{item.modelo ? ` · ${item.modelo}` : ""}
                        </p>
                      </div>
                      <strong className="whitespace-nowrap text-sm font-bold text-gray-900 dark:text-gray-100">
                        {item.manutencoes} {item.manutencoes === 1 ? "manutenção" : "manutenções"}
                      </strong>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-auto border-t border-gray-200 pt-3 dark:border-gray-600">
                <Link href="/historico" className="text-sm font-semibold text-gray-700 hover:underline dark:text-gray-200">
                  Consultar histórico →
                </Link>
              </div>
            </article>

            <article className="flex h-full min-w-0 flex-col rounded-2xl border border-gray-300 bg-white p-5 shadow-sm dark:border-gray-600 dark:bg-[#383838]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
                    Impacto financeiro
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Maiores gastos com reparo
                  </h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                    Top 5 pelo total de custos registrados nos retornos da assistência.
                  </p>
                </div>
                <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-300 bg-gray-100 text-lg text-gray-700 dark:border-gray-600 dark:bg-[#464646] dark:text-gray-100">
                  R$
                </span>
              </div>

              {carregando ? (
                <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  Calculando custos...
                </p>
              ) : maioresGastos.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  Ainda não há custos positivos de reparo registrados.
                </p>
              ) : (
                <div className="mt-4 flex-1 divide-y divide-gray-200 dark:divide-gray-600">
                  {maioresGastos.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-3 py-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-sm font-bold text-gray-700 dark:bg-gray-700 dark:text-gray-100">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-gray-900 dark:text-gray-100">
                          {item.nome}
                        </p>
                        <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                          {item.tipo}{item.modelo ? ` · ${item.modelo}` : ""} · {item.reparos} {item.reparos === 1 ? "reparo" : "reparos"}
                        </p>
                      </div>
                      <strong className="whitespace-nowrap text-sm font-bold text-gray-900 dark:text-gray-100">
                        {moeda(item.total)}
                      </strong>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-auto border-t border-gray-200 pt-3 dark:border-gray-600">
                <Link href="/relatorios/gastos" className="text-sm font-semibold text-gray-700 hover:underline dark:text-gray-200">
                  Ver relatório de gastos →
                </Link>
              </div>
            </article>
          </div>
        </section>


        <section className="mt-5 grid grid-cols-1 gap-5">
          <article className="rounded-2xl border border-gray-300 bg-white p-5 shadow-sm sm:p-6 dark:border-gray-600 dark:bg-[#383838]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
                  Registros · {unidadeAtiva}
                </p>

                <h2 className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Atividade recente
                </h2>
              </div>

              <Link
                href="/historico"
                className="rounded-md px-2 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Ver histórico →
              </Link>
            </div>

            {carregando ? (
              <p className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                Carregando atividades da unidade...
              </p>
            ) : historico.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg border border-gray-300 bg-gray-100 text-lg text-gray-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200">
                  —
                </div>

                <p className="mt-3 font-semibold text-gray-800 dark:text-gray-100">
                  Nenhuma atividade registrada
                </p>

                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Manutenções e reparos aparecerão aqui.
                </p>

                <Link
                  href="/cadastros"
                  className="mt-4 inline-flex rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  Criar primeiro registro
                </Link>
              </div>
            ) : (
              <div className="mt-3 divide-y divide-gray-200 dark:divide-gray-600">
                {historico.slice(0, 5).map((item) => (
                  <div key={item.id} className="py-4 first:pt-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-md border border-gray-300 bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200">
                        {TIPOS_HISTORICO[item.tipo] || item.tipo}
                      </span>

                      <span className="text-xs tabular-nums text-gray-500 dark:text-gray-400">
                        {formatarData(item.data)}
                      </span>
                    </div>

                    <p className="mt-2 font-semibold text-gray-900 dark:text-gray-100">
                      {item.equipamento.patrimonio ||
                        item.equipamento.tipo}{" "}
                      ·{" "}
                      {[
                        item.equipamento.fabricante,
                        item.equipamento.modelo,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    </p>

                    <p className="mt-1 line-clamp-2 text-sm leading-5 text-gray-600 dark:text-gray-300">
                      {item.descricao}
                    </p>

                    {item.tipo === "retorno-de-reparo" && (
                      <p className="mt-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                        {moeda(Number(item.custo) || 0)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>

      </div>
    </main>
  );
}