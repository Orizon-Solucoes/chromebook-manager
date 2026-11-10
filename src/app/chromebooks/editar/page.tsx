import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<{ id?: string | string[]; chromebookId?: string | string[] }>;
};

export default async function EditarChromebookLegadoPage({ searchParams }: Props) {
  const params = await searchParams;
  const valor = params.id ?? params.chromebookId;
  const id = Array.isArray(valor) ? valor[0] : valor;
  if (!id) redirect("/equipamentos");
  redirect(`/cadastros/equipamentos/${encodeURIComponent(id)}/editar?returnTo=${encodeURIComponent("/equipamentos")}`);
}
