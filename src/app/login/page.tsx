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
    if (!usuario.trim()) { setErro("Informe seu nome de usuário."); return; }
    setCarregando(true);
    try {
      const resposta = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ usuario: usuario.trim(), senha }),
      });
      const dados = await resposta.json();
      if (resposta.status === 428 && dados.primeiroAcesso) {
        router.push("/primeiro-acesso?usuario=" + encodeURIComponent(usuario.trim().toLowerCase()));
        return;
      }
      if (!resposta.ok) { setErro(dados.erro || "Não foi possível fazer login."); return; }
      router.push("/");
      router.refresh();
    } catch { setErro("Não foi possível conectar ao servidor. Tente novamente."); }
    finally { setCarregando(false); }
  }

  return (
    <main className="seice-login flex min-h-screen items-center justify-center px-4 py-10">
      <div className="pointer-events-none fixed left-0 top-0 h-2 w-full bg-[#f5cf24]" />
      <section className="w-full max-w-[440px] overflow-hidden rounded-[24px] border border-black/5 bg-white shadow-2xl">
        <header className="relative overflow-hidden bg-[#22231f] px-8 pb-8 pt-9 text-center text-white">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full border-[28px] border-white/5" />
          <div className="relative mx-auto mb-5 flex h-[66px] w-[66px] items-center justify-center rounded-[20px] bg-[#f5cf24] text-[19px] font-black tracking-tight text-[#242318] shadow-lg">SE</div>
          <p className="relative mb-1 text-[10px] font-extrabold uppercase tracking-[.2em] text-[#f5cf24]">Colégio SEICE · Tecnologia</p>
          <h1 className="relative text-[26px] font-extrabold tracking-tight text-white">SEICE Manager</h1>
          <p className="relative mt-2 text-sm text-white/65">Acesso ao ambiente de gestão de tecnologia</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5 px-8 py-8">
          <div><h2 className="text-lg font-bold text-[#252620]">Bem-vindo de volta!</h2><p className="mt-1 text-sm text-[#74756e]">Entre com suas credenciais para continuar.</p></div>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#34352f]">Nome de usuário</span>
            <input type="text" value={usuario} onChange={(event) => setUsuario(event.target.value)} placeholder="Digite seu usuário" autoComplete="username" required disabled={carregando} className="w-full rounded-xl border border-[#deded6] bg-[#fafaf7] px-4 py-3 text-sm text-[#252620] outline-none transition placeholder:text-[#999a91] focus:border-[#d5b20d] focus:ring-4 focus:ring-[#f5cf24]/20 disabled:opacity-60" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#34352f]">Senha <span className="font-normal text-[#85867e]">(se já ativou a conta)</span></span>
            <input type="password" value={senha} onChange={(event) => setSenha(event.target.value)} placeholder="Digite sua senha" autoComplete="current-password" disabled={carregando} className="w-full rounded-xl border border-[#deded6] bg-[#fafaf7] px-4 py-3 text-sm text-[#252620] outline-none transition placeholder:text-[#999a91] focus:border-[#d5b20d] focus:ring-4 focus:ring-[#f5cf24]/20 disabled:opacity-60" />
          </label>
          {erro && <div role="alert" className="rounded-xl border border-[#f1c7c3] bg-[#fff0ee] px-4 py-3 text-sm text-[#a8322b]">{erro}</div>}
          <button type="submit" disabled={carregando} className="flex min-h-12 w-full items-center justify-center rounded-xl bg-[#f5cf24] px-4 py-3 text-sm font-extrabold text-[#242318] shadow-sm transition hover:bg-[#e9c018] hover:shadow-md disabled:opacity-60">{carregando ? "Verificando..." : "Entrar no sistema"}</button>
          <div className="rounded-xl border border-[#ecebe4] bg-[#f8f8f4] px-4 py-3 text-sm leading-5 text-[#62635c]"><strong className="text-[#30312b]">Primeiro acesso?</strong> Informe apenas seu usuário e clique em Entrar. Você será direcionado para criar a senha usando o código fornecido pelo administrador.</div>
          <p className="text-center text-xs text-[#77786f]"><Link href="/primeiro-acesso" className="font-bold text-[#6d5900] underline-offset-4 hover:underline">Abrir ativação de conta</Link></p>
        </form>
      </section>
      <p className="fixed bottom-5 text-center text-[11px] font-medium tracking-wide text-[#85867d]">Colégio SEICE · Sistema interno de tecnologia</p>
    </main>
  );
}
