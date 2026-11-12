"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import { useUnidade, type UnidadeId } from "@/components/UnidadeProvider";

type ItemLink = { href: string; label: string; icon: string; active: boolean };

export default function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { unidadeAtiva, setUnidadeAtiva, podeAlternarUnidade, unidadeCarregada } = useUnidade();
  const [nome, setNome] = useState("Usuário");
  const [perfil, setPerfil] = useState("usuario");
  const [saindo, setSaindo] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let cancelado = false;
    async function carregarUsuario() {
      try {
        const resposta = await fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store" });
        if (!resposta.ok) return;
        const dados = await resposta.json();
        if (cancelado) return;
        if (dados.usuario?.nome) setNome(dados.usuario.nome);
        if (dados.usuario?.perfil) setPerfil(dados.usuario.perfil);
      } catch { /* A sessão é verificada pelo AuthGuard. */ }
    }
    void carregarUsuario();
    return () => { cancelado = true; };
  }, []);

  const podeGerenciarUsuarios = perfil === "admin";
  const grupos: { titulo: string; links: ItemLink[] }[] = [
    { titulo: "Visão geral", links: [{ href: "/", label: "Dashboard", icon: "⌂", active: pathname === "/" }] },
    { titulo: "Patrimônio", links: [
      { href: "/equipamentos", label: "Todos os equipamentos", icon: "▦", active: pathname === "/equipamentos" },
      { href: "/chromebooks", label: "Chromebooks", icon: "▣", active: pathname.startsWith("/chromebooks") },
      { href: "/notebooks", label: "Notebooks", icon: "▱", active: pathname.startsWith("/notebooks") },
      { href: "/projetores", label: "Projetores", icon: "◉", active: pathname.startsWith("/projetores") },
      { href: "/catracas", label: "Catracas", icon: "↔", active: pathname.startsWith("/catracas") },
      { href: "/impressoras", label: "Impressoras", icon: "▤", active: pathname.startsWith("/impressoras") },
      { href: "/aps", label: "Access Points (APs)", icon: "⌁", active: pathname.startsWith("/aps") },
    ] },
    { titulo: "Assistência técnica", links: [
      { href: "/em-reparo", label: "Em reparo", icon: "⚒", active: pathname.startsWith("/em-reparo") },
      { href: "/historico", label: "Histórico de serviços", icon: "◷", active: pathname.startsWith("/historico") },
    ] },
    { titulo: "Gestão", links: [
      { href: "/cadastros", label: "Cadastros", icon: "＋", active: pathname === "/cadastros" || pathname.startsWith("/cadastros/") },
      { href: "/relatorios/gastos", label: "Relatório de gastos", icon: "↗", active: pathname.startsWith("/relatorios") },
      ...(podeGerenciarUsuarios ? [{ href: "/usuarios", label: "Usuários", icon: "♙", active: pathname.startsWith("/usuarios") }] : []),
    ] },
  ];

  function trocarUnidade(valor: string) {
    if (valor !== "CE" && valor !== "JP") return;
    setUnidadeAtiva(valor as UnidadeId);
  }

  async function sair() {
    setErro("");
    setSaindo(true);
    try {
      const resposta = await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
      if (!resposta.ok) { setErro("Não foi possível sair. Tente novamente."); setSaindo(false); return; }
      router.replace("/login");
      router.refresh();
    } catch { setErro("Erro de conexão ao tentar sair."); setSaindo(false); }
  }

  const nomePerfil = perfil === "admin" ? "Administrador" : "Usuário";

  return (
    <aside id="navegacao-principal" aria-label="Menu principal" className={"fixed inset-y-0 left-0 z-50 flex h-dvh w-64 flex-col border-r transition-transform duration-200 md:translate-x-0 " + (mobileOpen ? "translate-x-0" : "-translate-x-full")}>
      <div className="border-b border-white/10 px-5 py-6">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f5cf24] text-[13px] font-black tracking-tight text-[#242318] shadow-sm">SE</span>
          <div className="min-w-0">
            <h1 className="truncate text-[16px] font-extrabold tracking-tight text-white">SEICE Manager</h1>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[.16em] text-white/55">Gestão de tecnologia</p>
          </div>
        </div>
        <div className="mt-5 h-1 w-12 rounded-full bg-[#f5cf24]" />
      </div>

      {podeAlternarUnidade && <div className="border-b border-white/10 px-4 py-4">
        <label htmlFor="seletor-unidade" className="mb-2 block px-1 text-[10px] font-bold uppercase tracking-[.14em] text-white/55">Unidade ativa</label>
        <select id="seletor-unidade" value={unidadeAtiva} onChange={(event) => trocarUnidade(event.target.value)} disabled={!unidadeCarregada} className="min-h-11 w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold text-white outline-none transition focus:border-[#f5cf24] disabled:cursor-wait disabled:opacity-60">
          <option className="text-black" value="CE">Campos Elíseos (CE)</option>
          <option className="text-black" value="JP">Jardim Primavera (JP)</option>
        </select>
        <p className="mt-2 px-1 text-[11px] leading-4 text-white/45">A unidade selecionada filtra os dados das telas integradas.</p>
      </div>}

      <nav aria-label="Navegação principal" className="flex-1 space-y-6 overflow-y-auto overscroll-contain px-3 py-5">
        {grupos.map((grupo) => <section key={grupo.titulo} aria-label={grupo.titulo}>
          <p className="mb-2 px-3 text-[10px] font-extrabold uppercase tracking-[.16em] text-white/40">{grupo.titulo}</p>
          <div className="space-y-1">{grupo.links.map((item) => <Link key={item.href} href={item.href} aria-current={item.active ? "page" : undefined} onClick={onClose} className={"group flex min-h-10 items-center gap-3 rounded-xl border px-3 py-2 text-[13px] font-semibold transition-all duration-150 " + (item.active ? "border-[#f5cf24] bg-[#f5cf24] text-[#242318] shadow-sm" : "border-transparent text-white/75 hover:border-white/10 hover:bg-white/8 hover:text-white")}>
            <span aria-hidden="true" className={"flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base " + (item.active ? "bg-black/8 text-[#242318]" : "bg-white/8 text-white/75 group-hover:bg-white/12")}>{item.icon}</span>
            <span className="min-w-0 flex-1">{item.label}</span>
            {item.active && <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#242318]" />}
          </Link>)}</div>
        </section>)}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="mb-3 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f5cf24] text-sm font-bold text-[#242318]">{(nome.trim()[0] || "U").toUpperCase()}</div>
          <div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{nome}</p><p className="mt-0.5 text-[11px] text-white/50">{nomePerfil}</p></div>
        </div>
        {erro && <p role="alert" className="mb-2 rounded-lg bg-red-950/40 px-3 py-2 text-xs text-red-200">{erro}</p>}
        <div className="flex items-center gap-2">
          <button type="button" onClick={sair} disabled={saindo} title="Sair da conta" className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 px-3 text-xs font-semibold text-white/65 transition hover:border-white/20 hover:bg-white/8 hover:text-white disabled:opacity-50">
            <span aria-hidden="true" className="text-lg">{saindo ? "…" : "↪"}</span><span>Sair</span>
          </button>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
