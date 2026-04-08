import { useCallback, useEffect, useMemo, useState } from "react";
import { Evento } from "../types";
import { getEventos, saveEventos, addToHistorico } from "../utils/storage";
import {
  getDiaSemana,
  formatDateTime,
  faltamDoisDiasOuMenos,
} from "../utils/dateUtils";
import FormularioEvento from "./FormularioEvento";
import "./Painel.css";

/**
 * Tela principal que lista eventos ativos e permite criar/editar/remover.
 * Centraliza a lógica de persistência no `localStorage` para manter a UI
 * simples e sem dependência de backend.
 */
const Painel = () => {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [eventoEditando, setEventoEditando] = useState<Evento | null>(null);
  const [eventoParaRemover, setEventoParaRemover] = useState<Evento | null>(
    null,
  );

  useEffect(() => {
    // Carrega apenas eventos ativos para reduzir ruído na tela principal.
    const eventosAtivos = getEventos().filter((e) => !e.removido);
    setEventos(eventosAtivos);
  }, []);

  const refreshEventosAtivos = useCallback(() => {
    setEventos(getEventos().filter((e) => !e.removido));
  }, []);

  /**
   * Abre o formulário em modo de criação.
   * O evento em edição é limpo para evitar preenchimento acidental.
   */
  const handleAdicionar = useCallback(() => {
    setEventoEditando(null);
    setMostrarFormulario(true);
  }, []);

  /**
   * Cria um evento fictício para testes rápidos de UI.
   * Útil para validação visual sem precisar preencher o formulário.
   */
  const handleAdicionarTeste = useCallback(() => {
    const nomesEvento = [
      "Montagem de palco",
      "Evento corporativo",
      "Workshop de treinamento",
      "Palestra técnica",
      "Show interno",
    ];
    const locais = [
      "Auditório Principal",
      "Sala 201",
      "Espaço Expo",
      "Centro de Convenções",
      "Sala Multiuso",
    ];
    const funcionarios = [
      "Ana Ribeiro",
      "Carlos Silva",
      "Mariana Lopes",
      "Rafael Lima",
      "Juliana Costa",
    ];
    const equipamentos = [
      "2 caixas de som, 1 mixer",
      "4 microfones, 1 projetor",
      "Iluminação básica, cabos",
      "Tela, notebook, HDMI",
      "Som ambiente, microfone sem fio",
    ];

    // Seletor simples para variação de dados sem dependências externas.
    const randomFrom = (lista: string[]) =>
      lista[Math.floor(Math.random() * lista.length)];
    const randomId = Date.now().toString();
    const randomDias = Math.floor(Math.random() * 10) + 1;
    const randomHoras = Math.floor(Math.random() * 10) + 8;
    const dataHora = new Date();
    dataHora.setDate(dataHora.getDate() + randomDias);
    dataHora.setHours(randomHoras, 0, 0, 0);

    const novoEvento: Evento = {
      id: randomId,
      nomeEvento: randomFrom(nomesEvento),
      adicionadoPor: randomFrom(funcionarios),
      dataHora: dataHora.toISOString(),
      diaSemana: getDiaSemana(dataHora.toISOString()),
      localEvento: randomFrom(locais),
      funcionarioPlantao: randomFrom(funcionarios),
      equipamentosNecessarios: randomFrom(equipamentos),
      numeroChamado: `CH-${dataHora.getFullYear()}-${Math.floor(Math.random() * 900 + 100)}`,
      removido: false,
      concluido: false,
    };

    const todosEventos = getEventos();
    saveEventos([...todosEventos, novoEvento]);
    refreshEventosAtivos();
  }, [refreshEventosAtivos]);

  /**
   * Abre o formulário preenchido para edição.
   *
   * @param evento Evento selecionado na tabela.
   */
  const handleEditar = useCallback((evento: Evento) => {
    setEventoEditando(evento);
    setMostrarFormulario(true);
  }, []);

  /**
   * Dispara o modal de confirmação antes da remoção.
   *
   * @param evento Evento alvo da remoção.
   */
  const handleRemover = useCallback((evento: Evento) => {
    setEventoParaRemover(evento);
  }, []);

  /**
   * Confirma a remoção lógica do evento, preservando histórico.
   * A remoção é "soft delete" para permitir auditoria na tela de histórico.
   */
  const handleConfirmarRemocao = useCallback(() => {
    if (!eventoParaRemover) return;

    const todosEventos = getEventos();
    const eventoAtualizado = {
      ...eventoParaRemover,
      removido: true,
      dataRemocao: new Date().toISOString(),
    };

    const eventosAtualizados = todosEventos.map((e) =>
      e.id === eventoParaRemover.id ? eventoAtualizado : e,
    );

    saveEventos(eventosAtualizados);
    addToHistorico(eventoAtualizado);

    setEventos(eventosAtualizados.filter((e) => !e.removido));
    setEventoParaRemover(null);
  }, [eventoParaRemover]);

  /**
   * Fecha o modal sem alterar dados.
   */
  const handleCancelarRemocao = useCallback(() => {
    setEventoParaRemover(null);
  }, []);

  useEffect(() => {
    if (!eventoParaRemover) return;

    // Atalhos de teclado para acessibilidade e operação mais rápida.
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
   * Marca um evento como concluído e o remove da lista ativa.
   * A conclusão também entra no histórico para rastreabilidade.
   *
   * @param evento Evento a concluir.
   */
  const handleConcluir = useCallback((evento: Evento) => {
    if (evento.concluido) return;

    const todosEventos = getEventos();
    const eventoAtualizado = {
      ...evento,
      concluido: true,
      removido: true,
      dataConclusao: new Date().toISOString(),
      dataRemocao: new Date().toISOString(),
    };

    const eventosAtualizados = todosEventos.map((e) =>
      e.id === evento.id ? eventoAtualizado : e,
    );

    saveEventos(eventosAtualizados);
    addToHistorico(eventoAtualizado);
    setEventos(eventosAtualizados.filter((e) => !e.removido));
  }, []);

  /**
   * Salva o evento vindo do formulário, criando ou atualizando.
   *
   * @param evento Evento já validado no formulário.
   */
  const handleSalvar = useCallback(
    (evento: Evento) => {
    const todosEventos = getEventos();

    if (eventoEditando) {
      const eventosAtualizados = todosEventos.map((e) =>
        e.id === evento.id ? evento : e,
      );
      saveEventos(eventosAtualizados);
    } else {
      const novoEvento = {
        ...evento,
        id: Date.now().toString(),
        removido: false,
        concluido: false,
      };
      saveEventos([...todosEventos, novoEvento]);
    }

    refreshEventosAtivos();
    setMostrarFormulario(false);
    setEventoEditando(null);
    },
    [eventoEditando, refreshEventosAtivos],
  );

  /**
   * Fecha o formulário sem persistir alterações.
   */
  const handleCancelar = useCallback(() => {
    setMostrarFormulario(false);
    setEventoEditando(null);
  }, []);

  const eventosView = useMemo(
    () =>
      eventos.map((evento) => ({
        ...evento,
        dataHoraFormatada: formatDateTime(evento.dataHora),
        diaSemanaFormatado: getDiaSemana(evento.dataHora),
        urgente: faltamDoisDiasOuMenos(evento.dataHora),
      })),
    [eventos],
  );

  return (
    <div className="painel">
      <div className="painel-header">
        <div className="painel-title">
          <h2>EVENTOS ATIVOS</h2>
          <span className="painel-stat">
            Eventos ativos: <strong>{eventos.length}</strong>
          </span>
        </div>
        <div className="painel-actions">
          <button className="btn-adicionar" onClick={handleAdicionar}>
            + Adicionar Evento
          </button>
          <button className="btn-teste" onClick={handleAdicionarTeste}>
            + Item de Teste
          </button>
        </div>
      </div>

      {mostrarFormulario && (
        <FormularioEvento
          evento={eventoEditando}
          onSalvar={handleSalvar}
          onCancelar={handleCancelar}
        />
      )}

      <div className="tabela-container">
        <table className="tabela-eventos">
          <thead>
            <tr>
              <th>Nome do Evento</th>
              <th>Adicionado por</th>
              <th>Data e Hora</th>
              <th>Dia da Semana</th>
              <th>Local do Evento</th>
              <th>Funcionário de Plantão</th>
              <th>Equipamentos Necessários</th>
              <th>Número do Chamado</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {eventosView.length === 0 ? (
              <tr>
                <td colSpan={9} className="empty-state">
                  Nenhum evento cadastrado. Clique em "Adicionar Evento" para
                  começar.
                </td>
              </tr>
            ) : (
              eventosView.map((evento) => (
                <tr
                  key={evento.id}
                  className={evento.urgente ? "linha-urgente" : undefined}
                >
                  <td>{evento.nomeEvento}</td>
                  <td>{evento.adicionadoPor || "-"}</td>
                  <td>{evento.dataHoraFormatada}</td>
                  <td>{evento.diaSemanaFormatado}</td>
                  <td>{evento.localEvento}</td>
                  <td>{evento.funcionarioPlantao}</td>
                  <td>{evento.equipamentosNecessarios}</td>
                  <td className="chamado-cell">{evento.numeroChamado}</td>
                  <td>
                    <div className="acoes-buttons">
                      <button
                        className="btn-editar"
                        onClick={() => handleEditar(evento)}
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button
                        className="btn-concluir"
                        onClick={() => handleConcluir(evento)}
                        title="Marcar como concluído"
                        disabled={evento.concluido}
                      >
                        {evento.concluido ? "Concluído" : "✅"}
                      </button>
                      <button
                        className="btn-remover"
                        onClick={() => handleRemover(evento)}
                        title="Remover"
                      >
                        🗑️
                      </button>
                    </div>
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

export default Painel;

