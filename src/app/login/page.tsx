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
    <main className="seice-login-v2 relative flex min-h-screen items-center justify-center bg-[#f4f4f1] px-4 py-12 text-[#252620] dark:bg-[#191a17] dark:text-[#f1f2ed]">
      <section className="w-full max-w-[430px] overflow-hidden rounded-2xl border border-[#e2e2dc] bg-white shadow-[0_18px_55px_rgba(25,26,22,0.09)] dark:border-[#3b3d36] dark:bg-[#242620]">
        <header className="border-b border-[#e8e8e2] px-8 pb-7 pt-8 dark:border-[#3b3d36]">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-900 text-sm font-extrabold tracking-tight text-white dark:bg-[#e7e8e1] dark:text-[#252620]">SE</div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#77786f] dark:text-[#a9aea4]">Colégio SEICE</p>
              <p className="mt-0.5 text-sm font-semibold text-[#34352f] dark:text-[#e5e6df]">Tecnologia e infraestrutura</p>
            </div>
          </div>
          <h1 className="text-[27px] font-bold tracking-[-.04em] text-[#252620] dark:text-white">SEICE Manager</h1>
          <p className="mt-2 text-sm leading-6 text-[#70716b] dark:text-[#a9aea4]">Acesse o ambiente de gestão de tecnologia.</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5 px-8 py-7">
          <div>
            <h2 className="text-base font-semibold text-[#292a26] dark:text-[#f1f2ed]">Entrar na sua conta</h2>
            <p className="mt-1 text-sm text-[#77786f] dark:text-[#a9aea4]">Use seu nome de usuário e sua senha.</p>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#3b3c36] dark:text-[#e3e4dc]">Nome de usuário</span>
            <input type="text" value={usuario} onChange={(event) => setUsuario(event.target.value)} placeholder="Digite seu usuário" autoComplete="username" required disabled={carregando} className="min-h-12 w-full rounded-lg border border-[#dcdcd5] bg-[#fbfbf9] px-4 py-3 text-sm text-[#252620] outline-none transition placeholder:text-[#999a91] focus:border-[#77786f] focus:ring-3 focus:ring-black/5 disabled:opacity-60 dark:border-[#4a4d44] dark:bg-[#1c1e19] dark:text-white dark:placeholder:text-[#858a7e] dark:focus:border-[#a9aea4]" />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#3b3c36] dark:text-[#e3e4dc]">Senha</span>
            <input type="password" value={senha} onChange={(event) => setSenha(event.target.value)} placeholder="Digite sua senha" autoComplete="current-password" required disabled={carregando} className="min-h-12 w-full rounded-lg border border-[#dcdcd5] bg-[#fbfbf9] px-4 py-3 text-sm text-[#252620] outline-none transition placeholder:text-[#999a91] focus:border-[#77786f] focus:ring-3 focus:ring-black/5 disabled:opacity-60 dark:border-[#4a4d44] dark:bg-[#1c1e19] dark:text-white dark:placeholder:text-[#858a7e] dark:focus:border-[#a9aea4]" />
          </label>

          {erro && <div role="alert" className="rounded-lg border border-[#e7c8c4] bg-[#fff4f2] px-4 py-3 text-sm text-[#a33d35] dark:border-[#68413d] dark:bg-[#382522] dark:text-[#f0aaa3]">{erro}</div>}

          <button type="submit" disabled={carregando} className="flex min-h-12 w-full items-center justify-center rounded-lg bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#41423c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#77786f] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#e7e8e1] dark:text-[#252620] dark:hover:bg-white">
            {carregando ? "Verificando acesso..." : "Entrar"}
          </button>

          <div className="rounded-lg border border-[#e7e7e1] bg-[#f8f8f5] px-4 py-3.5 text-sm leading-5 text-[#686961] dark:border-[#41443c] dark:bg-[#1d1f1a] dark:text-[#b9bdb2]">
            <p className="font-semibold text-[#34352f] dark:text-[#e5e6df]">Primeiro acesso?</p>
            <p className="mt-1">Informe apenas seu usuário e clique em Entrar. Você será direcionado para criar sua senha com o código fornecido pelo administrador.</p>
          </div>

          <p className="text-center text-sm text-[#77786f] dark:text-[#a9aea4]">
            <Link href="/primeiro-acesso" className="font-semibold text-[#45463f] underline decoration-[#b8b9b0] underline-offset-4 hover:text-black dark:text-[#e0e1d9] dark:hover:text-white">Abrir ativação de conta</Link>
          </p>
        </form>
      </section>
      <p className="absolute bottom-5 px-4 text-center text-[11px] font-medium tracking-wide text-[#898a82] dark:text-[#858a7e]">Colégio SEICE · Sistema interno de tecnologia</p>
    </main>
  );
}
