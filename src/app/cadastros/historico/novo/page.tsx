"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useUnidade } from "@/components/UnidadeProvider";

type Equipamento = { id: string; patrimonio: string; tipo: string; fabricante: string; modelo: string; localizacao: string; status: string };
type EventoReparo = { equipamentoId: string; tipo: string; data: string; criadoEm?: string };
type TipoRegistro = "manutencao" | "reposicao-de-peca" | "envio-para-reparo" | "retorno-de-reparo";
type Anexo = { nome: string; tipo: string; tamanho: number; dados: string };

const TIPOS: { valor: TipoRegistro; nome: string }[] = [
  { valor: "manutencao", nome: "Manutenção interna" },
  { valor: "reposicao-de-peca", nome: "Reposição de peça" },
  { valor: "envio-para-reparo", nome: "Envio para reparo externo" },
  { valor: "retorno-de-reparo", nome: "Retorno do reparo" },
];
const CATEGORIAS = ["tela", "teclado", "bateria", "carregador", "touchpad", "sistema-operacional", "wifi", "bluetooth", "audio", "camera", "carcaca", "dobradica", "usb", "outro"];
const STATUS = [{ valor: "em-uso", nome: "Em uso" }, { valor: "disponivel", nome: "Disponível" }, { valor: "inativo", nome: "Inativo" }, { valor: "para-descarte", nome: "Para descarte" }];
const campo = "w-full rounded-xl border border-gray-300 bg-white px-3.5 py-3 text-sm text-gray-900 outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-500/15 dark:border-[#55555c] dark:bg-[#333338] dark:text-gray-100";
const rotulo = "mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300";

function lerArquivo(arquivo: File): Promise<Anexo> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => {
      if (typeof leitor.result !== "string") return reject(new Error("Não foi possível ler o arquivo."));
      resolve({ nome: arquivo.name, tipo: arquivo.type || "application/octet-stream", tamanho: arquivo.size, dados: leitor.result });
    };
    leitor.onerror = () => reject(new Error("Falha ao ler o arquivo " + arquivo.name));
    leitor.readAsDataURL(arquivo);
  });
}

