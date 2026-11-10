import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<{ chromebook?: string | string[] }>;
};

export default async function RetornoReparoLegadoPage({ searchParams }: Props) {
  const params = await searchParams;
  const valor = params.chromebook;
  const id = Array.isArray(valor) ? valor[0] : valor;
  const query = new URLSearchParams({ tipo: "retorno-de-reparo" });
  if (id) query.set("equipamentoId", id);
  redirect(`/cadastros/historico/novo?${query.toString()}`);
}
