import { useCallback, useEffect, useMemo, useState } from "react";
import { Evento } from "../types";
import {
  getEventos,
  getHistorico,
  getHistoricoRemovidosCount,
  incrementHistoricoRemovidosCount,
  saveEventos,
  saveHistorico,
} from "../utils/storage";
import { getDiaSemana, formatDateTime } from "../utils/dateUtils";
import "./Historico.css";

/**
 * Tela de histórico: consolida eventos removidos/concluídos e ativos.
 * O objetivo é oferecer rastreabilidade mesmo após exclusões lógicas.
 */
const Historico = () => {
  const [montagensRemovidas, setMontagensRemovidas] = useState(0);
  const [totalMontagens, setTotalMontagens] = useState(0);
  const [todosEventos, setTodosEventos] = useState<Evento[]>([]);
  const [eventoParaRemover, setEventoParaRemover] = useState<Evento | null>(
    null,
  );

  /**
   * Recarrega e reconcilia fontes de dados do histórico e eventos atuais.
   * A união por `id` evita duplicidade quando um evento está em mais de um lugar.
   */
  const carregarDados = useCallback(() => {
    const historico = getHistorico();
    const eventosAtuais = getEventos();
    const eventosRemovidosAtuais = eventosAtuais.filter((e) => e.removido);

    const eventosUnicos = new Map<string, Evento>();

    eventosRemovidosAtuais.forEach((evento) => {
      eventosUnicos.set(evento.id, evento);
    });

    historico.forEach((evento) => {
      eventosUnicos.set(evento.id, evento);
    });

    eventosAtuais
      .filter((e) => !e.removido)
      .forEach((evento) => {
        if (!eventosUnicos.has(evento.id)) {
          eventosUnicos.set(evento.id, evento);
        }
      });

    const todosEventosArray = Array.from(eventosUnicos.values()).sort(
      // Ordena do mais recente para o mais antigo para facilitar leitura.
      (a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime(),
    );

    setMontagensRemovidas(getHistoricoRemovidosCount());
    setTotalMontagens(historico.length);
    setTodosEventos(todosEventosArray);
  }, []);

  useEffect(() => {
    // Carregamento inicial para evitar render vazio com estado incompleto.
    carregarDados();
  }, [carregarDados]);

  /**
   * Abre confirmação de remoção definitiva do histórico.
   *
   * @param evento Evento selecionado na tabela.
   */
  const handleRemoverHistorico = useCallback((evento: Evento) => {
    setEventoParaRemover(evento);
  }, []);

  /**
   * Remove definitivamente o evento do histórico e da lista principal.
   * Incrementa o contador de remoções para manter métrica mesmo após exclusão.
   */
  const handleConfirmarRemocao = useCallback(() => {
    if (!eventoParaRemover) return;

    const historicoAtualizado = getHistorico().filter(
      (e) => e.id !== eventoParaRemover.id,
    );
    saveHistorico(historicoAtualizado);

    const eventosAtualizados = getEventos().filter(
      (e) => e.id !== eventoParaRemover.id,
    );
    saveEventos(eventosAtualizados);

    const novoTotalRemovidas = incrementHistoricoRemovidosCount();
    setMontagensRemovidas(novoTotalRemovidas);
    carregarDados();
    setEventoParaRemover(null);
  }, [carregarDados, eventoParaRemover]);

  /**
   * Fecha o modal sem alterações.
   */
  const handleCancelarRemocao = useCallback(() => {
    setEventoParaRemover(null);
  }, []);

  useEffect(() => {
    if (!eventoParaRemover) return;

    // Atalhos de teclado para uma operação mais rápida e previsível.
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleCancelarRemocao();
        return;
      }

      if (e.key === "Enter") {
        handleConfirmarRemocao();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [eventoParaRemover, handleCancelarRemocao, handleConfirmarRemocao]);

  /**
   * Resolve a classe CSS baseada no estado do evento.
   *
   * @param evento Evento avaliado.
   * @returns Classe CSS correspondente.
   */
  const eventosView = useMemo(
    () =>
      todosEventos.map((evento) => {
        const statusClass = evento.concluido
          ? "concluido"
          : evento.removido
            ? "removido"
            : "ativo";
        const statusLabel = evento.concluido
          ? "Concluído"
          : evento.removido
            ? "Removido"
            : "Ativo";

        return {
          ...evento,
          statusClass,
          statusLabel,
          dataHoraFormatada: formatDateTime(evento.dataHora),
          diaSemanaFormatado: getDiaSemana(evento.dataHora),
          dataRemocaoFormatada: evento.dataRemocao
            ? formatDateTime(evento.dataRemocao)
            : "-",
        };
      }),
    [todosEventos],
  );

  return (
    <div className="historico">
      <div className="historico-header">
        <h2>HISTÓRICO DE MONTAGENS</h2>
        <div className="historico-stats">
          <span className="stat-item">
            Total de montagens: <strong>{totalMontagens}</strong>
          </span>
          <span className="stat-item">
            Montagens removidas: <strong>{montagensRemovidas}</strong>
          </span>
        </div>
      </div>

      <div className="tabela-container">
        <table className="tabela-historico">
          <thead>
            <tr>
              <th>Nome do Evento</th>
              <th>Data e Hora</th>
              <th>Dia da Semana</th>
              <th>Local do Evento</th>
              <th>Adicionado por</th>
              <th>Funcionário de Plantão</th>
              <th>Equipamentos Necessários</th>
              <th>Número do Chamado</th>
              <th>Status</th>
              <th>Data de Remoção</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {eventosView.length === 0 ? (
              <tr>
                <td colSpan={11} className="empty-state">
                  Nenhum evento no histórico.
                </td>
              </tr>
            ) : (
              eventosView.map((evento) => (
                <tr key={evento.id} className={evento.statusClass}>
                  <td>{evento.nomeEvento}</td>
                  <td>{evento.dataHoraFormatada}</td>
                  <td>{evento.diaSemanaFormatado}</td>
                  <td>{evento.localEvento}</td>
                  <td>{evento.adicionadoPor || "-"}</td>
                  <td>{evento.funcionarioPlantao}</td>
                  <td>{evento.equipamentosNecessarios}</td>
                  <td>{evento.numeroChamado}</td>
                  <td>
                    <span className={`status-badge ${evento.statusClass}`}>
                      {evento.statusLabel}
                    </span>
                  </td>
                  <td>{evento.dataRemocaoFormatada}</td>
                  <td>
                    <button
                      className="btn-remover-historico"
                      onClick={() => handleRemoverHistorico(evento)}
                      title="Remover do histórico"
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {eventoParaRemover && (
        <div
          className="popup-overlay"
          role="presentation"
          onClick={handleCancelarRemocao}
        >
          <div
            className="popup-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="popup-titulo"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="popup-header">
              <h3 id="popup-titulo">Remover da lista</h3>
            </div>
            <div className="popup-body">
              <p>
                Tem certeza que deseja remover o evento{" "}
                <strong>&quot;{eventoParaRemover.nomeEvento}&quot;</strong>?
              </p>
            </div>
            <div className="popup-actions">
              <button
                className="popup-btn popup-btn-cancelar"
                onClick={handleCancelarRemocao}
              >
                Cancelar
              </button>
              <button
                className="popup-btn popup-btn-remover"
                onClick={handleConfirmarRemocao}
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Historico;

