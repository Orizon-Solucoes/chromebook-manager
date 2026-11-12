"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import { useUnidade, type UnidadeId } from "@/components/UnidadeProvider";

type ItemLink = {
  href: string;
  label: string;
  icon: string;
  active: boolean;
};

export default function Sidebar({
  mobileOpen,
  onClose,
}: {
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const {
    unidadeAtiva,
    setUnidadeAtiva,
    podeAlternarUnidade,
    unidadeCarregada,
  } = useUnidade();

  const [nome, setNome] = useState("Usuário");
  const [perfil, setPerfil] = useState("usuario");
  const [saindo, setSaindo] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let cancelado = false;

    async function carregarUsuario() {
      try {
        const resposta = await fetch("/api/auth/me", {
          credentials: "same-origin",
          cache: "no-store",
        });

        if (!resposta.ok) return;

        const dados = await resposta.json();

        if (cancelado) return;

        if (dados.usuario?.nome) {
          setNome(dados.usuario.nome);
        }

        if (dados.usuario?.perfil) {
          setPerfil(dados.usuario.perfil);
        }
      } catch {
        // A sessão é verificada pelo AuthGuard.
      }
    }

    void carregarUsuario();

    return () => {
      cancelado = true;
    };
  }, []);

  const podeGerenciarUsuarios = perfil === "admin";

  const grupos: { titulo: string; links: ItemLink[] }[] = [
    {
      titulo: "Visão geral",
      links: [
        {
          href: "/",
          label: "Dashboard",
          icon: "▦",
          active: pathname === "/",
        },
      ],
    },
    {
      titulo: "Patrimônio",
      links: [
        {
          href: "/equipamentos",
          label: "Todos os equipamentos",
          icon: "▦",
          active: pathname === "/equipamentos",
        },
        {
          href: "/chromebooks",
          label: "Chromebooks",
          icon: "▣",
          active: pathname.startsWith("/chromebooks"),
        },
        {
          href: "/notebooks",
          label: "Notebooks",
          icon: "▱",
          active: pathname.startsWith("/notebooks"),
        },
        {
          href: "/projetores",
          label: "Projetores",
          icon: "◉",
          active: pathname.startsWith("/projetores"),
        },
        {
          href: "/catracas",
          label: "Catracas",
          icon: "↔",
          active: pathname.startsWith("/catracas"),
        },
        {
          href: "/impressoras",
          label: "Impressoras",
          icon: "▤",
          active: pathname.startsWith("/impressoras"),
        },
        {
          href: "/aps",
          label: "Access Points (APs)",
          icon: "⌁",
          active: pathname.startsWith("/aps"),
        },
      ],
    },
    {
      titulo: "Assistência técnica",
      links: [
        {
          href: "/em-reparo",
          label: "Em reparo",
          icon: "⚒",
          active: pathname.startsWith("/em-reparo"),
        },
        {
          href: "/historico",
          label: "Histórico de serviços",
          icon: "◷",
          active: pathname.startsWith("/historico"),
        },
      ],
    },
    {
      titulo: "Gestão",
      links: [
        {
          href: "/cadastros",
          label: "Cadastros",
          icon: "＋",
          active:
            pathname === "/cadastros" ||
            pathname.startsWith("/cadastros/"),
        },
        {
          href: "/relatorios/gastos",
          label: "Relatório de gastos",
          icon: "↗",
          active: pathname.startsWith("/relatorios"),
        },
        ...(podeGerenciarUsuarios
          ? [
              {
                href: "/usuarios",
                label: "Usuários",
                icon: "♙",
                active: pathname.startsWith("/usuarios"),
              },
            ]
          : []),
      ],
    },
  ];

  function trocarUnidade(valor: string) {
    if (valor !== "CE" && valor !== "JP") return;

    setUnidadeAtiva(valor as UnidadeId);
  }

  async function sair() {
    setErro("");
    setSaindo(true);

    try {
      const resposta = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });

      if (!resposta.ok) {
        setErro("Não foi possível sair. Tente novamente.");
        setSaindo(false);
        return;
      }

      router.replace("/login");
      router.refresh();
    } catch {
      setErro("Erro de conexão ao tentar sair.");
      setSaindo(false);
    }
  }

  const nomePerfil = perfil === "admin" ? "Administrador" : "Usuário";

  return (
    <aside
      id="navegacao-principal"
      aria-label="Menu principal"
      className={
        "fixed inset-y-0 left-0 z-50 flex h-dvh w-60 flex-col border-r border-gray-300 bg-[#e2e2e2] text-gray-800 transition-transform transition-colors duration-200 dark:border-[#555555] dark:bg-[#292929] dark:text-gray-100 md:translate-x-0 " +
        (mobileOpen ? "translate-x-0" : "-translate-x-full")
      }
    >
      <div className="border-b border-gray-300 bg-[#e2e2e2] px-5 py-6 dark:border-[#555555] dark:bg-[#292929]">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#b58a36] text-sm font-extrabold tracking-tight text-[#211d15] shadow-sm">
            SM
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-bold tracking-tight text-gray-900 dark:text-gray-100">
              SEICE Manager
            </h1>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-gray-500 dark:text-gray-400">
              Gestão de tecnologia
            </p>
          </div>
        </div>
      </div>

      {podeAlternarUnidade && (
        <div className="border-b border-gray-300 px-3 py-4 dark:border-[#555555]">
          <label
            htmlFor="seletor-unidade"
            className="mb-2 block px-1 text-[10px] font-bold uppercase tracking-[.14em] text-gray-500 dark:text-gray-400"
          >
            Unidade ativa
          </label>

          <select
            id="seletor-unidade"
            value={unidadeAtiva}
            onChange={(event) => trocarUnidade(event.target.value)}
            disabled={!unidadeCarregada}
            className="min-h-11 w-full rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-800 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 disabled:cursor-wait disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          >
            <option value="CE">Campos Elíseos (CE)</option>
            <option value="JP">Jardim Primavera (JP)</option>
          </select>

          <p className="mt-2 px-1 text-[11px] leading-4 text-gray-500 dark:text-gray-400">
            A unidade selecionada será usada pelas telas que já estão
            integradas ao seletor.
          </p>
        </div>
      )}

      <nav
        aria-label="Navegação principal"
        className="flex-1 space-y-5 overflow-y-auto overscroll-contain px-3 py-4"
      >
        {grupos.map((grupo) => (
          <section key={grupo.titulo} aria-label={grupo.titulo}>
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.14em] text-gray-500 dark:text-gray-400">
              {grupo.titulo}
            </p>

            <div className="space-y-1">
              {grupo.links.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={item.active ? "page" : undefined}
                  onClick={onClose}
                  className={
                    "group flex min-h-10 items-center gap-3 rounded-lg border px-3 py-2 text-[13px] font-semibold transition-colors duration-150 " +
                    (item.active
                      ? "border-gray-400 bg-gray-300 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                      : "border-transparent text-gray-700 hover:border-gray-300 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white")
                  }
                >
                  <span
                    aria-hidden="true"
                    className={
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-base " +
                      (item.active
                        ? "bg-gray-400/30 text-gray-900 dark:bg-gray-600 dark:text-white"
                        : "bg-gray-300 text-gray-700 group-hover:bg-gray-400 dark:bg-gray-700 dark:text-gray-200")
                    }
                  >
                    {item.icon}
                  </span>

                  <span className="min-w-0 flex-1">{item.label}</span>

                  {item.active && (
                    <span
                      aria-hidden="true"
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"
                    />
                  )}
                </Link>
              ))}
            </div>
          </section>
        ))}
      </nav>

      <div className="border-t border-gray-300 p-3 dark:border-gray-600">
        <div className="mb-2 flex items-center gap-3 rounded-lg border border-gray-300 bg-gray-100 px-3 py-3 dark:border-gray-600 dark:bg-gray-800">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-300 text-sm font-semibold text-gray-800 dark:bg-gray-600 dark:text-white">
            {(nome.trim()[0] || "U").toUpperCase()}
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-800 dark:text-gray-100">
              {nome}
            </p>

            <p className="mt-0.5 text-[11px] text-gray-600 dark:text-gray-400">
              {nomePerfil}
            </p>
          </div>
        </div>

        {erro && (
          <p role="alert" className="mb-2 text-xs text-red-600 dark:text-red-300">
            {erro}
          </p>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={sair}
            disabled={saindo}
            title="Sair da conta"
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-transparent px-2 text-xs font-semibold text-gray-600 transition hover:border-gray-300 hover:bg-gray-200 hover:text-gray-900 disabled:opacity-50 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:bg-gray-700 dark:hover:text-white"
          >
            <span aria-hidden="true" className="text-lg">{saindo ? "…" : "↪"}</span>
          </button>

          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}