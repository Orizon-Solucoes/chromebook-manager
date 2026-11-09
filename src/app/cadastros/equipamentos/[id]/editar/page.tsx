"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useUnidade } from "@/components/UnidadeProvider";

const TIPOS = [
  { valor: "chromebook", nome: "Chromebook" },
  { valor: "notebook", nome: "Notebook" },
  { valor: "projetor", nome: "Projetor" },
  { valor: "catraca", nome: "Catraca" },
  { valor: "impressora", nome: "Impressora" },
  { valor: "access-point", nome: "Access Point" },
] as const;
type Tipo = (typeof TIPOS)[number]["valor"];
type Equipamento = {
  id: string; patrimonio: string; tipo: Tipo; fabricante: string; modelo: string;
  numeroSerie: string; localizacao: string; status: string; observacoes: string;
  detalhes: Record<string, unknown>;
};
type Registro = {
  id: string; tipo: string; categoria: string; data: string; descricao: string;
  observacao: string; quemRealizou: string; custo: number; destinoReparo: string; resultado: string;
};
const NOMES_REGISTROS: Record<string, string> = {
  ocorrencia: "Ocorrência", manutencao: "Manutenção", "reposicao-de-peca": "Reposição de peça",
  "envio-para-reparo": "Envio para reparo", "retorno-de-reparo": "Retorno do reparo",
};
function moeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function dataBR(valor: string) {
  const partes = (valor || "").slice(0, 10).split("-");
  return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : valor || "—";
}

const campo = "w-full rounded-xl border border-gray-300 bg-white px-3.5 py-3 text-sm text-gray-900 outline-none transition focus:border-gray-500 focus:ring-2 focus:ring-gray-500/15 dark:border-[#55555c] dark:bg-[#333338] dark:text-gray-100";
const rotulo = "mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300";

