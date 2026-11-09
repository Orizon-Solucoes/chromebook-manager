"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useUnidade } from "@/components/UnidadeProvider";

export type TipoEquipamento =
  | "chromebook"
  | "notebook"
  | "projetor"
  | "catraca"
  | "impressora"
  | "access-point";

type Equipamento = {
  id: string;
  patrimonio: string;
  tipo: TipoEquipamento;
  fabricante: string;
  modelo: string;
  numeroSerie: string;
  localizacao: string;
  status: string;
  observacoes: string;
  detalhes: Record<string, unknown>;
};

const NOMES: Record<TipoEquipamento, string> = {
  chromebook: "Chromebook",
  notebook: "Notebook",
  projetor: "Projetor",
  catraca: "Catraca",
  impressora: "Impressora",
  "access-point": "Access Point",
};

const PLURAIS: Record<TipoEquipamento, string> = {
  chromebook: "Chromebooks",
  notebook: "Notebooks",
  projetor: "Projetores",
  catraca: "Catracas",
  impressora: "Impressoras",
  "access-point": "Access Points",
};

function numeroEquipamento(item: Equipamento): string {
  const identificador = item.patrimonio || item.id;
  const sufixo = identificador.slice(identificador.lastIndexOf("-") + 1);
  const numero = Number(sufixo);
  return sufixo && Number.isFinite(numero) ? String(numero) : identificador;
}

function mostrarNumeroNoNome(tipo: TipoEquipamento): boolean {
  return tipo === "notebook" || tipo === "projetor" || tipo === "impressora";
}

const STATUS: Record<string, string> = {
  disponivel: "Disponível",
  "em-uso": "Em uso",
  reserva: "Reserva",
  "em-reparo": "Em reparo",
  "para-descarte": "Para descarte",
};

function normalizarStatus(status: string): string {
  return status
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-");
}

function statusCanonico(status: string): string {
  const normalizado = normalizarStatus(status);

  if (normalizado === "disponivel") return "disponivel";
  if (["em-uso", "uso"].includes(normalizado)) return "em-uso";
  if (["reserva", "reservado", "reservada"].includes(normalizado)) return "reserva";
  if (["em-reparo", "reparo", "em-manutencao", "manutencao"].includes(normalizado)) {
    return "em-reparo";
  }
  if (["para-descarte", "retirada-de-pecas", "inativo"].includes(normalizado)) {
    return "para-descarte";
  }

  return normalizado;
}

function classeStatus(status: string): string {
  switch (statusCanonico(status)) {
    case "disponivel":
      return "status-badge status-badge--disponivel";
    case "em-uso":
      return "status-badge status-badge--em-uso";
    case "reserva":
      return "status-badge status-badge--reserva";
    case "em-reparo":
      return "status-badge status-badge--em-reparo";
    case "para-descarte":
    default:
      return "status-badge status-badge--para-descarte";
  }
}

function nomeStatus(status: string): string {
  const canonico = statusCanonico(status);
  return STATUS[canonico] || status;
}

const campo =
  "rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none dark:border-[#55555c] dark:bg-[#333338] dark:text-white";