export default function NovoHistoricoPage() {
  const router = useRouter();
  const { unidadeAtiva, unidadeCarregada } = useUnidade();
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [eventosReparo, setEventosReparo] = useState<EventoReparo[]>([]);
  const [equipamentoId, setEquipamentoId] = useState("");
  const [tipo, setTipo] = useState<TipoRegistro>("manutencao");
  const [categoria, setCategoria] = useState("outro");
  const [data, setData] = useState("");
  const [descricao, setDescricao] = useState("");
  const [observacao, setObservacao] = useState("");
  const [quemRealizou, setQuemRealizou] = useState("");
  const [destinoReparo, setDestinoReparo] = useState("");
  const [resultado, setResultado] = useState("");
  const [statusFinal, setStatusFinal] = useState("em-uso");
  const [custo, setCusto] = useState("");
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!unidadeCarregada) return;

    // Evita exibir temporariamente equipamentos da unidade anterior ao alternar o colégio.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCarregando(true);
    setEquipamentos([]);
    setEventosReparo([]);
    setEquipamentoId("");

    const parametros = new URLSearchParams(window.location.search);
    const tipoUrl = parametros.get("tipo");
    const equipamentoIdUrl = parametros.get("equipamentoId");
    if (TIPOS.some((item) => item.valor === tipoUrl)) setTipo(tipoUrl as TipoRegistro);
    const hoje = new Date();
    setData(hoje.getFullYear() + "-" + String(hoje.getMonth() + 1).padStart(2, "0") + "-" + String(hoje.getDate()).padStart(2, "0"));
    let ativo = true;
    Promise.all([
      fetch(`/api/equipamentos?unidade=${encodeURIComponent(unidadeAtiva)}`, { cache: "no-store", credentials: "same-origin" }),
      fetch(`/api/historico-equipamentos?unidade=${encodeURIComponent(unidadeAtiva)}`, { cache: "no-store", credentials: "same-origin" }),
    ])
      .then(async ([respostaEquipamentos, respostaHistorico]) => {
        const [dadosEquipamentos, dadosHistorico] = await Promise.all([
          respostaEquipamentos.json().catch(() => []),
          respostaHistorico.json().catch(() => []),
        ]);
        if (!respostaEquipamentos.ok) throw new Error(dadosEquipamentos.erro || "Não foi possível carregar os equipamentos.");
        if (!respostaHistorico.ok) throw new Error(dadosHistorico.erro || "Não foi possível verificar os envios para reparo.");
        if (ativo) {
          const lista = Array.isArray(dadosEquipamentos) ? dadosEquipamentos as Equipamento[] : [];
          const eventos = (Array.isArray(dadosHistorico) ? dadosHistorico as EventoReparo[] : [])
            .filter((item) => item.tipo === "envio-para-reparo" || item.tipo === "retorno-de-reparo")
            .sort((a, b) => (b.criadoEm || b.data).localeCompare(a.criadoEm || a.data));
          setEquipamentos(lista);
          setEventosReparo(eventos);
          setEquipamentoId(
            equipamentoIdUrl && lista.some((item) => item.id === equipamentoIdUrl)
              ? equipamentoIdUrl
              : lista[0]?.id || "",
          );
        }
      })
      .catch((e: unknown) => { if (ativo) setErro(e instanceof Error ? e.message : "Erro ao carregar equipamentos."); })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [unidadeAtiva, unidadeCarregada]);

  const nomeTipo = TIPOS.find((item) => item.valor === tipo)?.nome ?? "Registro";
  const equipamentosDisponiveis = useMemo(
    () =>
      tipo === "retorno-de-reparo"
        ? equipamentos.filter(
            (item) =>
              item.status === "em-reparo" &&
              eventosReparo.find((evento) => evento.equipamentoId === item.id)?.tipo === "envio-para-reparo",
          )
        : equipamentos,
    [tipo, equipamentos, eventosReparo],
  );
  const equipamentoSelecionadoId = equipamentosDisponiveis.some(
    (item) => item.id === equipamentoId,
  )
    ? equipamentoId
    : equipamentosDisponiveis[0]?.id || "";

  function nomeEquipamento(item: Equipamento) {
    const numero = item.patrimonio?.match(/(\d+)$/)?.[1];
    const nome = item.tipo ? item.tipo.charAt(0).toUpperCase() + item.tipo.slice(1) : "Equipamento";
    return [numero ? `${nome} ${numero}` : (item.patrimonio || nome), item.fabricante, item.modelo, item.localizacao].filter(Boolean).join(" - ");
  }

  async function salvar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (salvando) return;
    setErro("");
    if (!equipamentoSelecionadoId) { setErro(tipo === "retorno-de-reparo" ? "Não há equipamento aguardando retorno de reparo. Registre primeiro o envio para a assistência." : "Cadastre um equipamento antes de criar o histórico."); return; }
    if (tipo === "envio-para-reparo" && !destinoReparo.trim()) { setErro("Informe a assistência técnica ou empresa de reparo."); return; }
    if (tipo === "retorno-de-reparo" && custo.trim() === "") { setErro("Informe o custo final do reparo. Se não houve cobrança, informe 0."); return; }
    if (custo.trim() !== "" && ["manutencao", "reposicao-de-peca", "retorno-de-reparo"].includes(tipo) && (!Number.isFinite(Number(custo)) || Number(custo) < 0)) { setErro("Informe um custo válido, igual ou maior que zero."); return; }
    if (arquivos.length > 5) { setErro("Você pode anexar no máximo 5 arquivos."); return; }
    if (arquivos.some((arquivo) => arquivo.size > 5 * 1024 * 1024)) { setErro("Cada arquivo deve ter no máximo 5 MB."); return; }
    setSalvando(true);
    try {
      const anexos = await Promise.all(arquivos.map(lerArquivo));
      const resposta = await fetch("/api/historico-equipamentos", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ equipamentoId: equipamentoSelecionadoId, tipo, categoria, data, descricao, observacao, quemRealizou, destinoReparo, resultado, statusFinal: tipo === "retorno-de-reparo" ? statusFinal : "", custo: ["manutencao", "reposicao-de-peca", "retorno-de-reparo"].includes(tipo) && custo.trim() !== "" ? Number(custo) : 0, anexos }),
      });
      const dados = await resposta.json().catch(() => ({}));
      if (!resposta.ok) throw new Error(dados.erro || "Não foi possível salvar o registro.");
      router.push("/historico");
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado ao salvar o histórico.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-5 sm:p-8 dark:bg-[#3a3a3f]">
      <div className="mx-auto max-w-4xl">
        <Link href="/cadastros" className="mb-5 inline-block text-sm font-medium text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white">← Voltar para cadastros</Link>
        <h1 className="text-3xl font-bold text-gray-950 dark:text-white">Cadastrar registro</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">Registre uma manutenção, troca de peça ou movimentação de reparo.</p>
        <form onSubmit={salvar} className="mt-7 space-y-6">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-7 dark:border-[#505057] dark:bg-[#444449]">
            <h2 className="text-lg font-semibold text-gray-950 dark:text-white">Informações do registro</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div><label className={rotulo} htmlFor="tipo">Tipo de registro</label><select id="tipo" className={campo} value={tipo} onChange={(e) => { const novoTipo = e.target.value as TipoRegistro; setTipo(novoTipo); const lista = novoTipo === "retorno-de-reparo" ? equipamentos.filter((item) => item.status === "em-reparo" && eventosReparo.find((evento) => evento.equipamentoId === item.id)?.tipo === "envio-para-reparo") : equipamentos; if (!lista.some((item) => item.id === equipamentoId)) setEquipamentoId(lista[0]?.id || ""); }}>{TIPOS.map((item) => <option key={item.valor} value={item.valor}>{item.nome}</option>)}</select></div>
              <div><label className={rotulo} htmlFor="data">Data</label><input id="data" type="date" required className={campo} value={data} onChange={(e) => setData(e.target.value)} /></div>
              <div className="sm:col-span-2"><label className={rotulo} htmlFor="equipamento">Equipamento</label><select id="equipamento" required className={campo} value={equipamentoSelecionadoId} onChange={(e) => setEquipamentoId(e.target.value)} disabled={carregando || equipamentosDisponiveis.length === 0}><option value="">{carregando ? "Carregando equipamentos..." : tipo === "retorno-de-reparo" ? "Nenhum equipamento aguardando retorno" : "Selecione um equipamento"}</option>{equipamentosDisponiveis.map((item) => <option key={item.id} value={item.id}>{nomeEquipamento(item)}</option>)}</select>{!carregando && equipamentosDisponiveis.length === 0 && <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{tipo === "retorno-de-reparo" ? "Para registrar um retorno, primeiro registre o envio do equipamento para reparo." : "Você precisa cadastrar um equipamento primeiro."}</p>}</div>
              <div><label className={rotulo} htmlFor="categoria">Categoria</label><select id="categoria" className={campo} value={categoria} onChange={(e) => setCategoria(e.target.value)}>{CATEGORIAS.map((item) => <option key={item} value={item}>{item.replaceAll("-", " ").replace(/^./, (letra) => letra.toUpperCase())}</option>)}</select></div>
              <div><label className={rotulo} htmlFor="quemRealizou">Responsável / técnico</label><input id="quemRealizou" className={campo} value={quemRealizou} onChange={(e) => setQuemRealizou(e.target.value)} placeholder="Quem registrou ou realizou o serviço" /></div>
              {tipo === "envio-para-reparo" && <div className="sm:col-span-2"><label className={rotulo} htmlFor="destino">Assistência / empresa de reparo</label><input id="destino" required className={campo} value={destinoReparo} onChange={(e) => setDestinoReparo(e.target.value)} placeholder="Nome da empresa ou assistência" /></div>}
              {(tipo === "manutencao" || tipo === "reposicao-de-peca" || tipo === "retorno-de-reparo") && <div><label className={rotulo} htmlFor="custo">{tipo === "retorno-de-reparo" ? "Custo final da assistência (R$)" : "Custo interno (R$)"}</label><input id="custo" required={tipo === "retorno-de-reparo"} type="number" min="0" step="0.01" className={campo} value={custo} onChange={(e) => setCusto(e.target.value)} placeholder="0,00" /><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{tipo === "retorno-de-reparo" ? "Informe o valor cobrado pela assistência. Se não houve cobrança, informe 0." : "Opcional. Registre aqui o gasto interno ou com a peça, apenas uma vez."}</p></div>}
              {tipo === "retorno-de-reparo" && <div><label className={rotulo} htmlFor="statusFinal">Status após retorno</label><select id="statusFinal" className={campo} value={statusFinal} onChange={(e) => setStatusFinal(e.target.value)}>{STATUS.map((item) => <option key={item.valor} value={item.valor}>{item.nome}</option>)}</select></div>}
              <div className="sm:col-span-2"><label className={rotulo} htmlFor="descricao">Descrição</label><textarea id="descricao" required rows={4} className={campo} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder={tipo === "manutencao" ? "Descreva o serviço feito pela equipe interna..." : "Descreva o problema encontrado, o diagnóstico e o serviço realizado..."} /></div>
              {tipo === "retorno-de-reparo" && <div className="sm:col-span-2"><label className={rotulo} htmlFor="resultado">Resultado do reparo</label><textarea id="resultado" rows={3} className={campo} value={resultado} onChange={(e) => setResultado(e.target.value)} placeholder="Peças trocadas, testes realizados e resultado..." /></div>}
              <div className="sm:col-span-2"><label className={rotulo} htmlFor="observacao">Observações adicionais</label><textarea id="observacao" rows={3} className={campo} value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Informações complementares..." /></div>
              <div className="sm:col-span-2"><label className={rotulo} htmlFor="anexos">Anexos (máximo 5 arquivos de até 5 MB cada)</label><input id="anexos" type="file" multiple className={campo} onChange={(e) => setArquivos(Array.from(e.target.files ?? []))} />{arquivos.length > 0 && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{arquivos.length} arquivo(s) selecionado(s): {arquivos.map((arquivo) => arquivo.name).join(", ")}</p>}</div>
            </div>
          </section>
          {erro && <div role="alert" className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{erro}</div>}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Link href="/cadastros" className="rounded-xl border border-gray-300 px-5 py-3 text-center text-sm font-semibold text-gray-700 dark:border-[#5a5a61] dark:text-gray-200">Cancelar</Link><button type="submit" disabled={salvando || carregando || equipamentos.length === 0} className="rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-gray-900">{salvando ? "Salvando..." : "Salvar " + nomeTipo.toLowerCase()}</button></div>
        </form>
      </div>
    </div>
  );
}
