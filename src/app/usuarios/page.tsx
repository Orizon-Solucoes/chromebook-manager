"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Usuario = {
  id: string;
  nome: string;
  usuario: string;
  perfil: string;
  unidadeId: string | null;
  ativo: boolean;
  precisaAtivar: boolean;
  criadoEm: string;
  proprioUsuario: boolean;
};
type NovoUsuario = { id: string; nome: string; usuario: string; perfil: string; unidadeId: string; precisaAtivar: boolean };

const campo =
  "w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-500 focus:ring-2 focus:ring-gray-500/10 dark:border-[#45454a] dark:bg-[#303035] dark:text-gray-100";
const cartao = "rounded-xl border border-gray-200 bg-white dark:border-[#48484d] dark:bg-[#303035]";
function dataBR(valor: string) {
  if (!valor) return "—";
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? valor : data.toLocaleDateString("pt-BR");
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [nome, setNome] = useState("");
  const [usuario, setUsuario] = useState("");
  const [unidadeId, setUnidadeId] = useState("CE");
  const [perfil, setPerfil] = useState("usuario");
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editUsuario, setEditUsuario] = useState("");
  const [editUnidade, setEditUnidade] = useState("CE");
  const [editPerfil, setEditPerfil] = useState("usuario");
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [novo, setNovo] = useState<NovoUsuario | null>(null);
  const [codigo, setCodigo] = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    try {
      const resposta = await fetch("/api/usuarios", { cache: "no-store", credentials: "same-origin" });
      const dados = await resposta.json();
      if (resposta.status === 403) {
        window.location.replace("/");
        return;
      }
      if (!resposta.ok) throw new Error(dados.erro || "Não foi possível carregar os usuários.");
      setUsuarios(dados);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao carregar usuários.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    // carregar controla o estado visual e executa a consulta inicial dos usuários.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void carregar();
  }, [carregar]);

  async function criar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro("");
    setMensagem("");
    setNovo(null);
    setCodigo("");
    setSalvando(true);
    try {
      const resposta = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ nome, usuario, perfil, unidadeId }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro || "Não foi possível criar a conta.");
      setNovo(dados.usuario);
      setCodigo(dados.codigoPrimeiroAcesso);
      setMensagem("Conta criada. Copie o código de ativação antes de sair desta tela.");
      setNome("");
      setUsuario("");
      setUnidadeId("CE");
      setPerfil("usuario");
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao criar conta.");
    } finally {
      setSalvando(false);
    }
  }

  function iniciarEdicao(item: Usuario) {
    setEditando(item);
    setEditNome(item.nome);
    setEditUsuario(item.usuario);
    setEditPerfil(item.perfil === "admin" || item.perfil === "admin_geral" ? "admin" : "usuario");
    setEditUnidade(item.unidadeId || "CE");
    setErro("");
    setMensagem("");
  }

  async function salvarEdicao(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editando) return;
    setErro("");
    setMensagem("");
    setSalvandoEdicao(true);
    try {
      const resposta = await fetch("/api/usuarios/" + encodeURIComponent(editando.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ nome: editNome, usuario: editUsuario, perfil: editPerfil, unidadeId: editUnidade }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro || "Não foi possível editar o usuário.");
      setMensagem("Dados de @" + dados.usuario + " atualizados.");
      setEditando(null);
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao editar usuário.");
    } finally {
      setSalvandoEdicao(false);
    }
  }

  async function alterarPerfil(item: Usuario, novoPerfil: string) {
    if (item.proprioUsuario) return;
    const unidadeAtual = item.unidadeId || "CE";
    setErro("");
    setMensagem("");
    try {
      const resposta = await fetch("/api/usuarios/" + encodeURIComponent(item.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ nome: item.nome, usuario: item.usuario, perfil: novoPerfil, unidadeId: unidadeAtual }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro || "Não foi possível alterar o perfil.");
      setMensagem("Perfil de @" + item.usuario + " atualizado.");
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao alterar perfil.");
    }
  }

  async function alterarUnidade(item: Usuario, novaUnidade: string) {
    if (item.proprioUsuario || item.perfil === "admin" || item.perfil === "admin_geral") return;
    setErro("");
    setMensagem("");
    try {
      const resposta = await fetch("/api/usuarios/" + encodeURIComponent(item.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ nome: item.nome, usuario: item.usuario, unidadeId: novaUnidade }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro || "Não foi possível alterar o acesso.");
      setMensagem("Acesso de @" + item.usuario + " atualizado.");
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao alterar acesso.");
    }
  }

  async function excluir(item: Usuario) {
    if (item.proprioUsuario) return;
    if (!window.confirm("Tem certeza que deseja excluir a conta de " + item.nome + " (@" + item.usuario + ")? Essa ação encerra o acesso dessa conta.")) return;
    setErro("");
    setMensagem("");
    try {
      const resposta = await fetch("/api/usuarios/" + encodeURIComponent(item.id), {
        method: "DELETE",
        credentials: "same-origin",
      });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro || "Não foi possível excluir a conta.");
      setMensagem("A conta @" + item.usuario + " foi excluída.");
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao excluir conta.");
    }
  }

  async function copiarCodigo() {
    try {
      await navigator.clipboard.writeText(codigo);
      setMensagem("Código copiado. Entregue-o ao usuário por um canal privado.");
    } catch {
      setMensagem("Não foi possível copiar automaticamente. Selecione o código e copie manualmente.");
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8 dark:bg-[#3a3a3f]">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex flex-col gap-3 border-b border-gray-200 pb-5 sm:flex-row sm:items-end sm:justify-between dark:border-[#55555a]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-700 dark:text-gray-300">Administração</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl dark:text-white">Usuários</h1>
            <p className="mt-1.5 max-w-2xl text-sm text-gray-600 dark:text-gray-300">Gerencie o acesso ao sistema. Senhas não ficam visíveis para administradores.</p>
          </div>
          <div className="flex items-center gap-2 self-start rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 sm:self-auto dark:border-[#55555a] dark:bg-[#303035] dark:text-gray-300">
            <span className="h-2 w-2 rounded-full bg-gray-500" />
            <span><strong className="font-semibold text-gray-900 dark:text-white">{usuarios.length}</strong> conta(s)</span>
          </div>
        </header>

        {erro && <div role="alert" className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 dark:border-[#55555a] dark:bg-[#25252a] dark:text-gray-200">{erro}</div>}
        {mensagem && <div role="status" className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 dark:border-[#55555a] dark:bg-[#303035] dark:text-gray-200">{mensagem}</div>}

        {novo && codigo && (
          <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-500 dark:bg-[#303035]">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">Código de primeiro acesso</p>
                <h2 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">Conta de {novo.nome} criada</h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Usuário: <strong>@{novo.usuario}</strong>. Entregue o código diretamente à pessoa.</p>
                <p className="mt-3 inline-block select-all rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 font-mono text-xl font-bold tracking-[0.2em] text-gray-900 dark:border-[#55555a] dark:bg-[#25252a] dark:text-white">{codigo}</p>
              </div>
              <button type="button" onClick={copiarCodigo} className="shrink-0 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-700">Copiar código</button>
            </div>
            <button type="button" onClick={() => { setNovo(null); setCodigo(""); }} className="mt-3 text-sm text-gray-600 underline underline-offset-2 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">Ocultar código</button>
          </section>
        )}

        {editando && (
          <section className={cartao + " p-5"}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-700 dark:text-gray-300">Editar conta</p>
                <h2 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">Editar @{editando.usuario}</h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Altere o perfil, os dados da conta e os colégios permitidos para usuários.</p>
              </div>
              <button type="button" onClick={() => setEditando(null)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 dark:border-[#55555a] dark:text-gray-200">Cancelar</button>
            </div>
            <form onSubmit={salvarEdicao} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">Nome completo</span>
                <input className={campo} value={editNome} onChange={(e) => setEditNome(e.target.value)} maxLength={150} required />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">Nome de usuário</span>
                <input className={campo} value={editUsuario} onChange={(e) => setEditUsuario(e.target.value.toLowerCase().replace(/\s/g, ""))} minLength={3} maxLength={100} pattern="[a-zA-Z0-9._-]+" required />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">Perfil</span>
                <select className={campo} value={editPerfil} onChange={(e) => setEditPerfil(e.target.value)} disabled={editando.proprioUsuario}>
                  <option value="usuario">Usuário</option>
                  <option value="admin">Administrador</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">Acesso aos colégios</span>
                {editPerfil === "admin" ? (
                  <p className={campo + " text-gray-500 dark:text-gray-300"}>Administrador tem acesso aos dois colégios.</p>
                ) : (
                  <select className={campo} value={editUnidade} onChange={(e) => setEditUnidade(e.target.value)}>
                    <option value="CE">CE — Campos Elíseos</option>
                    <option value="JP">JP — Jardim Primavera</option>
                    <option value="AMBOS">CE e JP — ambos os colégios</option>
                  </select>
                )}
              </label>
              <div className="flex items-end">
                <button type="submit" disabled={salvandoEdicao} className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:opacity-60 dark:bg-[#202024]">{salvandoEdicao ? "Salvando..." : "Salvar alterações"}</button>
              </div>
            </form>
          </section>
        )}

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.4fr)]">
          <section className={cartao + " p-5"}>
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-700 dark:text-gray-300">Nova conta</p>
              <h2 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">Cadastrar usuário</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">A pessoa cria a própria senha no primeiro acesso.</p>
            </div>
            <form onSubmit={criar} className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">Nome completo</span>
                <input className={campo} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Maria Silva" maxLength={150} required />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">Nome de usuário</span>
                <input className={campo} value={usuario} onChange={(e) => setUsuario(e.target.value.toLowerCase().replace(/\s/g, ""))} placeholder="Ex.: maria.silva" minLength={3} maxLength={100} pattern="[a-zA-Z0-9._-]+" autoComplete="off" required />
                <span className="mt-1.5 block text-xs text-gray-500 dark:text-gray-400">Use letras sem acento, números, ponto, hífen ou underline.</span>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">Perfil</span>
                <select className={campo} value={perfil} onChange={(e) => setPerfil(e.target.value)}>
                  <option value="usuario">Usuário</option>
                  <option value="admin">Administrador</option>
                </select>
              </label>
              {perfil === "usuario" && (
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">Acesso aos colégios</span>
                  <select className={campo} value={unidadeId} onChange={(e) => setUnidadeId(e.target.value)}>
                    <option value="CE">CE — Campos Elíseos</option>
                    <option value="JP">JP — Jardim Primavera</option>
                    <option value="AMBOS">CE e JP — ambos os colégios</option>
                  </select>
                </label>
              )}
              {perfil === "admin" && <p className="text-xs text-gray-500 dark:text-gray-400">Administradores têm acesso aos dois colégios e à gestão de usuários.</p>}
              <button type="submit" disabled={salvando} className="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60">{salvando ? "Criando conta..." : "Criar conta"}</button>
            </form>
          </section>

          <section className={cartao + " overflow-hidden"}>
            <div className="flex flex-col gap-3 border-b border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-[#48484d]">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Contas cadastradas</h2>
                <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-300">Acompanhe o acesso de cada pessoa.</p>
              </div>
              <button type="button" onClick={() => void carregar()} className="self-start rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 sm:self-auto dark:border-[#55555a] dark:text-gray-200 dark:hover:bg-[#3b3b40]">Atualizar</button>
            </div>
            {carregando ? (
              <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">Carregando usuários...</div>
            ) : usuarios.length === 0 ? (
              <div className="p-8 text-center">
                <p className="font-medium text-gray-900 dark:text-white">Nenhum usuário encontrado</p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Crie uma conta para começar.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-[#48484d]">
                {usuarios.map((item) => (
                  <article key={item.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-700 dark:border-[#55555a] dark:bg-[#25252a] dark:text-gray-200">{(item.nome[0] || "U").toUpperCase()}</div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-gray-900 dark:text-white">{item.nome} {item.proprioUsuario && <span className="ml-1 text-xs font-medium text-gray-700 dark:text-gray-300">(você)</span>}</p>
                        <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-300">@{item.usuario}</p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Criado em {dataBR(String(item.criadoEm))}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <span className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-[#414146] dark:text-gray-200">{item.perfil === "admin" || item.perfil === "admin_geral" ? "Administrador" : "Usuário"}</span>
                      {!item.proprioUsuario && (
                        <select aria-label={"Perfil de " + item.nome} className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-800 dark:border-[#55555a] dark:bg-[#303035] dark:text-gray-100" value={item.perfil === "admin" || item.perfil === "admin_geral" ? "admin" : "usuario"} onChange={(e) => void alterarPerfil(item, e.target.value)}>
                          <option value="usuario">Usuário</option>
                          <option value="admin">Administrador</option>
                        </select>
                      )}
                      {item.perfil !== "admin" && item.perfil !== "admin_geral" && (
                        item.proprioUsuario ? (
                          <span className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-[#414146] dark:text-gray-200">{item.unidadeId === "AMBOS" ? "CE + JP" : item.unidadeId || "Sem unidade"}</span>
                        ) : (
                          <select aria-label={"Acesso aos colégios de " + item.nome} className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-800 dark:border-[#55555a] dark:bg-[#303035] dark:text-gray-100" value={item.unidadeId || "CE"} onChange={(e) => void alterarUnidade(item, e.target.value)}>
                            <option value="CE">CE</option>
                            <option value="JP">JP</option>
                            <option value="AMBOS">CE + JP</option>
                          </select>
                        )
                      )}
                      <span className={"rounded-md px-2.5 py-1 text-xs font-medium " + (item.precisaAtivar ? "bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300" : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200")}>{item.precisaAtivar ? "Aguardando ativação" : "Senha configurada"}</span>
                      {<button type="button" onClick={() => iniciarEdicao(item)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 dark:border-[#55555a] dark:text-gray-200 dark:hover:bg-[#414146]">Editar</button>}
                      {!item.proprioUsuario && <button type="button" onClick={() => void excluir(item)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:border-gray-400 hover:bg-gray-50 hover:text-gray-900 dark:border-[#55555a] dark:text-gray-200 dark:hover:border-[#66666b] dark:hover:bg-[#414146] dark:hover:text-gray-100">Excluir</button>}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
        <p className="text-xs leading-5 text-gray-500 dark:text-gray-400">Por segurança, senhas e hashes não são exibidos. O código de ativação aparece apenas na criação da conta e é invalidado após a definição da senha.</p>
      </div>
    </main>
  );
}
