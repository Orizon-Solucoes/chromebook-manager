
export type ChromebookStatus =
  | "disponivel"
  | "em-uso"
  | "em-reparo"
  | "para-descarte";

export type Chromebook = {
  id: string;
  numero: string;
  mac: string;
  numeroSerie: string;
  modelo: string;
  sala: string;
  status: ChromebookStatus;
  observacoes: string;
};