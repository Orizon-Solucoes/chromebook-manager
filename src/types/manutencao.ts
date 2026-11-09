export type TipoManutencao =
  | "ocorrencia"
  | "manutencao"
  | "reposicao-de-peca"
  | "envio-para-reparo"
  | "retorno-de-reparo";

export type CategoriaManutencao =
  | "tela"
  | "teclado"
  | "bateria"
  | "carregador"
  | "touchpad"
  | "sistema-operacional"
  | "wifi"
  | "bluetooth"
  | "audio"
  | "camera"
  | "carcaca"
  | "dobradica"
  | "usb"
  | "outro";

export type AnexoManutencao = {
  id: string;
  nome: string;
  tipo: string;
  tamanho: number;
  dados: string;
};

export type Manutencao = {
  id: string;
  chromebookId: string;
  data: string;
  tipo: TipoManutencao;
  categoria: CategoriaManutencao;
  descricao: string;
  observacao: string;
  quemRealizou: string;
  anexos: AnexoManutencao[];

  custo?: number;
  destinoReparo?: string;
  resultado?: string;
};