export default function EditarEquipamentoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const { unidadeAtiva } = useUnidade();
  const [historico, setHistorico] = useState<Registro[]>([]);
  const [equipamento, setEquipamento] = useState<Equipamento | null>(null);
  const [patrimonio, setPatrimonio] = useState("");
  const [tipo, setTipo] = useState<Tipo>("chromebook");
  const [fabricante, setFabricante] = useState("");
  const [modelo, setModelo] = useState("");
  const [numeroSerie, setNumeroSerie] = useState("");
  const [localizacao, setLocalizacao] = useState("");
  const [status, setStatus] = useState("disponivel");
  const [observacoes, setObservacoes] = useState("");
  const [detalhes, setDetalhes] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      try {
        const [resposta, respostaHistorico] = await Promise.all([
          fetch(`/api/equipamentos?unidade=${encodeURIComponent(unidadeAtiva)}`, { cache: "no-store", credentials: "same-origin" }),
          fetch("/api/historico-equipamentos?equipamentoId=" + encodeURIComponent(params.id), { cache: "no-store", credentials: "same-origin" }),
        ]);
        const [dados, dadosHistorico] = await Promise.all([
          resposta.json().catch(() => []),
          respostaHistorico.json().catch(() => []),
        ]);
        if (!resposta.ok) throw new Error(dados.erro || "Não foi possível carregar o equipamento.");
        if (!respostaHistorico.ok) throw new Error(dadosHistorico.erro || "Não foi possível carregar o histórico do equipamento.");
        const encontrado = (dados as Equipamento[]).find((item) => item.id === params.id);
        if (!encontrado) throw new Error("Equipamento não encontrado.");
        if (!ativo) return;
        setEquipamento(encontrado);
        setHistorico(Array.isArray(dadosHistorico) ? dadosHistorico : []);
        setPatrimonio(encontrado.patrimonio || "");
        setTipo(encontrado.tipo);
        setFabricante(encontrado.fabricante || "");
        setModelo(encontrado.modelo || "");
        setNumeroSerie(encontrado.numeroSerie || "");
        setLocalizacao(encontrado.localizacao || "");
        setStatus(encontrado.status || "disponivel");
        setObservacoes(encontrado.observacoes || "");
        setDetalhes(Object.fromEntries(Object.entries(encontrado.detalhes || {}).map(([k, v]) => [k, v == null ? "" : String(v)])));
      } catch (e) {
        if (ativo) setErro(e instanceof Error ? e.message : "Erro ao carregar equipamento.");
      } finally {
        if (ativo) setCarregando(false);
      }
    }
    void carregar();
    return () => { ativo = false; };
  }, [params.id, unidadeAtiva]);

  function voltar() {
    if (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
      router.push(returnTo);
    } else if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/equipamentos");
    }
  }

  function alterarTipo(novo: Tipo) {
    setTipo(novo);
  }

  function campoDetalhe(chave: string, nome: string, placeholder = "") {
    return <div key={chave}><label className={rotulo} htmlFor={chave}>{nome}</label><input id={chave} className={campo} value={detalhes[chave] ?? ""} placeholder={placeholder} onChange={(e) => setDetalhes((atual) => ({ ...atual, [chave]: e.target.value }))} /></div>;
  }

  async function salvar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (salvando) return;
    setSalvando(true); setErro("");
    try {
      const ehAP = tipo === "access-point";
      const endpoint = ehAP
        ? `/api/aps?unidade=${encodeURIComponent(unidadeAtiva)}`
        : `/api/equipamentos/${encodeURIComponent(params.id)}`;
      const corpo = ehAP
        ? {
            id: params.id,
            bloco: detalhes.bloco ?? "",
            rack: localizacao,
            marca: fabricante,
            modelo,
            macAddress: detalhes.macAddress ?? "",
            potenciaDbm: Number(detalhes.potenciaDbm),
            status,
            observacoes,
          }
        : { patrimonio, tipo, fabricante, modelo, numeroSerie, localizacao, status, observacoes, detalhes };
      const resposta = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(corpo),
      });
      const dados = await resposta.json().catch(() => ({}));
      if (!resposta.ok) throw new Error(dados.erro || "Não foi possível salvar as alterações.");
      if (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")) router.push(returnTo);
      else router.push(tipo === "impressora" ? "/impressoras" : "/equipamentos");
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar as alterações.");
    } finally {
      setSalvando(false);
    }
  }

  const tituloTipo = TIPOS.find((item) => item.valor === tipo)?.nome || "Equipamento";

  return <div className="min-h-screen bg-gray-100 p-5 sm:p-8 dark:bg-[#3a3a3f]"><div className="mx-auto max-w-5xl">
    <button type="button" onClick={voltar} className="mb-5 text-sm font-medium text-gray-600 hover:text-gray-950 dark:text-gray-300 dark:hover:text-white">← Voltar</button>
    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">Inventário</p>
    <h1 className="mt-2 text-3xl font-bold text-gray-950 dark:text-white">Editar {tituloTipo}</h1>
    <p className="mt-2 mb-8 text-gray-600 dark:text-gray-300">Altere os dados do equipamento e salve as mudanças.</p>
    {carregando ? <p className="rounded-2xl bg-white p-6 dark:bg-[#444449]">Carregando dados do equipamento...</p> : erro && !equipamento ? <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{erro}</div> : equipamento && <form onSubmit={salvar} className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7 dark:border-[#505057] dark:bg-[#444449]">
        <h2 className="text-lg font-semibold text-gray-950 dark:text-white">Identificação e localização</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {tipo !== "access-point" && <div><label className={rotulo} htmlFor="patrimonio">Patrimônio / identificação</label><input id="patrimonio" className={campo} value={patrimonio} onChange={(e) => setPatrimonio(e.target.value)} /><p className="mt-1.5 text-xs leading-5 text-gray-500 dark:text-gray-400">A identificação precisa ser única nesta unidade. Você pode alterá-la, desde que o novo valor não esteja em uso.</p></div>}
          {tipo !== "access-point" && <div><label className={rotulo} htmlFor="tipo">Tipo</label><select id="tipo" className={campo} value={tipo} onChange={(e) => alterarTipo(e.target.value as Tipo)}>{TIPOS.filter((item) => item.valor !== "access-point").map((item) => <option key={item.valor} value={item.valor}>{item.nome}</option>)}</select></div>}
          <div><label className={rotulo} htmlFor="fabricante">Fabricante</label><input id="fabricante" className={campo} value={fabricante} onChange={(e) => setFabricante(e.target.value)} /></div>
          <div><label className={rotulo} htmlFor="modelo">Modelo</label><input id="modelo" className={campo} value={modelo} onChange={(e) => setModelo(e.target.value)} /></div>
          {tipo !== "access-point" && <div><label className={rotulo} htmlFor="numeroSerie">Número de série</label><input id="numeroSerie" className={campo} value={numeroSerie} onChange={(e) => setNumeroSerie(e.target.value)} /></div>}
          <div><label className={rotulo} htmlFor="localizacao">{tipo === "access-point" ? "Rack / localização" : "Sala / setor / localização"}</label><input id="localizacao" className={campo} value={localizacao} onChange={(e) => setLocalizacao(e.target.value)} /></div>
          <div><label className={rotulo} htmlFor="status">Status</label><select id="status" className={campo} value={status} onChange={(e) => setStatus(e.target.value)}>{tipo === "access-point" ? <><option value="OK">OK</option><option value="Atenção">Atenção</option><option value="Em manutenção">Em manutenção</option><option value="Inativo">Inativo</option></> : <><option value="disponivel">Disponível</option><option value="em-uso">Em uso</option><option value="reserva">Reserva</option><option value="em-reparo">Em reparo</option><option value="inativo">Inativo</option><option value="para-descarte">Para descarte</option></>}</select></div>
        </div>
      </section>
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7 dark:border-[#505057] dark:bg-[#444449]">
        <h2 className="text-lg font-semibold text-gray-950 dark:text-white">Dados específicos — {tituloTipo}</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {tipo === "chromebook" && <>{campoDetalhe("numeroChromebook", "Número do Chromebook", "Ex.: 17")}{campoDetalhe("mac", "Endereço MAC", "AA:BB:CC:DD:EE:FF")}{campoDetalhe("saudeBateria", "Saúde da bateria (%)", "Ex.: 75")}</>}
          {tipo === "notebook" && <>{campoDetalhe("processador", "Processador", "Ex.: Intel Core i5")}{campoDetalhe("memoriaRam", "Memória RAM", "Ex.: 8 GB")}{campoDetalhe("armazenamento", "Armazenamento", "Ex.: SSD 256 GB")}{campoDetalhe("sistemaOperacional", "Sistema operacional", "Ex.: Windows 11")}{campoDetalhe("codigoModelo", "Código do modelo", "Ex.: 81S9, PU401LA")}{campoDetalhe("mac", "Endereço MAC", "AA-BB-CC-DD-EE-FF")}</>}
          {tipo === "projetor" && <>{campoDetalhe("tecnologia", "Tecnologia", "Ex.: DLP, LCD, LED")}{campoDetalhe("conexoes", "Conexões", "Ex.: HDMI, VGA, USB")}</>}
          {tipo === "catraca" && <>{campoDetalhe("tipoControle", "Tipo de controle", "Ex.: biometria, cartão, facial")}{campoDetalhe("fabricanteControladora", "Fabricante/controladora", "Fabricante do sistema de controle")}</>}
          {tipo === "impressora" && <>{campoDetalhe("tecnologiaImpressao", "Tecnologia de impressão", "Ex.: laser, jato de tinta")}{campoDetalhe("conexao", "Conexão / rede", "Ex.: 192.168.1.50 (CORPORATIVO), USB")}{campoDetalhe("enderecoIp", "Endereço IP", "Ex.: 192.168.1.50")}{campoDetalhe("mac", "Endereço MAC", "AA:BB:CC:DD:EE:FF")}{campoDetalhe("paginasImpressas", "Páginas impressas", "Ex.: 60399")}{campoDetalhe("dataInstalacao", "Data de instalação", "AAAA-MM-DD")}</>}
          {tipo === "access-point" && <>{campoDetalhe("bloco", "Bloco / setor", "Ex.: Bloco A")}{campoDetalhe("macAddress", "MAC Address", "AA:BB:CC:DD:EE:FF")}{campoDetalhe("potenciaDbm", "Potência (dBm)", "Ex.: 22")}</>}
        </div>
      </section>
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7 dark:border-[#505057] dark:bg-[#444449]"><label className={rotulo} htmlFor="observacoes">Observações</label><textarea id="observacoes" rows={4} className={campo} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} /></section>
      {erro && <div role="alert" className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{erro}</div>}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={voltar} className="rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-200 dark:border-[#5a5a61] dark:text-gray-200 dark:hover:bg-[#505057]">Cancelar</button><button type="submit" disabled={salvando} className="rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-60 dark:bg-white dark:text-gray-900">{salvando ? "Salvando..." : "Salvar alterações"}</button></div>
      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-[#505057] dark:bg-[#444449]">
        <div className="border-b border-gray-200 p-5 dark:border-[#55555c]">
          <h2 className="text-lg font-semibold text-gray-950 dark:text-white">Histórico e custos de manutenção</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Consulta dos registros vinculados a este equipamento.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-gray-100 p-4 dark:bg-[#333338]"><p className="text-sm text-gray-500 dark:text-gray-400">Registros</p><p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{historico.length}</p></div>
            <div className="rounded-xl bg-gray-100 p-4 dark:bg-[#333338]"><p className="text-sm text-gray-500 dark:text-gray-400">Reparos concluídos</p><p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{historico.filter((item) => item.tipo === "retorno-de-reparo").length}</p></div>
            <div className="rounded-xl bg-gray-100 p-4 dark:bg-[#333338]"><p className="text-sm text-gray-500 dark:text-gray-400">Total gasto em reparos</p><p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{moeda(historico.filter((item) => item.tipo === "retorno-de-reparo").reduce((total, item) => total + (Number(item.custo) || 0), 0))}</p></div>
          </div>
        </div>
        {historico.length === 0 ? <p className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">Nenhum registro de manutenção para este equipamento.</p> : <div className="divide-y divide-gray-200 dark:divide-gray-600">
          {historico.map((item) => <article key={item.id} className="p-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 dark:bg-[#333338] dark:text-gray-200">{NOMES_REGISTROS[item.tipo] || item.tipo}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{dataBR(item.data)}</span>
                  {item.categoria && <span className="text-xs text-gray-500 dark:text-gray-400">· {item.categoria}</span>}
                </div>
                <p className="mt-3 whitespace-pre-wrap font-semibold text-gray-900 dark:text-white">{item.descricao}</p>
                {item.observacao && <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">Observação: {item.observacao}</p>}
                {item.resultado && <p className="mt-2 text-sm text-gray-600 dark:text-gray-300"><strong>Resultado:</strong> {item.resultado}</p>}
                {item.destinoReparo && <p className="mt-2 text-sm text-gray-600 dark:text-gray-300"><strong>Assistência:</strong> {item.destinoReparo}</p>}
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Responsável: {item.quemRealizou || "Não informado"}</p>
              </div>
              <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                {item.tipo === "retorno-de-reparo" && <strong className="text-sm text-gray-900 dark:text-white">{moeda(Number(item.custo) || 0)}</strong>}
                <a href={`/historico/editar?id=${encodeURIComponent(item.id)}`} className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 dark:border-[#606066] dark:text-gray-100 dark:hover:bg-[#505057]">Editar registro</a>
              </div>
            </div>
          </article>)}
        </div>}
      </section>
    </form>}
  </div></div>;
}
