"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro("");
    if (!usuario.trim()) {
      setErro("Informe seu nome de usuário.");
      return;
    }
    setCarregando(true);
    try {
      const resposta = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ usuario: usuario.trim(), senha }),
      });
      const dados = await resposta.json();
      if (resposta.status === 428 && dados.primeiroAcesso) {
        router.push("/primeiro-acesso?usuario=" + encodeURIComponent(usuario.trim().toLowerCase()));
        return;
      }
      if (!resposta.ok) {
        setErro(dados.erro || "Não foi possível fazer login.");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setErro("Não foi possível conectar ao servidor. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-10 dark:bg-[#191d19]">
      <section className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-300 bg-white shadow-lg dark:border-gray-600 dark:bg-[#222821]">
        <header className="border-b border-gray-300 bg-gray-100 px-8 py-8 dark:border-gray-600 dark:bg-[#282f28]">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-amber-600 bg-amber-400 text-lg font-extrabold text-gray-900">
            CM
          </div>
          <p className="mb-1 text-center text-xs font-bold uppercase tracking-[0.18em] text-gray-600 dark:text-gray-300">
            SEICE · Tecnologia
          </p>
          <h1 className="text-center text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            SEICE Manager
          </h1>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-300">
            Entre com sua conta para continuar
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5 p-8">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200">
              Nome de usuário
            </span>
            <input
              type="text"
              value={usuario}
              onChange={(event) => setUsuario(event.target.value)}
              placeholder="Digite seu usuário"
              autoComplete="username"
              required
              disabled={carregando}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition disabled:opacity-60 dark:border-gray-600 dark:bg-[#30302f] dark:text-white"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200">
              Senha <span className="font-normal text-gray-500">(se já ativou a conta)</span>
            </span>
            <input
              type="password"
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              placeholder="Digite sua senha"
              autoComplete="current-password"
              disabled={carregando}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition disabled:opacity-60 dark:border-gray-600 dark:bg-[#30302f] dark:text-white"
            />
          </label>

          {erro && (
            <div role="alert" className="rounded-lg border px-4 py-3 text-sm">
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={carregando}
            className="w-full rounded-lg border border-amber-600 bg-amber-400 px-4 py-3 text-sm font-bold text-gray-900 transition hover:bg-amber-500 disabled:opacity-60"
          >
            {carregando ? "Verificando..." : "Entrar"}
          </button>

          <div className="rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 text-sm leading-5 text-gray-700 dark:border-gray-600 dark:bg-[#3a3a38] dark:text-gray-200">
            <strong>Primeiro acesso?</strong> Informe apenas seu usuário e clique em Entrar.
            Você será direcionado para criar a senha usando o código fornecido pelo administrador.
          </div>

          <p className="text-center text-xs text-gray-500">
            <Link href="/primeiro-acesso" className="font-semibold text-amber-700 underline-offset-4 hover:underline dark:text-amber-300">
              Abrir ativação de conta
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
