
import type {
  Chromebook,
  ChromebookStatus,
} from "@/types/chromebook";

const API_URL = "/api/chromebooks";
const MAX_CHROMEBOOKS = 999;

export type NewChromebook = Omit<Chromebook, "id">;

function normalizarStatus(status: unknown): ChromebookStatus {
  if (
    status === "disponivel" ||
    status === "em-uso" ||
    status === "em-reparo" ||
    status === "para-descarte"
  ) {
    return status;
  }

  if (status === "retirada-de-pecas") {
    return "para-descarte";
  }

  return "para-descarte";
}

function normalizarChromebook(
  registro: Record<string, unknown>
): Chromebook {
  return {
    id: String(registro.id ?? ""),
    numero: String(registro.numero ?? ""),
    mac: String(registro.mac ?? ""),
    numeroSerie: String(registro.numeroSerie ?? ""),
    modelo: String(registro.modelo ?? ""),
    sala: String(registro.sala ?? ""),
    status: normalizarStatus(registro.status),
    observacoes: String(registro.observacoes ?? ""),
  };
}

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
    throw new Error(
      "O servidor retornou uma resposta inválida."
    );
  }

  if (!resposta.ok) {
    const dados =
      resultado !== null &&
      typeof resultado === "object"
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

export async function getChromebooks(): Promise<Chromebook[]> {
  const resultado = await requisicaoAPI(API_URL);

  if (!Array.isArray(resultado)) {
    throw new Error(
      "O servidor retornou uma lista de Chromebooks inválida."
    );
  }

  const chromebooks = resultado.map((registro) => {
    if (
      registro === null ||
      typeof registro !== "object" ||
      Array.isArray(registro)
    ) {
      throw new Error(
        "O servidor retornou um Chromebook inválido."
      );
    }

    return normalizarChromebook(
      registro as Record<string, unknown>
    );
  });

  if (chromebooks.length > MAX_CHROMEBOOKS) {
    throw new Error(
      `A quantidade de Chromebooks excede o limite de ${MAX_CHROMEBOOKS}.`
    );
  }

  return chromebooks;
}

export async function saveChromebook(
  chromebook: NewChromebook
): Promise<Chromebook> {
  const resultado = await requisicaoAPI(API_URL, {
    method: "POST",
    body: JSON.stringify({
      ...chromebook,
      status: normalizarStatus(chromebook.status),
    }),
  });

  if (
    resultado === null ||
    typeof resultado !== "object" ||
    Array.isArray(resultado)
  ) {
    throw new Error(
      "O servidor não retornou o Chromebook cadastrado."
    );
  }

  return normalizarChromebook(
    resultado as Record<string, unknown>
  );
}

export async function deleteChromebook(
  id: string
): Promise<void> {
  if (typeof id !== "string" || !id.trim()) {
    throw new Error(
      "Informe um identificador válido para excluir o Chromebook."
    );
  }

  await requisicaoAPI(
    `${API_URL}?id=${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    }
  );
}

export async function updateChromebook(
  updatedChromebook: Chromebook
): Promise<Chromebook> {
  if (
    !updatedChromebook ||
    typeof updatedChromebook.id !== "string" ||
    !updatedChromebook.id.trim()
  ) {
    throw new Error(
      "O Chromebook não possui um identificador válido."
    );
  }

  const resultado = await requisicaoAPI(API_URL, {
    method: "PUT",
    body: JSON.stringify({
      ...updatedChromebook,
      status: normalizarStatus(updatedChromebook.status),
    }),
  });

  if (
    resultado === null ||
    typeof resultado !== "object" ||
    Array.isArray(resultado)
  ) {
    throw new Error(
      "O servidor não retornou o Chromebook atualizado."
    );
  }

  return normalizarChromebook(
    resultado as Record<string, unknown>
  );
}
