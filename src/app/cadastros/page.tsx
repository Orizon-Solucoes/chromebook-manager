"use client";

import Link from "next/link";

const opcoes = [
  { titulo: "Cadastrar equipamento", descricao: "Adicione um Chromebook, notebook, projetor, catraca ou impressora.", href: "/cadastros/equipamentos/novo", simbolo: "＋" },
  { titulo: "Cadastrar manutenção", descricao: "Registre um serviço realizado pela equipe interna da escola.", href: "/cadastros/historico/novo?tipo=manutencao", simbolo: "⚙" },
  { titulo: "Cadastrar envio ao reparo", descricao: "Registre o envio para uma assistência técnica externa.", href: "/cadastros/historico/novo?tipo=envio-para-reparo", simbolo: "↗" },
  { titulo: "Cadastrar retorno do reparo", descricao: "Informe o resultado, o custo final e o status após o retorno.", href: "/cadastros/historico/novo?tipo=retorno-de-reparo", simbolo: "↩" },
];

export default function CadastrosPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-5 sm:p-8 dark:bg-[#3a3a3f]">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">Atalhos</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-950 dark:text-white">Cadastros</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">Escolha o que deseja registrar no Chromebook Manager.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {opcoes.map((opcao) => (
            <Link key={opcao.href} href={opcao.href} className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-gray-400 hover:shadow-md dark:border-[#505057] dark:bg-[#444449] dark:hover:border-gray-400">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-2xl font-semibold text-gray-800 dark:bg-[#333338] dark:text-gray-100">{opcao.simbolo}</span>
                <div><h2 className="text-lg font-semibold text-gray-950 group-hover:text-black dark:text-white">{opcao.titulo}</h2><p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">{opcao.descricao}</p><span className="mt-4 inline-block text-sm font-semibold text-gray-800 dark:text-gray-100">Abrir cadastro →</span></div>
              </div>
            </Link>
          ))}
          <Link href="/historico" className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-gray-400 hover:shadow-md dark:border-[#505057] dark:bg-[#444449]">
            <div className="flex items-start gap-4"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-2xl dark:bg-[#333338]">◷</span><div><h2 className="text-lg font-semibold text-gray-950 dark:text-white">Consultar histórico</h2><p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">Consulte manutenções, trocas de peças e reparos de todas as categorias.</p><span className="mt-4 inline-block text-sm font-semibold text-gray-800 dark:text-gray-100">Ver histórico →</span></div></div>
          </Link>
        </div>
      </div>
    </div>
  );
}
