/**
 * Representa um evento de montagem no sistema.
 * Mantém campos redundantes como `diaSemana` para facilitar renderização
 * imediata na UI sem recálculo em massa.
 */
export interface Evento {
  id: string;
  nomeEvento: string;
  adicionadoPor: string;
  dataHora: string;
  diaSemana: string;
  localEvento: string;
  funcionarioPlantao: string;
  equipamentosNecessarios: string;
  numeroChamado: string;
  removido: boolean;
  concluido?: boolean;
  dataRemocao?: string;
  dataConclusao?: string;
}

/**
 * Representa um item do inventário de montagem.
 */
export interface InventarioUnidade {
  id: string;
  modelo: string;
  patrimonio: string;
  localizacao: string;
  requerente: string;
  montadoPor: string;
}

export interface InventarioItem {
  id: string;
  item: string;
  unidades: InventarioUnidade[];
}
