"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type UnidadeId = "CE" | "JP";

type UnidadeContexto = {
  unidadeAtiva: UnidadeId;
  setUnidadeAtiva: (unidade: UnidadeId) => void;
  administradorGeral: boolean;
  podeAlternarUnidade: boolean;
  unidadeCarregada: boolean;
};

const CHAVE_UNIDADE = "chromebook-manager-unidade-ativa";

const UnidadeContext = createContext<UnidadeContexto | null>(null);

function unidadeValida(valor: unknown): valor is UnidadeId {
  return valor === "CE" || valor === "JP";
}

export function UnidadeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [unidadeAtiva, definirUnidade] = useState<UnidadeId>("CE");
  const [administradorGeral, setAdministradorGeral] = useState(false);
  const [podeAlternarUnidade, setPodeAlternarUnidade] = useState(false);
  const [unidadeCarregada, setUnidadeCarregada] = useState(false);

  useEffect(() => {
    let cancelado = false;

    async function carregarUnidade() {
      try {
        const resposta = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });

        if (!resposta.ok) return;

        const dados = await resposta.json();
        const usuario = dados.usuario;

        if (!usuario || cancelado) return;

        const geral =
          usuario.perfil === "admin" || usuario.administradorGeral === true;

        setAdministradorGeral(geral);
        const podeAlternar = geral || usuario.unidade_id === "AMBOS";
        setPodeAlternarUnidade(podeAlternar);
        const unidadeDoUsuario: UnidadeId = unidadeValida(usuario.unidade_id) ? usuario.unidade_id : "CE";
        if (podeAlternar) {
          let unidadeSalva: string | null = null;

          try {
            unidadeSalva = localStorage.getItem(CHAVE_UNIDADE);
          } catch {
            // O sistema continua funcionando sem persistência local.
          }

          definirUnidade(
            unidadeValida(unidadeSalva) ? unidadeSalva : unidadeDoUsuario,
          );
        } else {
          definirUnidade(unidadeDoUsuario);
        }
      } catch (erro) {
        console.error("Erro ao carregar a unidade ativa:", erro);
      } finally {
        if (!cancelado) setUnidadeCarregada(true);
      }
    }

    void carregarUnidade();

    return () => {
      cancelado = true;
    };
  }, []);

  const setUnidadeAtiva = useCallback(
    (unidade: UnidadeId) => {
      if (!unidadeValida(unidade)) return;

      // Só administradores ou usuários com acesso aos dois colégios podem alternar.
      if (!podeAlternarUnidade) return;

      definirUnidade(unidade);

      try {
        localStorage.setItem(CHAVE_UNIDADE, unidade);
      } catch {
        // A seleção continua ativa até a página ser fechada.
      }
    },
    [podeAlternarUnidade],
  );

  return (
    <UnidadeContext.Provider
      value={{
        unidadeAtiva,
        setUnidadeAtiva,
        administradorGeral,
        podeAlternarUnidade,
        unidadeCarregada,
      }}
    >
      {children}
    </UnidadeContext.Provider>
  );
}

export function useUnidade() {
  const contexto = useContext(UnidadeContext);

  if (!contexto) {
    throw new Error(
      "useUnidade precisa ser usado dentro de UnidadeProvider.",
    );
  }

  return contexto;
}
