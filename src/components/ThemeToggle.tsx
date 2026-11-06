"use client";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [carregado, setCarregado] = useState(false);
  useEffect(() => {
    const temaEscuro = localStorage.getItem("chromebook-theme") === "dark";
    document.documentElement.classList.toggle("dark", temaEscuro);
    setDark(temaEscuro);
    setCarregado(true);
  }, []);
  function alternarTema() {
    const novoTema = !dark;
    document.documentElement.classList.toggle("dark", novoTema);
    localStorage.setItem("chromebook-theme", novoTema ? "dark" : "light");
    setDark(novoTema);
  }
  if (!carregado) return <span aria-hidden="true" className="h-10 flex-1 min-w-0" />;
  const acao = dark ? "Modo claro" : "Modo escuro";
  return (
    <button
      type="button"
      onClick={alternarTema}
      className="flex min-h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 px-2 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-200 hover:text-gray-950 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-white"
      title={acao}
      aria-label={acao}
    >
      <span aria-hidden="true" className="shrink-0 text-base">{dark ? "☀️" : "🌙"}</span>
      <span className="truncate">{acao}</span>
    </button>
  );
}
