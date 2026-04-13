
export interface Entity {
  nome: string;
  cnpj_cpf: string;
  endereco: string;
  cidade: string;
  uf: string;
  cep: string;
  contato?: string;
}

export interface Item {
  id: string;
  conteudo: string;
  quantidade: number;
  valor: number;
}

export interface DeclarationForm {
  id?: string;
  remetente: Entity;
  destinatario: Entity;
  itens: Item[];
  pesoTotal: string;
  cidadeDeclaracao: string;
  dataDeclaracao: string;
  assinatura: string | null;
}