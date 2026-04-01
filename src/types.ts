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
 * Representa um item do inventÃ¡rio de montagem.
 */
export interface InventarioItem {
  id: string;
  item: string;
  modelo: string;
  quantidade: string;
  patrimonio: string;
  localizacao: string;
  requerente: string;
  montadoPor: string;
}