export default function EquipamentosLista({
  tipoFiltro,
}: {
  tipoFiltro?: TipoEquipamento;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const retorno = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
  const urlEditar = (id: string) => `/cadastros/equipamentos/${encodeURIComponent(id)}/editar?returnTo=${encodeURIComponent(retorno)}`;
  const { unidadeAtiva, unidadeCarregada } = useUnidade();

  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("todos");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!unidadeCarregada) return;

    let ativo = true;

    async function carregar() {
      setCarregando(true);
      setErro("");
      setEquipamentos([]);

      try {
        const resposta = await fetch(
          `/api/equipamentos?unidade=${encodeURIComponent(unidadeAtiva)}`,
          {
            cache: "no-store",
            credentials: "same-origin",
          },
        );

        const dados = await resposta.json().catch(() => []);

        if (!resposta.ok) {
          throw new Error(
            dados.erro || "Não foi possível carregar os equipamentos.",
          );
        }

        if (ativo) {
          setEquipamentos(Array.isArray(dados) ? dados : []);
        }
      } catch (e) {
        if (ativo) {
          setErro(
            e instanceof Error
              ? e.message
              : "Erro ao carregar equipamentos.",
          );
        }
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    void carregar();

    return () => {
      ativo = false;
    };
  }, [unidadeAtiva, unidadeCarregada]);

  const lista = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");

    const filtrados = equipamentos.filter((item) => {
      const tipoOk = !tipoFiltro || item.tipo === tipoFiltro;

      const textoBusca = [
        item.id,
        item.patrimonio,
        item.fabricante,
        item.modelo,
        item.numeroSerie,
        item.localizacao,
        item.observacoes,
        String(item.detalhes?.numeroChromebook ?? ""),
        String(item.detalhes?.mac ?? ""),
        String(item.detalhes?.conexao ?? ""),
        String(item.detalhes?.enderecoIp ?? ""),
        String(item.detalhes?.paginasImpressas ?? ""),
        String(item.detalhes?.codigoModelo ?? ""),
        String(item.detalhes?.saudeBateria ?? ""),
        String(item.detalhes?.bloco ?? ""),
        String(item.detalhes?.rack ?? ""),
        String(item.detalhes?.macAddress ?? ""),
      ]
        .join(" ")
        .toLocaleLowerCase("pt-BR");

      return (
        tipoOk &&
        (!termo || textoBusca.includes(termo)) &&
        (statusFiltro === "todos" || statusCanonico(item.status) === statusFiltro)
      );
    });

    const ordemTipos: TipoEquipamento[] = [
      "chromebook",
      "notebook",
      "projetor",
      "catraca",
      "impressora",
      "access-point",
    ];

    const numeroChromebook = (item: Equipamento) => {
      const numero = String(
        item.detalhes?.numeroChromebook ??
          item.patrimonio.replace("CHROME-", ""),
      );

      const valor = Number.parseInt(numero, 10);

      return Number.isFinite(valor) ? valor : Number.MAX_SAFE_INTEGER;
    };

    return filtrados.sort((a, b) => {
      if (a.tipo === "chromebook" && b.tipo === "chromebook") {
        return numeroChromebook(a) - numeroChromebook(b);
      }

      return ordemTipos.indexOf(a.tipo) - ordemTipos.indexOf(b.tipo);
    });
  }, [equipamentos, tipoFiltro, busca, statusFiltro]);

  async function excluirEquipamento(item: Equipamento) {
    const identificacao =
      [item.patrimonio, item.fabricante, item.modelo]
        .filter(Boolean)
        .join(" — ") || item.id;

    if (
      !window.confirm(
        `Tem certeza que deseja excluir ${identificacao}? Essa ação não pode ser desfeita.`,
      )
    ) {
      return;
    }

    try {
      const resposta = await fetch(
        `/api/equipamentos/${encodeURIComponent(item.id)}`,
        {
          method: "DELETE",
          credentials: "same-origin",
        },
      );

      const dados = await resposta.json().catch(() => ({}));

      if (!resposta.ok) {
        throw new Error(
          dados.erro || "Não foi possível excluir o equipamento.",
        );
      }

      setEquipamentos((atuais) =>
        atuais.filter((equipamento) => equipamento.id !== item.id),
      );
    } catch (e) {
      window.alert(
        e instanceof Error ? e.message : "Erro ao excluir equipamento.",
      );
    }
  }

  const equipamentosDaTela = equipamentos.filter(
    (item) => !tipoFiltro || item.tipo === tipoFiltro,
  );
  const equipamentosOk = equipamentosDaTela.filter((item) =>
    ["disponivel", "em-uso", "reserva"].includes(statusCanonico(item.status)),
  ).length;
  const precisamAtencao = equipamentosDaTela.filter((item) =>
    ["em-reparo", "para-descarte"].includes(statusCanonico(item.status)),
  ).length;

  const titulo = tipoFiltro ? PLURAIS[tipoFiltro] : "Todos os equipamentos";
  const th = "whitespace-nowrap px-3 py-3 font-semibold";
  const td = "px-3 py-3 align-middle text-gray-700 dark:text-gray-300";

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-7 xl:p-9 dark:bg-[#3a3a3f]">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-300">
              Inventário · {unidadeAtiva}
            </p>

            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
              {titulo}
            </h1>

            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Consulte, pesquise e edite os equipamentos em um só lugar.
            </p>
          </div>

          <Link
            href="/cadastros/equipamentos/novo"
            className="rounded-xl bg-gray-900 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-gray-700 dark:bg-white dark:text-gray-900"
          >
            + Cadastrar equipamento
          </Link>
        </div>

        <section
          aria-label="Resumo dos equipamentos"
          className="mb-4 grid gap-3 sm:grid-cols-3"
        >
          {[
            {
              titulo: "Equipamentos cadastrados",
              valor: equipamentosDaTela.length,
              descricao: "Total registrado nesta unidade",
            },
            {
              titulo: "Status OK",
              valor: equipamentosOk,
              descricao: "Disponíveis, em uso ou reserva",
            },
            {
              titulo: "Precisam de atenção",
              valor: precisamAtencao,
              descricao: "Em reparo ou destinados à baixa",
            },
          ].map((card) => (
            <article
              key={card.titulo}
              className="rounded-xl border border-teal-100 bg-white p-5 shadow-sm dark:border-[#2b454c] dark:bg-[#1c2a33]"
            >
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {card.titulo}
              </p>
              <p className="mt-3 text-3xl font-semibold text-gray-900 dark:text-gray-100">
                {carregando ? "—" : card.valor}
              </p>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {card.descricao}
              </p>
            </article>
          ))}
        </section>

        <div className="mb-4 grid gap-3 rounded-2xl border border-teal-100 bg-white p-4 shadow-sm sm:grid-cols-[1fr_200px] dark:border-[#2b454c] dark:bg-[#1c2a33]">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar número, MAC, modelo, série ou localização..."
            className={campo}
          />

          <select
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value)}
            className={campo}
          >
            <option value="todos">Todos os status</option>
            {["disponivel", "em-uso", "reserva", "para-descarte"].map((valor) => (
              <option key={valor} value={valor}>
                {STATUS[valor]}
              </option>
            ))}
          </select>
        </div>

        {erro && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
          >
            {erro}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-teal-100 bg-white shadow-sm dark:border-[#2b454c] dark:bg-[#1c2a33]">
          {carregando ? (
            <p className="p-8 text-sm text-gray-500 dark:text-gray-300">
              Carregando equipamentos da unidade {unidadeAtiva}...
            </p>
          ) : lista.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-semibold text-gray-900 dark:text-white">
                Nenhum equipamento encontrado
              </p>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Cadastre um equipamento ou ajuste os filtros.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3 p-3 md:hidden">
              {lista.map((item) => (
                <article
                  key={item.id}
                  className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-[#55555c] dark:bg-[#252b30]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        {NOMES[item.tipo]}
                      </p>
                      <h2 className="mt-1 break-words font-bold text-gray-900 dark:text-white">
                        {item.tipo === "access-point"
                          ? `Access Point${item.detalhes?.bloco ? ` — ${String(item.detalhes.bloco)}` : ""}`
                          : item.tipo === "chromebook"
                          ? `Chromebook nº ${String(
                              item.detalhes?.numeroChromebook ??
                                item.patrimonio.replace("CHROME-", ""),
                            )}`
                          : mostrarNumeroNoNome(item.tipo)
                            ? `${NOMES[item.tipo]} - ${numeroEquipamento(item)}`
                            : item.patrimonio || item.id}
                      </h2>
                      <p className="mt-1 break-words text-sm text-gray-600 dark:text-gray-300">
                        {item.tipo === "chromebook"
                          ? (item.modelo && item.modelo !== item.localizacao
                              ? item.modelo
                              : String(item.detalhes?.codigoModelo ?? "")) ||
                            "Modelo não informado"
                          : [item.fabricante, item.modelo].filter(Boolean).join(" ") ||
                            "Modelo não informado"}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${classeStatus(item.status)}`}
                    >
                      {nomeStatus(item.status)}
                    </span>
                  </div>

                  <dl className="mt-4 grid grid-cols-1 gap-3 border-t border-gray-200 pt-3 text-sm dark:border-gray-600">
                    {item.tipo === "chromebook" && (
                      <div className="min-w-0">
                        <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          MAC
                        </dt>
                        <dd className="mt-1 break-all font-mono text-xs text-gray-800 dark:text-gray-200">
                          {String(item.detalhes?.mac ?? "—")}
                        </dd>
                      </div>
                    )}
                    {item.tipo === "chromebook" &&
                      item.detalhes?.saudeBateria != null &&
                      item.detalhes?.saudeBateria !== "" && (
                        <div>
                          <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            Saúde da bateria
                          </dt>
                          <dd className="mt-1 text-gray-800 dark:text-gray-200">
                            {String(item.detalhes.saudeBateria)}%
                          </dd>
                        </div>
                      )}
                    {item.tipo !== "chromebook" && (
                      <div className="min-w-0">
                        <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          {mostrarNumeroNoNome(item.tipo) ? "Modelo" : "Fabricante / modelo"}
                        </dt>
                        <dd className="mt-1 break-words text-gray-800 dark:text-gray-200">
                          {[item.fabricante, item.modelo].filter(Boolean).join(" ") ||
                            "—"}
                        </dd>
                      </div>
                    )}
                    {item.tipo === "projetor" && (
                      <div>
                        <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          Potência
                        </dt>
                        <dd className="mt-1 text-gray-800 dark:text-gray-200">
                          {String(item.detalhes?.potencia ?? "—")}
                          {item.detalhes?.potenciaFicticia === true
                            ? " (fictícia)"
                            : ""}
                        </dd>
                      </div>
                    )}
                    <div className="min-w-0">
                      <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Localização
                      </dt>
                      <dd className="mt-1 break-words text-gray-800 dark:text-gray-200">
                        {item.localizacao || "—"}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-4 grid grid-cols-1 gap-2 border-t border-gray-200 pt-3 dark:border-gray-600">
                    <Link
                      href={urlEditar(item.id)}
                      className="inline-flex min-h-10 items-center justify-center rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-700"
                    >
                      Abrir / editar equipamento
                    </Link>
                    <button
                      type="button"
                      onClick={() => void excluirEquipamento(item)}
                      disabled={carregando}
                      className="col-span-2 inline-flex min-h-10 items-center justify-center rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
                    >
                      Excluir equipamento
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-teal-100 bg-teal-50/80 text-[10px] uppercase tracking-[.13em] text-teal-900/70 dark:border-[#2b454c] dark:bg-[#20363e] dark:text-teal-100/70">
                  <tr>
                    {tipoFiltro === "chromebook" ? (
                      <>
                        <th className={th}>Chromebook</th>
                        <th className={th}>MAC</th>
                        <th className={th}>Saúde da bateria</th>
                        <th className={th}>Localização</th>
                      </>
                    ) : (
                      <>
                        <th className={th}>Equipamento</th>
                        <th className={th}>
                          {tipoFiltro && mostrarNumeroNoNome(tipoFiltro) ? "Modelo" : "MAC"}
                        </th>
                        <th className={th}>Localização</th>
                        {tipoFiltro === "projetor" && (
                          <th className={th}>Potência</th>
                        )}
                      </>
                    )}

                    <th className={th}>Status</th>
                    <th className={`${th} text-right`}>Ações</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 dark:divide-[#55555c]">
                  {lista.map((item) => (
                    <tr
                      key={item.id}
                      role="link"
                      tabIndex={0}
                      aria-label={`Editar ${NOMES[item.tipo]} ${item.patrimonio || item.id}`}
                      onClick={() =>
                        router.push(urlEditar(item.id))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          router.push(urlEditar(item.id));
                        }
                      }}
                      className="cursor-pointer hover:bg-teal-50/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-gray-500 dark:hover:bg-[#20363e]"
                    >
                      {tipoFiltro === "chromebook" ? (
                        <>
                          <td className={td}>
                            <p className="font-semibold text-gray-900 dark:text-gray-100">
                              Nº{" "}
                              {String(
                                item.detalhes?.numeroChromebook ??
                                  item.patrimonio.replace("CHROME-", ""),
                              )}
                            </p>

                            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                              {(item.modelo && item.modelo !== item.localizacao
                                ? item.modelo
                                : String(item.detalhes?.codigoModelo ?? "")) ||
                                "Modelo não informado"}
                            </p>
                          </td>

                          <td className={`${td} whitespace-nowrap font-mono text-xs`}>
                            {String(item.detalhes?.mac ?? "—")}
                          </td>

                          <td className={`${td} whitespace-nowrap`}>
                            {item.detalhes?.saudeBateria == null ||
                            item.detalhes?.saudeBateria === ""
                              ? "—"
                              : `${String(item.detalhes.saudeBateria)}%`}
                          </td>

                          <td className={td}>{item.localizacao || "—"}</td>
                        </>
                      ) : (
                        <>
                          <td className={td}>
                            <p className="font-semibold text-gray-900 dark:text-gray-100">
                              {item.tipo === "access-point"
                                ? `Access Point${item.detalhes?.bloco ? ` — ${String(item.detalhes.bloco)}` : ""}`
                                : item.tipo === "chromebook"
                                ? `Chromebook Nº ${String(
                                    item.detalhes?.numeroChromebook ??
                                      item.patrimonio.replace("CHROME-", ""),
                                  )}`
                                : mostrarNumeroNoNome(item.tipo)
                                  ? `${NOMES[item.tipo]} - ${numeroEquipamento(item)}`
                                  : NOMES[item.tipo]}
                            </p>

                            {item.tipo === "chromebook" && (
                              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                                {(item.modelo &&
                                  item.modelo !== item.localizacao
                                  ? item.modelo
                                  : String(item.detalhes?.codigoModelo ?? "")) ||
                                  "Modelo não informado"}
                              </p>
                            )}
                          </td>

                          <td className={td}>
                            {item.tipo === "chromebook"
                              ? String(item.detalhes?.mac ?? "—")
                              : [item.fabricante, item.modelo]
                                  .filter(Boolean)
                                  .join(" ") || "—"}
                          </td>

                          <td className={td}>{item.localizacao || "—"}</td>

                          {tipoFiltro === "projetor" && (
                            <td className={`${td} whitespace-nowrap`}>
                              {String(item.detalhes?.potencia ?? "—")}
                              {item.detalhes?.potenciaFicticia === true ? (
                                <span className="ml-1 text-xs text-amber-700 dark:text-amber-300">
                                  (fictícia)
                                </span>
                              ) : null}
                            </td>
                          )}
                        </>
                      )}

                      <td className={td}>
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${classeStatus(item.status)}`}
                        >
                          {nomeStatus(item.status)}
                        </span>
                      </td>

                      <td className={td}>
                        <div className="flex justify-end gap-1.5">
                          <Link
                            href={urlEditar(item.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 dark:border-[#606066] dark:text-gray-100 dark:hover:bg-[#505057]"
                          >
                            Abrir / editar
                          </Link>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void excluirEquipamento(item);
                            }}
                            disabled={carregando}
                            className="inline-flex items-center rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>

        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          Exibindo {lista.length} equipamento(s) da unidade {unidadeAtiva}.
          Clique em uma linha para ver os detalhes e o histórico de manutenção.
        </p>
      </div>
    </div>
  );
}