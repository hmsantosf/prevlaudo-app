export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

export interface Beneficio {
  id: string;
  userId: string;
  tipo: string;
  status: "pendente" | "em_analise" | "concluido";
  createdAt: Date;
  updatedAt: Date;
}

export interface Cliente {
  id: string;
  userId: string;
  name: string;
  cpf?: string;
  dataNascimento?: string;
  telefone?: string;
  createdAt: Date;
}
