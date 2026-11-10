"use client";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
export default function PrimeiroAcessoPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState("");
  const [codigo, setCodigo] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [carregando, setCarregando] = useState(false);
  // Preenche o usuário a partir do link de ativação após a hidratação.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { const valor = new URLSearchParams(window.location.search).get("usuario"); if (valor) setUsuario(valor); }, []);
  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setErro(""); setSucesso("");
    if (senha.length < 8) { setErro("A senha deve ter pelo menos 8 caracteres."); return; }
    if (new TextEncoder().encode(senha).length > 128) { setErro("A senha ultrapassa o tamanho máximo permitido."); return; }
    if (senha !== confirmarSenha) { setErro("As senhas não conferem."); return; }
    setCarregando(true);
    try {
      const resposta = await fetch("/api/auth/definir-senha", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ usuario, codigo, senha, confirmarSenha }) });
      const dados = await resposta.json();
      if (!resposta.ok) { setErro(dados.erro || "Não foi possível configurar a senha."); return; }
      setSucesso("Senha criada! Você será direcionado para o login.");
      window.setTimeout(() => router.replace("/login"), 1200);
    } catch { setErro("Não foi possível conectar ao servidor. Tente novamente."); }
    finally { setCarregando(false); }
  }
  const campo = "w-full rounded-xl border border-teal-100 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100 dark:border-[#35515a] dark:bg-[#15252d] dark:text-white";
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-50 via-white to-sky-100 px-4 py-8 dark:from-[#111b22] dark:via-[#14262d] dark:to-[#172c38]">
      <section className="w-full max-w-lg overflow-hidden rounded-3xl border border-teal-100 bg-white shadow-2xl shadow-teal-900/10 dark:border-[#2b454c] dark:bg-[#1c2a33]">
        <div className="bg-gradient-to-br from-teal-600 via-cyan-700 to-blue-700 px-7 py-8 text-white sm:px-9"><div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-lg font-black">CM</div><p className="text-xs font-bold uppercase tracking-[.2em] text-teal-100">Ativação de conta</p><h1 className="mt-2 text-3xl font-black tracking-tight">Crie sua senha</h1><p className="mt-2 text-sm leading-6 text-cyan-50">Defina uma senha pessoal. Ela não fica visível para o administrador.</p></div>
        <form onSubmit={enviar} className="space-y-5 p-7 sm:p-9">
          <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Nome de usuário</span><input className={campo} value={usuario} onChange={(e) => setUsuario(e.target.value.toLowerCase())} autoComplete="username" required maxLength={100} /></label>
          <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Código de primeiro acesso</span><input className={campo} value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase().replace(/[^A-F0-9]/g, "").slice(0, 16))} placeholder="16 caracteres" autoComplete="one-time-code" required minLength={16} maxLength={16} /></label>
          <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Nova senha</span><input className={campo} type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Mínimo de 8 caracteres" autoComplete="new-password" required minLength={8} maxLength={128} /></label>
          <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Confirme a senha</span><input className={campo} type="password" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} placeholder="Digite novamente" autoComplete="new-password" required minLength={8} maxLength={128} /></label>
          {erro && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">{erro}</div>}
          {sucesso && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">{sucesso}</div>}
          <button disabled={carregando} className="w-full rounded-xl bg-gradient-to-r from-teal-600 to-cyan-700 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-teal-900/15 transition hover:-translate-y-0.5 disabled:opacity-60">{carregando ? "Salvando senha..." : "Criar minha senha"}</button>
          <p className="text-center text-sm text-slate-500 dark:text-slate-400">Já ativou sua conta? <Link href="/login" className="font-bold text-teal-700 hover:text-teal-900 dark:text-teal-300">Voltar ao login</Link></p>
        </form>
      </section>
    </main>
  );
}
