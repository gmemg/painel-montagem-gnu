import { Evento, InventarioItem } from "../types";

// Chaves separadas para isolar domínios de dados e permitir limpeza seletiva.
const STORAGE_KEY = "eventos_montagem";
const HISTORICO_KEY = "historico_eventos";
const HISTORICO_REMOVIDOS_COUNT_KEY = "historico_removidos_count";
const INVENTARIO_KEY = "inventario_montagem";

/**
 * Lê os eventos ativos/registrados do `localStorage`.
 *
 * @returns Lista de eventos persistidos; retorna lista vazia quando não há dados.
 * @sideEffects Faz leitura do `localStorage`.
 */
export const getEventos = (): Evento[] => {
  const eventos = localStorage.getItem(STORAGE_KEY);
  return eventos ? JSON.parse(eventos) : [];
};

/**
 * Persiste a lista de eventos em `localStorage`.
 *
 * @param eventos Lista completa de eventos a ser armazenada.
 * @sideEffects Sobrescreve o valor armazenado em `localStorage`.
 */
export const saveEventos = (eventos: Evento[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(eventos));
};

/**
 * Recupera o histórico de eventos removidos/concluídos.
 *
 * @returns Lista de eventos no histórico; vazia quando não há dados.
 * @sideEffects Faz leitura do `localStorage`.
 */
export const getHistorico = (): Evento[] => {
  const historico = localStorage.getItem(HISTORICO_KEY);
  return historico ? JSON.parse(historico) : [];
};

/**
 * Persiste o histórico atualizado.
 *
 * @param eventos Lista completa do histórico a ser armazenada.
 * @sideEffects Sobrescreve o valor armazenado em `localStorage`.
 */
export const saveHistorico = (eventos: Evento[]): void => {
  localStorage.setItem(HISTORICO_KEY, JSON.stringify(eventos));
};

/**
 * Adiciona um evento ao histórico evitando duplicidade por `id`.
 * O objetivo é manter uma linha do tempo limpa mesmo quando o mesmo evento
 * é removido/concluído mais de uma vez por erros de interface.
 *
 * @param evento Evento a ser adicionado ao histórico.
 * @sideEffects Atualiza o `localStorage` de histórico.
 */
export const addToHistorico = (evento: Evento): void => {
  const historico = getHistorico();
  const indiceExistente = historico.findIndex((e) => e.id === evento.id);

  if (indiceExistente >= 0) {
    historico[indiceExistente] = evento;
  } else {
    historico.push(evento);
  }

  saveHistorico(historico);
};

/**
 * Move automaticamente para concluído qualquer evento cuja data/hora já chegou.
 * A regra é aplicada de forma idempotente para poder rodar em toda recarga
 * ou sincronização periódica sem gerar duplicatas no histórico.
 *
 * @returns Lista atualizada de eventos após a reconciliação automática.
 * @sideEffects Atualiza eventos e histórico no `localStorage` quando necessário.
 */
export const reconcileEventosAutomaticos = (): Evento[] => {
  const agora = Date.now();
  const eventos = getEventos();
  let houveMudanca = false;

  const eventosAtualizados = eventos.map((evento) => {
    if (evento.removido || evento.concluido) {
      return evento;
    }

    if (new Date(evento.dataHora).getTime() > agora) {
      return evento;
    }

    houveMudanca = true;

    return {
      ...evento,
      concluido: true,
      removido: true,
      dataConclusao: evento.dataConclusao || new Date().toISOString(),
      dataRemocao: evento.dataRemocao || new Date().toISOString(),
    };
  });

  if (!houveMudanca) {
    return eventos;
  }

  saveEventos(eventosAtualizados);
  eventosAtualizados
    .filter((evento) => evento.concluido && evento.removido)
    .forEach(addToHistorico);

  return eventosAtualizados;
};

/**
 * Recupera o contador de remoções feitas diretamente no histórico.
 * Essa métrica é separada dos eventos para manter um histórico auditável mesmo
 * após exclusões definitivas da lista.
 *
 * @returns Número de remoções registradas.
 * @sideEffects Faz leitura do `localStorage`.
 */
export const getHistoricoRemovidosCount = (): number => {
  const count = localStorage.getItem(HISTORICO_REMOVIDOS_COUNT_KEY);
  const parsed = count ? Number(count) : 0;
  return Number.isNaN(parsed) ? 0 : parsed;
};

/**
 * Incrementa o contador de remoções do histórico.
 *
 * @returns Novo valor do contador após o incremento.
 * @sideEffects Atualiza o `localStorage`.
 */
export const incrementHistoricoRemovidosCount = (): number => {
  const next = getHistoricoRemovidosCount() + 1;
  localStorage.setItem(HISTORICO_REMOVIDOS_COUNT_KEY, String(next));
  return next;
};

/**
 * Lê o inventário de montagem do `localStorage`.
 *
 * @returns Lista de itens do inventário; vazia quando não há dados.
 * @sideEffects Faz leitura do `localStorage`.
 */
export const getInventario = (): InventarioItem[] => {
  const inventario = localStorage.getItem(INVENTARIO_KEY);
  return inventario ? JSON.parse(inventario) : [];
};

/**
 * Persiste o inventário atualizado.
 *
 * @param itens Lista completa de itens a ser armazenada.
 * @sideEffects Sobrescreve o valor armazenado em `localStorage`.
 */
export const saveInventario = (itens: InventarioItem[]): void => {
  localStorage.setItem(INVENTARIO_KEY, JSON.stringify(itens));
};
