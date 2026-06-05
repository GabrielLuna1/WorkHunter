export interface Job {
  id: string;
  company: string;
  title: string;
  location: string;
  model: string;
  score: number;
  isFakeJunior: boolean;
  tags: string[];
  status: string;
  follow_up?: string;
  url?: string;
  descricao?: string;
  vaga_id?: string;
  aplicada_em?: string;
  notas?: string;
  proxima_acao?: string;
  proxima_data?: string;
}
