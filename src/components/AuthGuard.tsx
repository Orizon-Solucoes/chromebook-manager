"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { UnidadeProvider } from "@/components/UnidadeProvider";

type Estado = "verificando" | "autenticado" | "erro";

const TEMPO_INATIVIDADE_MS = 30 * 60 * 1000;

export default function AuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [estado, setEstado] = useState<Estado>("verificando");
  const [mobileOpen, setMobileOpen] = useState(false);

  const paginaPublica =
    pathname === "/login" ||
    pathname === "/configurar" ||
    pathname === "/primeiro-acesso";

  useEffect(() => {
    let cancelado = false;

    if (paginaPublica) return;

    // Reinicia o estado visual enquanto a sessão da nova rota é conferida.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEstado("verificando");

    async function verificar() {
      try {
        const resposta = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });

        if (cancelado) return;

        if (resposta.status === 401) {
          router.replace("/login");
          return;
        }

        if (!resposta.ok) {
          setEstado("erro");
          return;
        }

        const dados = await resposta.json();
        const perfil = dados.usuario?.perfil;

        if (
          pathname.startsWith("/usuarios") &&
          perfil !== "admin"
        ) {
          router.replace("/");
          return;
        }

        setEstado("autenticado");
      } catch {
        if (!cancelado) setEstado("erro");
      }
    }

    void verificar();

    return () => {
      cancelado = true;
    };
  }, [pathname, paginaPublica, router]);

  useEffect(() => {
    if (paginaPublica || estado !== "autenticado") return;

    let temporizador: ReturnType<typeof setTimeout>;
    let encerrandoSessao = false;

    const desconectarPorInatividade = async () => {
      if (encerrandoSessao) return;

      encerrandoSessao = true;

      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "same-origin",
          keepalive: true,
        });
      } catch {
        // Redireciona mesmo se a conexão falhar.
      } finally {
        router.replace("/login?motivo=inatividade");
        router.refresh();
      }
    };

    const reiniciarTemporizador = () => {
      if (encerrandoSessao) return;

      clearTimeout(temporizador);
      temporizador = setTimeout(
        () => void desconectarPorInatividade(),
        TEMPO_INATIVIDADE_MS,
      );
    };

    const eventos: (keyof WindowEventMap)[] = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
      "click",
    ];

    eventos.forEach((evento) =>
      window.addEventListener(evento, reiniciarTemporizador, {
        passive: true,
      }),
    );

    reiniciarTemporizador();

    return () => {
      clearTimeout(temporizador);

      eventos.forEach((evento) =>
        window.removeEventListener(evento, reiniciarTemporizador),
      );
    };
  }, [estado, paginaPublica, pathname, router]);

  // Fecha o menu móvel quando a rota muda; sincronização intencional da navegação.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false);
  }, [pathname]);

  // Permite fechar o menu com a tecla Escape.
  useEffect(() => {
    if (!mobileOpen) return;

    const fecharComEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    };

    window.addEventListener("keydown", fecharComEscape);

    return () => {
      window.removeEventListener("keydown", fecharComEscape);
    };
  }, [mobileOpen]);

  if (paginaPublica) {
    return <>{children}</>;
  }

  if (estado === "verificando") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f6f3] dark:bg-[#171916]">
        <p className="text-sm font-medium text-[#70716b] dark:text-[#a9aea4]">
          Verificando sessão...
        </p>
      </div>
    );
  }

  if (estado === "erro") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f6f6f3] px-4 dark:bg-[#171916]">
        <p className="text-sm text-[#20211f] dark:text-[#f1f2ed]">
          Não foi possível verificar sua sessão.
        </p>

        <button
          type="button"
          onClick={() => router.refresh()}
          className="rounded-xl bg-[#f5cf24] px-5 py-2.5 text-sm font-bold text-[#242318] transition hover:bg-[#e6bd0d]"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <UnidadeProvider>
      <div className="min-h-screen min-w-0">
        <Sidebar
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />

        {/* Fundo que fecha o menu ao tocar fora dele. */}
        {mobileOpen && (
          <button
            type="button"
            aria-label="Fechar menu de navegação"
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
          />
        )}

        <main className="min-h-screen min-w-0 md:pl-60">
          {/* Barra superior exclusiva para telas menores. */}
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-[#e3e3dc] bg-white px-4 dark:border-[#3b4038] dark:bg-[#22251f] md:hidden">
            <button
              type="button"
              aria-label="Abrir menu de navegação"
              aria-controls="navegacao-principal"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#e3e3dc] text-xl dark:border-[#3b4038]"
            >
              ☰
            </button>

            <span className="truncate text-sm font-semibold">
              SEICE Manager
            </span>
          </header>

          {children}
        </main>
      </div>
    </UnidadeProvider>
  );
}