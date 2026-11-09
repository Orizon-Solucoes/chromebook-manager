
import type { Manutencao } from "@/types/manutencao";

const API_URL = "/api/manutencoes";

export type NovaManutencao = Omit<Manutencao, "id">;

async function requisicaoAPI(
  url: string,
  opcoes?: RequestInit
): Promise<unknown> {
  let resposta: Response;

  try {
    resposta = await fetch(url, {
      ...opcoes,
      headers: {
        "Content-Type": "application/json",
        ...opcoes?.headers,
      },
      cache: "no-store",
    });
  } catch {
    throw new Error(
      "Não foi possível conectar ao servidor. Confira se o sistema está funcionando."
    );
  }

  let resultado: unknown;

  try {
    resultado = await resposta.json();
  } catch {
    throw new Error("O servidor retornou uma resposta inválida.");
  }

  if (!resposta.ok) {
    const dados =
      resultado !== null &&
      typeof resultado === "object" &&
      !Array.isArray(resultado)
        ? (resultado as Record<string, unknown>)
        : {};

    throw new Error(
      typeof dados.erro === "string"
        ? dados.erro
        : `Erro na comunicação com o servidor (${resposta.status}).`
    );
  }

  return resultado;
}

function validarManutencao(valor: unknown): Manutencao {
  if (
    valor === null ||
    typeof valor !== "object" ||
    Array.isArray(valor)
  ) {
    throw new Error(
      "O servidor retornou uma manutenção inválida."
    );
  }

  const registro = valor as Record<string, unknown>;

  if (
    typeof registro.id !== "string" ||
    !registro.id.trim() ||
    typeof registro.chromebookId !== "string" ||
    !registro.chromebookId.trim() ||
    typeof registro.data !== "string" ||
    typeof registro.tipo !== "string" ||
    typeof registro.categoria !== "string" ||
    typeof registro.descricao !== "string" ||
    typeof registro.observacao !== "string" ||
    typeof registro.quemRealizou !== "string" ||
    !Array.isArray(registro.anexos)
  ) {
    throw new Error(
      "O servidor retornou dados incompletos da manutenção."
    );
  }

  const anexos = registro.anexos.map((valorAnexo) => {
    if (
      valorAnexo === null ||
      typeof valorAnexo !== "object" ||
      Array.isArray(valorAnexo)
    ) {
      throw new Error("O servidor retornou um anexo inválido.");
    }

    const anexo = valorAnexo as Record<string, unknown>;

    if (
      typeof anexo.id !== "string" ||
      typeof anexo.nome !== "string" ||
      typeof anexo.tipo !== "string" ||
      typeof anexo.tamanho !== "number" ||
      !Number.isFinite(anexo.tamanho) ||
      anexo.tamanho < 0 ||
      typeof anexo.dados !== "string"
    ) {
      throw new Error(
        "O servidor retornou dados incompletos de um anexo."
      );
    }

    return {
      id: anexo.id,
      nome: anexo.nome,
      tipo: anexo.tipo,
      tamanho: anexo.tamanho,
      dados: anexo.dados,
    };
  });

  const manutencao: Manutencao = {
    id: registro.id,
    chromebookId: registro.chromebookId,
    data: registro.data,
    tipo: registro.tipo as Manutencao["tipo"],
    categoria: registro.categoria as Manutencao["categoria"],
    descricao: registro.descricao,
    observacao: registro.observacao,
    quemRealizou: registro.quemRealizou,
    anexos,
  };

  if (registro.custo !== undefined && registro.custo !== null) {
    const custo = Number(registro.custo);

    if (!Number.isFinite(custo) || custo < 0) {
      throw new Error("O servidor retornou um custo inválido.");
    }

    manutencao.custo = custo;
  }

  if (typeof registro.destinoReparo === "string") {
    manutencao.destinoReparo = registro.destinoReparo;
  }

  if (typeof registro.resultado === "string") {
    manutencao.resultado = registro.resultado;
  }

  return manutencao;
}

export async function getManutencoes(): Promise<Manutencao[]> {
  const resultado = await requisicaoAPI(API_URL);

  if (!Array.isArray(resultado)) {
    throw new Error(
      "O servidor retornou uma lista de manutenções inválida."
    );
  }

  return resultado.map(validarManutencao);
}

export async function getManutencao(
  id: string
): Promise<Manutencao> {
  if (typeof id !== "string" || !id.trim()) {
    throw new Error("Informe um ID válido para consultar a manutenção.");
  }

  const resultado = await requisicaoAPI(
    `${API_URL}?id=${encodeURIComponent(id)}`
  );

  return validarManutencao(resultado);
}

export async function saveManutencao(
  manutencao: NovaManutencao
): Promise<Manutencao> {
  const resultado = await requisicaoAPI(API_URL, {
    method: "POST",
    body: JSON.stringify(manutencao),
  });

  return validarManutencao(resultado);
}

export async function updateManutencao(
  manutencao: Manutencao
): Promise<Manutencao> {
  if (
    !manutencao ||
    typeof manutencao.id !== "string" ||
    !manutencao.id.trim()
  ) {
    throw new Error(
      "A manutenção não possui um identificador válido."
    );
  }

  const resultado = await requisicaoAPI(API_URL, {
    method: "PUT",
    body: JSON.stringify(manutencao),
  });

  return validarManutencao(resultado);
}

export async function deleteManutencao(id: string): Promise<void> {
  if (typeof id !== "string" || !id.trim()) {
    throw new Error("Informe um ID válido para excluir a manutenção.");
  }

  await requisicaoAPI(
    `${API_URL}?id=${encodeURIComponent(id)}`,
    { method: "DELETE" }
  );
}
