
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useUnidade } from "@/components/UnidadeProvider";

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
  categoria: string;
  data: string;
  descricao: string;
  observacao: string;
  quemRealizou: string;
  custo: number;
  destinoReparo: string;
  resultado: string;
  statusFinal: string;
  anexos: { id: number; nome: string; tipo: string; tamanho: number }[];
};

const TIPOS: Record<string, string> = {
  manutencao: "Manutenção interna",
  "reposicao-de-peca": "Reposição de peça",
  "envio-para-reparo": "Envio para reparo",
  "retorno-de-reparo": "Reparo concluído",
};

const STATUS: Record<string, string> = {
  "em-uso": "Em uso",
  disponivel: "Disponível",
  "em-reparo": "Em reparo",
  inativo: "Inativo",
  "para-descarte": "Para descarte",
};

const campo =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-500 dark:border-[#55555c] dark:bg-[#333338] dark:text-white";

const servicos = new Set([
  "manutencao",
  "reposicao-de-peca",
  "envio-para-reparo",
  "retorno-de-reparo",
]);

export default function HistoricoPage() {
  const { unidadeAtiva, unidadeCarregada } = useUnidade();

  const [registros, setRegistros] = useState<Registro[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!unidadeCarregada) return;

    let ativo = true;

    async function carregarHistorico() {
      setCarregando(true);
      setErro("");
      setRegistros([]);

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
            dados.erro || "Não foi possível carregar o histórico.",
          );
        }

        if (ativo) {
          setRegistros(Array.isArray(dados) ? dados : []);
        }
      } catch (e: unknown) {
        if (ativo) {
          setErro(
            e instanceof Error
              ? e.message
              : "Erro ao carregar histórico.",
          );
        }
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    carregarHistorico();

    return () => {
      ativo = false;
    };
  }, [unidadeAtiva, unidadeCarregada]);

  const lista = useMemo(
    () =>
      registros.filter((item) => {
        const equipamento = item.equipamento;

        const texto = [
          equipamento?.patrimonio,
          equipamento?.tipo,
          equipamento?.fabricante,
          equipamento?.modelo,
          equipamento?.localizacao,
          item.descricao,
          item.destinoReparo,
          item.quemRealizou,
          item.observacao,
          item.resultado,
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("pt-BR");

        return (
          (filtroTipo === "todos" || item.tipo === filtroTipo) &&
          (!busca.trim() ||
            texto.includes(busca.trim().toLocaleLowerCase("pt-BR")))
        );
      }),
    [registros, busca, filtroTipo],
  );

  const totalServicos = registros.filter((item) =>
    servicos.has(item.tipo),
  ).length;

  const totalManutencoes = registros.filter(
    (item) =>
      item.tipo === "manutencao" ||
      item.tipo === "reposicao-de-peca",
  ).length;

  const totalEnviosReparo = registros.filter(
    (item) => item.tipo === "envio-para-reparo",
  ).length;

  const totalReparosConcluidos = registros.filter(
    (item) => item.tipo === "retorno-de-reparo",
  ).length;

  function moeda(valor: number) {
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function dataFormatada(valor: string) {
    if (!valor) return "—";

    const partes = valor.slice(0, 10).split("-");

    return partes.length === 3
      ? `${partes[2]}/${partes[1]}/${partes[0]}`
      : valor;
  }

  function corTipo(tipo: string) {
    if (tipo === "retorno-de-reparo") {
      return "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200";
    }

    if (tipo === "envio-para-reparo") {
      return "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200";
    }

    if (tipo === "manutencao" || tipo === "reposicao-de-peca") {
      return "border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200";
    }

    return "border-gray-300 bg-gray-100 text-gray-700 dark:border-gray-600 dark:bg-[#333338] dark:text-gray-200";
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 sm:p-7 xl:p-9 dark:bg-[#2b2b2b]">
      <div className="mx-auto max-w-[1500px]">
        <header className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-[#4c4c52] dark:bg-[#303035]">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-gray-700 via-gray-500 to-gray-300 dark:from-gray-200 dark:via-gray-500 dark:to-gray-700" />
          <div className="p-5 sm:p-7 xl:p-8">
            <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[.12em] text-gray-600 dark:border-[#505057] dark:bg-[#38383f] dark:text-gray-300">
                  <span aria-hidden="true" className="h-2 w-2 rounded-full bg-emerald-500" />
                  Central de serviços
                  <span className="text-gray-400">/</span>
                  {unidadeCarregada ? unidadeAtiva : "Carregando unidade"}
                </div>

                <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-950 dark:text-white sm:text-4xl">
                  Histórico de serviços
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300 sm:text-base">
                  Acompanhe manutenções, trocas de peças, envios para assistência e reparos concluídos em um só lugar.
                </p>
              </div>

              <Link
                href="/cadastros"
                className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200 dark:focus-visible:ring-offset-[#303035]"
              >
                <span aria-hidden="true" className="text-lg leading-none">+</span>
                Registrar serviço
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 p-4 transition hover:border-gray-300 hover:shadow-sm dark:border-[#505057] dark:bg-[#38383f] dark:hover:border-[#6a6a72] sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total de serviços</p>
                    <p className="mt-3 text-3xl font-bold tracking-tight text-gray-950 dark:text-white sm:text-4xl">
                      {carregando ? "—" : totalServicos}
                    </p>
                  </div>
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-200 text-lg text-gray-800 dark:bg-[#4a4a52] dark:text-gray-100" aria-hidden="true">▤</span>
                </div>
                <p className="mt-3 text-xs leading-5 text-gray-500 dark:text-gray-400">Todos os registros de manutenção e reparo</p>
                <div className="absolute inset-x-0 bottom-0 h-1 bg-gray-800 dark:bg-gray-200" />
              </div>

              <div className="group relative overflow-hidden rounded-2xl border border-sky-200 bg-sky-50/70 p-4 transition hover:border-sky-300 hover:shadow-sm dark:border-sky-900/70 dark:bg-sky-950/20 dark:hover:border-sky-800 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-sky-900 dark:text-sky-200">Manutenções e peças</p>
                    <p className="mt-3 text-3xl font-bold tracking-tight text-sky-950 dark:text-white sm:text-4xl">
                      {carregando ? "—" : totalManutencoes}
                    </p>
                  </div>
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-lg text-sky-800 dark:bg-sky-900/50 dark:text-sky-200" aria-hidden="true">⚙</span>
                </div>
                <p className="mt-3 text-xs leading-5 text-sky-800/80 dark:text-sky-200/80">Serviços internos e reposições</p>
                <div className="absolute inset-x-0 bottom-0 h-1 bg-sky-500" />
              </div>

              <div className="group relative overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/70 p-4 transition hover:border-amber-300 hover:shadow-sm dark:border-amber-900/70 dark:bg-amber-950/20 dark:hover:border-amber-800 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-amber-900 dark:text-amber-200">Envios para reparo</p>
                    <p className="mt-3 text-3xl font-bold tracking-tight text-amber-950 dark:text-white sm:text-4xl">
                      {carregando ? "—" : totalEnviosReparo}
                    </p>
                  </div>
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-lg text-amber-800 dark:bg-amber-900/50 dark:text-amber-200" aria-hidden="true">↗</span>
                </div>
                <p className="mt-3 text-xs leading-5 text-amber-800/80 dark:text-amber-200/80">Equipamentos encaminhados à assistência</p>
                <div className="absolute inset-x-0 bottom-0 h-1 bg-amber-500" />
              </div>

              <div className="group relative overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 transition hover:border-emerald-300 hover:shadow-sm dark:border-emerald-900/70 dark:bg-emerald-950/20 dark:hover:border-emerald-800 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">Reparos concluídos</p>
                    <p className="mt-3 text-3xl font-bold tracking-tight text-emerald-950 dark:text-white sm:text-4xl">
                      {carregando ? "—" : totalReparosConcluidos}
                    </p>
                  </div>
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-lg text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200" aria-hidden="true">✓</span>
                </div>
                <p className="mt-3 text-xs leading-5 text-emerald-800/80 dark:text-emerald-200/80">Retornos registrados após o reparo</p>
                <div className="absolute inset-x-0 bottom-0 h-1 bg-emerald-500" />
              </div>
            </div>
          </div>
        </header>

        <section className="mt-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-[#4c4c52] dark:bg-[#303035] sm:p-5">
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Localizar registros</h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Pesquise por equipamento ou filtre pelo tipo de serviço.</p>
            </div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{lista.length} resultado(s)</p>
          </div>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
            <label className="relative block">
              <span className="sr-only">Buscar no histórico</span>
              <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-gray-400">⌕</span>
              <input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar patrimônio, equipamento, assistência, responsável ou descrição..."
                aria-label="Buscar no histórico de serviços"
                className={campo + " pl-11"}
              />
            </label>
            <label className="block">
              <span className="sr-only">Filtrar por tipo de serviço</span>
              <select
                value={filtroTipo}
                onChange={(event) => setFiltroTipo(event.target.value)}
                aria-label="Filtrar por tipo de serviço"
                className={campo}
              >
                <option value="todos">Todos os registros</option>
                {Object.entries(TIPOS).map(([valor, nome]) => (
                  <option key={valor} value={valor}>
                    {nome}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        {erro && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
          >
            {erro}
          </div>
        )}

        {!unidadeCarregada || carregando ? (
          <div className="mt-5 rounded-2xl border border-gray-300 bg-white p-8 text-sm text-gray-500 dark:border-gray-600 dark:bg-[#383838] dark:text-gray-300">
            Carregando histórico de serviços...
          </div>
        ) : lista.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-[#383838]">
            <p className="font-semibold text-gray-900 dark:text-white">
              Nenhum serviço encontrado
            </p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Não foram encontrados registros para os filtros selecionados na
              unidade {unidadeAtiva}.
            </p>
            <Link
              href="/cadastros"
              className="mt-5 inline-flex rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white dark:bg-white dark:text-gray-900"
            >
              Registrar primeiro serviço
            </Link>
          </div>
        ) : (
          <section className="mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-[#4c4c52] dark:bg-[#303035]">
            <div className="flex flex-col gap-2 border-b border-gray-200 bg-gray-50/80 px-5 py-4 dark:border-[#4c4c52] dark:bg-[#35353b] sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  Registros de serviço · {unidadeAtiva}
                </h2>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Ordenados pelos eventos mais recentes.
                </p>
              </div>

              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                {lista.length} registro(s)
              </p>
            </div>

            <div className="divide-y divide-gray-200 dark:divide-gray-600">
              {lista.map((item) => (
                <article
                  key={item.id}
                  className="p-5 transition-colors hover:bg-gray-50/80 dark:hover:bg-[#38383f] sm:p-6"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${corTipo(item.tipo)}`}
                        >
                          {TIPOS[item.tipo] || item.tipo}
                        </span>

                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          {dataFormatada(item.data)}
                        </span>

                        {item.categoria && (
                          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600 dark:bg-[#333338] dark:text-gray-300">
                            {item.categoria.replaceAll("-", " ")}
                          </span>
                        )}
                      </div>

                      <h3 className="mt-3 text-lg font-semibold text-gray-950 dark:text-white">
                        {item.equipamento?.patrimonio || item.equipamento?.tipo}
                        {" · "}
                        {[
                          item.equipamento?.fabricante,
                          item.equipamento?.modelo,
                        ]
                          .filter(Boolean)
                          .join(" ") || "Modelo não informado"}
                      </h3>

                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {item.equipamento?.localizacao ||
                          "Localização não informada"}
                        {" · "}
                        {TIPOS[item.equipamento?.tipo] ||
                          item.equipamento?.tipo}
                      </p>
                    </div>

                    {item.tipo === "retorno-de-reparo" && (
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {moeda(Number(item.custo) || 0)}
                      </p>
                    )}
                  </div>

                  <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-gray-700 dark:text-gray-200">
                    {item.descricao}
                  </p>

                  <div className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                    {item.destinoReparo && (
                      <p className="text-gray-600 dark:text-gray-300">
                        <strong>Assistência / destino:</strong>{" "}
                        {item.destinoReparo}
                      </p>
                    )}

                    {item.quemRealizou && (
                      <p className="text-gray-600 dark:text-gray-300">
                        <strong>Responsável:</strong> {item.quemRealizou}
                      </p>
                    )}

                    {item.resultado && (
                      <p className="text-gray-600 dark:text-gray-300 sm:col-span-2">
                        <strong>Resultado:</strong> {item.resultado}
                      </p>
                    )}

                    {item.statusFinal && (
                      <p className="text-gray-600 dark:text-gray-300">
                        <strong>Status após retorno:</strong>{" "}
                        {STATUS[item.statusFinal] || item.statusFinal}
                      </p>
                    )}

                    {item.observacao && (
                      <p className="whitespace-pre-wrap text-gray-500 dark:text-gray-400 sm:col-span-2">
                        <strong>Observações:</strong> {item.observacao}
                      </p>
                    )}
                  </div>

                  {item.anexos?.length > 0 && (
                    <div className="mt-4 border-t border-gray-200 pt-3 dark:border-gray-600">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Anexos
                      </p>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {item.anexos.map((anexo) => (
                          <a
                            key={anexo.id}
                            href={`/api/historico-equipamentos/anexos/${anexo.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-[#5a5a61] dark:text-gray-200 dark:hover:bg-[#333338]"
                          >
                            <span aria-hidden="true">↗</span>
                            {anexo.nome}
                            <span className="text-xs text-gray-400">
                              (
                              {(
                                anexo.tamanho /
                                1024 /
                                1024
                              ).toLocaleString("pt-BR", {
                                maximumFractionDigits: 1,
                              })}{" "}
                              MB)
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex justify-end border-t border-gray-200 pt-3 dark:border-gray-600">
                    <Link
                      href={`/historico/editar?id=${encodeURIComponent(item.id)}`}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-[#606066] dark:text-gray-100 dark:hover:bg-[#505057]"
                    >
                      Editar registro
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          Exibindo {lista.length} de {registros.length} registro(s) do histórico
          da unidade {unidadeCarregada ? unidadeAtiva : "—"}.
        </p>
      </div>
    </main>
  );
}
