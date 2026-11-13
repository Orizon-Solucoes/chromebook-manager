"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export default function AlterarSenhaPage() {
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function salvar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro("");
    setSucesso("");

    if (novaSenha.length < 8) {
      setErro("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setErro("A confirmação da nova senha não confere.");
      return;
    }

    setCarregando(true);
    try {
      const resposta = await fetch("/api/auth/alterar-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ senhaAtual, novaSenha, confirmarSenha }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) {
        setErro(dados.erro || "Não foi possível alterar a senha.");
        return;
      }
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarSenha("");
      setSucesso("Senha alterada. As outras sessões da sua conta foram encerradas.");
    } catch {
      setErro("Não foi possível conectar ao servidor. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  const campo = "min-h-12 w-full rounded-lg border border-[#dcdcd5] bg-white px-4 py-3 text-sm text-[#252620] outline-none transition placeholder:text-[#999a91] focus:border-[#77786f] focus:ring-3 focus:ring-black/5 dark:border-[#4a4d44] dark:bg-[#1c1e19] dark:text-white dark:placeholder:text-[#858a7e] dark:focus:border-[#a9aea4]";

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-7">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#77786f] dark:text-[#a9aea4]">Conta e segurança</p>
        <h1 className="text-2xl font-bold tracking-tight text-[#252620] dark:text-[#f1f2ed]">Alterar senha</h1>
        <p className="text-sm text-[#70716b] dark:text-[#a9aea4]">Atualize sua senha de acesso ao SEICE Manager.</p>
      </header>

      <section className="max-w-2xl rounded-2xl border border-[#e2e2dc] bg-white p-5 shadow-sm dark:border-[#3b3d36] dark:bg-[#242620] sm:p-7">
        <form onSubmit={salvar} className="space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-[#3b3c36] dark:text-[#e3e4dc]">Senha atual</span>
            <input className={campo} type="password" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} autoComplete="current-password" required disabled={carregando} />
          </label>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#3b3c36] dark:text-[#e3e4dc]">Nova senha</span>
              <input className={campo} type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} autoComplete="new-password" minLength={8} maxLength={128} required disabled={carregando} />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#3b3c36] dark:text-[#e3e4dc]">Confirmar nova senha</span>
              <input className={campo} type="password" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} autoComplete="new-password" minLength={8} maxLength={128} required disabled={carregando} />
            </label>
          </div>

          <p className="text-xs leading-5 text-[#77786f] dark:text-[#a9aea4]">Use no mínimo 8 caracteres. Por segurança, será necessário informar sua senha atual.</p>
          {erro && <div role="alert" className="rounded-lg border border-[#e7c8c4] bg-[#fff4f2] px-4 py-3 text-sm text-[#a33d35] dark:border-[#68413d] dark:bg-[#382522] dark:text-[#f0aaa3]">{erro}</div>}
          {sucesso && <div role="status" className="rounded-lg border border-[#c9dfcf] bg-[#f0f7f1] px-4 py-3 text-sm text-[#326442] dark:border-[#3d6247] dark:bg-[#203326] dark:text-[#a8d5b3]">{sucesso}</div>}

          <div className="flex flex-col-reverse gap-3 border-t border-[#e8e8e2] pt-5 dark:border-[#3b3d36] sm:flex-row sm:justify-end">
            <Link href="/" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[#dcdcd5] px-5 text-sm font-semibold text-[#55564f] transition hover:bg-[#f5f5f1] dark:border-[#4a4d44] dark:text-[#d8d9d1] dark:hover:bg-[#30332c]">Voltar</Link>
            <button type="submit" disabled={carregando} className="min-h-11 rounded-lg bg-gray-900 px-5 text-sm font-semibold text-white transition hover:bg-[#41423c] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#e7e8e1] dark:text-[#252620] dark:hover:bg-white">{carregando ? "Salvando..." : "Salvar nova senha"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
