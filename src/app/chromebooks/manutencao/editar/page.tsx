import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<{ id?: string | string[] }>;
};

export default async function EditarManutencaoLegadaPage({ searchParams }: Props) {
  const params = await searchParams;
  const valor = params.id;
  const id = Array.isArray(valor) ? valor[0] : valor;
  if (!id) redirect("/historico");
  redirect(`/historico/editar?id=${encodeURIComponent(id)}`);
}
