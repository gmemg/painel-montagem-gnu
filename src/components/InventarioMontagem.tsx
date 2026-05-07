import { useEffect, useMemo, useRef, useState } from "react";
import {
  InventarioHistoricoEntry,
  InventarioItem,
  InventarioStatus,
  InventarioUnidade,
} from "../types";
import { getInventario, saveInventario } from "../utils/storage";
import "./InventarioMontagem.css";

const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const nowIso = () => new Date().toISOString();

const STATUS_OPTIONS: Array<{ value: InventarioStatus; label: string }> = [
  { value: "disponivel", label: "Disponível" },
  { value: "em_uso", label: "Em uso" },
  { value: "manutencao", label: "Manutenção" },
  { value: "reservado", label: "Reservado" },
];

const FIELD_LABELS: Record<
  keyof Omit<InventarioUnidade, "id" | "historico" | "updatedAt" | "status">,
  string
> = {
  modelo: "Modelo",
  patrimonio: "Patrimônio",
  localizacao: "Localização",
  requerente: "Requerente",
  montadoPor: "Montado por",
};

type SortOption = "manual" | "nome" | "quantidade" | "recentes";

type UndoState =
  | {
      kind: "item";
      item: InventarioItem;
      index: number;
      message: string;
    }
  | {
      kind: "unit";
      itemId: string;
      itemName: string;
      unidade: InventarioUnidade;
      index: number;
      message: string;
    }
  | null;

const createHistoricoEntry = (
  descricao: string,
  data = nowIso(),
): InventarioHistoricoEntry => ({
  id: createId(),
  data,
  descricao,
});

const addHistory = (
  unidade: InventarioUnidade,
  descricao: string,
  data = nowIso(),
): InventarioUnidade => ({
  ...unidade,
  updatedAt: data,
  historico: [createHistoricoEntry(descricao, data), ...unidade.historico].slice(
    0,
    25,
  ),
});

const createUnidade = (
  partial?: Partial<InventarioUnidade>,
  descricaoInicial = "Unidade cadastrada",
): InventarioUnidade => {
  const data = partial?.updatedAt ?? nowIso();
  const base: InventarioUnidade = {
    id: partial?.id ?? createId(),
    modelo: partial?.modelo ?? "",
    patrimonio: partial?.patrimonio ?? "",
    localizacao: partial?.localizacao ?? "",
    requerente: partial?.requerente ?? "",
    montadoPor: partial?.montadoPor ?? "",
    status: partial?.status ?? "disponivel",
    historico:
      partial?.historico && partial.historico.length > 0
        ? partial.historico
        : [createHistoricoEntry(descricaoInicial, data)],
    updatedAt: data,
  };

  return base;
};

const createItem = (
  nome: string,
  id = createId(),
  unidades = [createUnidade()],
): InventarioItem => ({
  id,
  item: nome,
  unidades,
  updatedAt: nowIso(),
});

const itensPadrao: InventarioItem[] = [
  createItem("Projetor", "projetor"),
  createItem("Notebook", "notebook"),
  createItem("Passador Slide", "passador-slide"),
  createItem("Microfone de Mesa", "microfone-mesa"),
  createItem("JBL", "jbl"),
  createItem("Pinpad", "pinpad"),
  createItem("Switch", "switch"),
  createItem("Cabo de Rede", "cabo-rede"),
  createItem("Totem", "totem"),
  createItem("Celular", "celular"),
  createItem("Câmera", "camera"),
  createItem("Tripé", "tripe"),
  createItem("Régua", "regua"),
  createItem("Extensão", "extensao"),
  createItem("Monitor", "monitor"),
  createItem("Minidesk", "minidesk"),
];

const normalizeInventario = (data: any[]): InventarioItem[] =>
  data.map((item) => {
    const itemData = item ?? {};
    let unidadesOriginais: any[] = [];

    if (Array.isArray(itemData.unidades)) {
      unidadesOriginais = itemData.unidades;
    } else {
      const quantidade = Number(itemData.quantidade);
      const totalUnidades =
        Number.isFinite(quantidade) && quantidade > 0 ? quantidade : 1;
      unidadesOriginais = Array.from({ length: totalUnidades }, () => ({
        modelo: itemData.modelo ?? "",
        patrimonio: itemData.patrimonio ?? "",
        localizacao: itemData.localizacao ?? "",
        requerente: itemData.requerente ?? "",
        montadoPor: itemData.montadoPor ?? "",
      }));
    }

    const unidades = unidadesOriginais.map((unidade) =>
      createUnidade(unidade, "Unidade migrada para o novo inventário"),
    );

    return {
      id: itemData.id ?? createId(),
      item: itemData.item ?? "Item",
      unidades,
      updatedAt:
        itemData.updatedAt ??
        unidades.reduce(
          (maisRecente, unidade) =>
            unidade.updatedAt > maisRecente ? unidade.updatedAt : maisRecente,
          nowIso(),
        ),
    };
  });

const reorderItens = (
  itens: InventarioItem[],
  fromId: string,
  toId: string,
): InventarioItem[] => {
  if (fromId === toId) return itens;

  const fromIndex = itens.findIndex((item) => item.id === fromId);
  const toIndex = itens.findIndex((item) => item.id === toId);

  if (fromIndex === -1 || toIndex === -1) return itens;

  const proximo = [...itens];
  const [movido] = proximo.splice(fromIndex, 1);
  proximo.splice(toIndex, 0, movido);
  return proximo;
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
};

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const InventarioMontagem = () => {
  const [itens, setItens] = useState<InventarioItem[]>([]);
  const [itensExpandidos, setItensExpandidos] = useState<
    Record<string, boolean>
  >({});
  const [mostrarFormularioItem, setMostrarFormularioItem] = useState(false);
  const [novoItemNome, setNovoItemNome] = useState("");
  const [itemParaRemover, setItemParaRemover] = useState<InventarioItem | null>(
    null,
  );
  const [itemEditandoId, setItemEditandoId] = useState<string | null>(null);
  const [nomeEmEdicao, setNomeEmEdicao] = useState("");
  const [itemArrastandoId, setItemArrastandoId] = useState<string | null>(null);
  const [itemHoverId, setItemHoverId] = useState<string | null>(null);
  const [undoState, setUndoState] = useState<UndoState>(null);
  const [historicoAberto, setHistoricoAberto] = useState<{
    itemNome: string;
    unidadeId: string;
  } | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("manual");
  const [search, setSearch] = useState("");
  const fieldStartValuesRef = useRef<Record<string, string>>({});

  useEffect(() => {
    const inventarioSalvo = getInventario();
    if (inventarioSalvo.length > 0) {
      const normalizado = normalizeInventario(inventarioSalvo);
      setItens(normalizado);
      saveInventario(normalizado);
      return;
    }

    setItens(itensPadrao);
    saveInventario(itensPadrao);
  }, []);

  useEffect(() => {
    if (itens.length === 0) return;
    const handle = window.setTimeout(() => {
      saveInventario(itens);
    }, 250);
    return () => {
      window.clearTimeout(handle);
    };
  }, [itens]);

  useEffect(() => {
    if (!undoState) return;
    const handle = window.setTimeout(() => {
      setUndoState(null);
    }, 8000);
    return () => window.clearTimeout(handle);
  }, [undoState]);

  const totalUnidades = useMemo(
    () => itens.reduce((acc, item) => acc + item.unidades.length, 0),
    [itens],
  );

  const statusTotals = useMemo(() => {
    const totals: Record<InventarioStatus, number> = {
      disponivel: 0,
      em_uso: 0,
      manutencao: 0,
      reservado: 0,
    };

    itens.forEach((item) => {
      item.unidades.forEach((unidade) => {
        totals[unidade.status] += 1;
      });
    });

    return totals;
  }, [itens]);

  const itensFiltrados = useMemo(() => {
    const termo = normalizeText(search.trim());
    const base =
      termo.length === 0
        ? itens
        : itens.filter((item) => {
            const statusText = item.unidades
              .map(
                (unidade) =>
                  STATUS_OPTIONS.find((opt) => opt.value === unidade.status)
                    ?.label ?? "",
              )
              .join(" ");
            const haystack = normalizeText(
              [
                item.item,
                statusText,
                ...item.unidades.flatMap((unidade) => [
                  unidade.modelo,
                  unidade.patrimonio,
                  unidade.localizacao,
                  unidade.requerente,
                  unidade.montadoPor,
                ]),
              ].join(" "),
            );
            return haystack.includes(termo);
          });

    if (sortBy === "manual") return base;

    const lista = [...base];
    if (sortBy === "nome") {
      lista.sort((a, b) => a.item.localeCompare(b.item, "pt-BR"));
    }
    if (sortBy === "quantidade") {
      lista.sort((a, b) => b.unidades.length - a.unidades.length);
    }
    if (sortBy === "recentes") {
      lista.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }
    return lista;
  }, [itens, search, sortBy]);

  const unidadeHistoricoAberto = useMemo(() => {
    if (!historicoAberto) return null;
    for (const item of itens) {
      const unidade = item.unidades.find(
        (candidate) => candidate.id === historicoAberto.unidadeId,
      );
      if (unidade) {
        return {
          itemNome: historicoAberto.itemNome,
          unidade,
        };
      }
    }
    return null;
  }, [historicoAberto, itens]);

  const toggleItem = (id: string) => {
    setItensExpandidos((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const markFieldStartValue = (
    itemId: string,
    unidadeId: string,
    campo: keyof typeof FIELD_LABELS,
    valor: string,
  ) => {
    fieldStartValuesRef.current[`${itemId}:${unidadeId}:${campo}`] = valor;
  };

  const focusNextEditor = (current: HTMLElement) => {
    const inputs = Array.from(
      document.querySelectorAll<HTMLElement>(".unit-editor"),
    ).filter((element) => !element.hasAttribute("disabled"));
    const index = inputs.indexOf(current);
    if (index >= 0 && index < inputs.length - 1) {
      inputs[index + 1].focus();
      if ("select" in inputs[index + 1] || "value" in inputs[index + 1]) {
        const candidate = inputs[index + 1] as HTMLInputElement;
        candidate.select?.();
      }
    }
  };

  const appendHistorico = (
    itemId: string,
    unidadeId: string,
    descricao: string,
  ) => {
    const data = nowIso();
    setItens((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;

        const unidades = item.unidades.map((unidade) =>
          unidade.id === unidadeId ? addHistory(unidade, descricao, data) : unidade,
        );

        return {
          ...item,
          unidades,
          updatedAt: data,
        };
      }),
    );
  };

  const handleUnitChange = (
    itemId: string,
    unidadeId: string,
    campo: keyof Omit<InventarioUnidade, "id" | "historico" | "updatedAt">,
    valor: string,
  ) => {
    const data = nowIso();
    setItens((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              updatedAt: data,
              unidades: item.unidades.map((unidade) =>
                unidade.id === unidadeId
                  ? {
                      ...unidade,
                      [campo]:
                        campo === "status" ? (valor as InventarioStatus) : valor,
                      updatedAt: data,
                    }
                  : unidade,
              ),
            }
          : item,
      ),
    );
  };

  const handleUnitBlur = (
    itemId: string,
    unidadeId: string,
    campo: keyof typeof FIELD_LABELS,
    valorAtual: string,
  ) => {
    const key = `${itemId}:${unidadeId}:${campo}`;
    const valorInicial = fieldStartValuesRef.current[key];
    delete fieldStartValuesRef.current[key];

    if (valorInicial === undefined || valorInicial === valorAtual) return;

    appendHistorico(
      itemId,
      unidadeId,
      `${FIELD_LABELS[campo]} alterado para "${valorAtual || "vazio"}"`,
    );
  };

  const handleStatusChange = (
    itemId: string,
    unidadeId: string,
    status: InventarioStatus,
  ) => {
    const statusLabel =
      STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
    handleUnitChange(itemId, unidadeId, "status", status);
    appendHistorico(itemId, unidadeId, `Status alterado para ${statusLabel}`);
  };

  const handleAddUnit = (itemId: string) => {
    const novaUnidade = createUnidade(undefined, "Unidade adicionada ao inventário");
    setItens((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              updatedAt: nowIso(),
              unidades: [...item.unidades, novaUnidade],
            }
          : item,
      ),
    );
    setItensExpandidos((prev) => ({ ...prev, [itemId]: true }));
  };

  const handleRemoveUnit = (itemId: string, unidadeId: string) => {
    const item = itens.find((candidate) => candidate.id === itemId);
    if (!item) return;
    const index = item.unidades.findIndex((unidade) => unidade.id === unidadeId);
    const unidade = item.unidades[index];
    if (!unidade) return;

    setItens((prev) =>
      prev.map((candidate) =>
        candidate.id === itemId
          ? {
              ...candidate,
              updatedAt: nowIso(),
              unidades: candidate.unidades.filter(
                (current) => current.id !== unidadeId,
              ),
            }
          : candidate,
      ),
    );

    setUndoState({
      kind: "unit",
      itemId,
      itemName: item.item,
      unidade,
      index,
      message: `Unidade removida de ${item.item}.`,
    });
  };

  const handleAbrirFormularioItem = () => {
    setMostrarFormularioItem(true);
  };

  const handleCancelarItem = () => {
    setMostrarFormularioItem(false);
    setNovoItemNome("");
  };

  const handleSalvarItem = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const nome = novoItemNome.trim();
    if (!nome) return;

    const novoItem = createItem(nome);
    setItens((prev) => [...prev, novoItem]);
    setItensExpandidos((prev) => ({ ...prev, [novoItem.id]: true }));
    setNovoItemNome("");
    setMostrarFormularioItem(false);
  };

  const handlePedirRemocaoItem = (itemId: string) => {
    const alvo = itens.find((item) => item.id === itemId);
    if (!alvo) return;
    setItemParaRemover(alvo);
  };

  const handleIniciarEdicaoItem = (item: InventarioItem) => {
    setItemEditandoId(item.id);
    setNomeEmEdicao(item.item);
  };

  const handleCancelarEdicaoItem = () => {
    setItemEditandoId(null);
    setNomeEmEdicao("");
  };

  const handleSalvarEdicaoItem = (itemId: string) => {
    const nome = nomeEmEdicao.trim();
    if (!nome) return;

    setItens((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              item: nome,
              updatedAt: nowIso(),
            }
          : item,
      ),
    );
    handleCancelarEdicaoItem();
  };

  const handleCancelarRemocaoItem = () => {
    setItemParaRemover(null);
  };

  const handleConfirmarRemocaoItem = () => {
    if (!itemParaRemover) return;
    const id = itemParaRemover.id;
    const index = itens.findIndex((item) => item.id === id);

    setItens((prev) => prev.filter((item) => item.id !== id));
    setItensExpandidos((prev) => {
      const proximo = { ...prev };
      delete proximo[id];
      return proximo;
    });
    setUndoState({
      kind: "item",
      item: itemParaRemover,
      index,
      message: `Item ${itemParaRemover.item} removido.`,
    });
    setItemParaRemover(null);
  };

  const handleUndoRemove = () => {
    if (!undoState) return;

    if (undoState.kind === "item") {
      const restaurado: InventarioItem = {
        ...undoState.item,
        updatedAt: nowIso(),
        unidades: undoState.item.unidades.map((unidade) =>
          addHistory(unidade, "Item restaurado após remoção"),
        ),
      };

      setItens((prev) => {
        const proximo = [...prev];
        proximo.splice(undoState.index, 0, restaurado);
        return proximo;
      });
      setItensExpandidos((prev) => ({ ...prev, [restaurado.id]: true }));
    }

    if (undoState.kind === "unit") {
      const restaurada = addHistory(
        undoState.unidade,
        "Unidade restaurada após remoção",
      );
      setItens((prev) =>
        prev.map((item) => {
          if (item.id !== undoState.itemId) return item;
          const unidades = [...item.unidades];
          unidades.splice(undoState.index, 0, restaurada);
          return {
            ...item,
            unidades,
            updatedAt: nowIso(),
          };
        }),
      );
      setItensExpandidos((prev) => ({ ...prev, [undoState.itemId]: true }));
    }

    setUndoState(null);
  };

  const handleDragStart = (itemId: string) => {
    if (sortBy !== "manual") return;
    setItemArrastandoId(itemId);
    setItemHoverId(itemId);
  };

  const handleDragEnter = (itemId: string) => {
    if (!itemArrastandoId || itemArrastandoId === itemId) return;
    setItemHoverId(itemId);
  };

  const handleDrop = (itemId: string) => {
    if (!itemArrastandoId || sortBy !== "manual") return;
    setItens((prev) => reorderItens(prev, itemArrastandoId, itemId));
    setItemArrastandoId(null);
    setItemHoverId(null);
  };

  const handleDragEnd = () => {
    setItemArrastandoId(null);
    setItemHoverId(null);
  };

  return (
    <div className="inventario">
      <div className="inventario-header">
        <div className="inventario-title">
          <h2>INVENTÁRIO DE MONTAGEM</h2>
          <div className="inventario-stats">
            <span className="inventario-stat">
              Itens cadastrados: <strong>{itens.length}</strong>
            </span>
            <span className="inventario-stat">
              Unidades: <strong>{totalUnidades}</strong>
            </span>
            <span className="inventario-stat">
              Disponíveis: <strong>{statusTotals.disponivel}</strong>
            </span>
            <span className="inventario-stat">
              Em uso: <strong>{statusTotals.em_uso}</strong>
            </span>
          </div>
        </div>
        <div className="inventario-actions">
          <button
            type="button"
            className="btn-add-item"
            onClick={handleAbrirFormularioItem}
          >
            + Adicionar item
          </button>
        </div>
      </div>

      <div className="inventario-toolbar">
        <div className="inventario-toolbar-field inventario-toolbar-search">
          <label htmlFor="inventario-busca">Buscar</label>
          <input
            id="inventario-busca"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Item, patrimônio, localização..."
          />
        </div>
        <div className="inventario-toolbar-field inventario-toolbar-sort">
          <label htmlFor="inventario-ordem">Ordenação</label>
          <select
            id="inventario-ordem"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
          >
            <option value="manual">Manual</option>
            <option value="nome">Nome</option>
            <option value="quantidade">Qtd. unidades</option>
            <option value="recentes">Última edição</option>
          </select>
        </div>
      </div>

      {mostrarFormularioItem && (
        <div
          className="inventario-modal-overlay"
          role="presentation"
          onClick={handleCancelarItem}
        >
          <div
            className="inventario-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="novo-item-titulo"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="inventario-modal-header">
              <h3 id="novo-item-titulo">Cadastrar novo item</h3>
            </div>
            <form className="inventario-form" onSubmit={handleSalvarItem}>
              <div className="inventario-form-field">
                <label htmlFor="novo-item">Nome do item</label>
                <input
                  id="novo-item"
                  type="text"
                  value={novoItemNome}
                  onChange={(e) => setNovoItemNome(e.target.value)}
                  required
                />
              </div>
              <div className="inventario-form-actions">
                <button
                  type="button"
                  className="btn-cancelar-item"
                  onClick={handleCancelarItem}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-salvar-item">
                  Salvar item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {itemParaRemover && (
        <div
          className="inventario-modal-overlay"
          role="presentation"
          onClick={handleCancelarRemocaoItem}
        >
          <div
            className="inventario-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="remover-item-titulo"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="inventario-modal-header">
              <h3 id="remover-item-titulo">Remover item</h3>
            </div>
            <div className="inventario-modal-body">
              Tem certeza que deseja remover o item{" "}
              <strong>&quot;{itemParaRemover.item}&quot;</strong> e todas as
              unidades?
            </div>
            <div className="inventario-form-actions">
              <button
                type="button"
                className="btn-cancelar-item"
                onClick={handleCancelarRemocaoItem}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-remover-item-confirmar"
                onClick={handleConfirmarRemocaoItem}
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}

      {unidadeHistoricoAberto && (
        <div
          className="inventario-modal-overlay"
          role="presentation"
          onClick={() => setHistoricoAberto(null)}
        >
          <div
            className="inventario-modal inventario-history-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="historico-unidade-titulo"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="inventario-modal-header">
              <h3 id="historico-unidade-titulo">
                Histórico - {unidadeHistoricoAberto.itemNome}
              </h3>
            </div>
            <div className="inventario-history-list">
              {unidadeHistoricoAberto.unidade.historico.map((entry) => (
                <div key={entry.id} className="inventario-history-entry">
                  <span className="inventario-history-date">
                    {formatDateTime(entry.data)}
                  </span>
                  <span className="inventario-history-description">
                    {entry.descricao}
                  </span>
                </div>
              ))}
            </div>
            <div className="inventario-form-actions">
              <button
                type="button"
                className="btn-cancelar-item"
                onClick={() => setHistoricoAberto(null)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {undoState && (
        <div className="inventario-toast" role="status" aria-live="polite">
          <span>{undoState.message}</span>
          <button type="button" onClick={handleUndoRemove}>
            Desfazer
          </button>
        </div>
      )}

      <div className="inventario-list">
        {itensFiltrados.map((item) => {
          const aberto = itensExpandidos[item.id] ?? false;
          const estaEditando = itemEditandoId === item.id;
          const estaArrastando = itemArrastandoId === item.id;
          const estaHover =
            itemHoverId === item.id && itemArrastandoId !== item.id;
          const statusResumo = STATUS_OPTIONS.map((option) => ({
            ...option,
            total: item.unidades.filter(
              (unidade) => unidade.status === option.value,
            ).length,
          })).filter((entry) => entry.total > 0);

          return (
            <section
              className={`inventario-card ${
                estaArrastando ? "is-dragging" : ""
              } ${estaHover ? "is-drag-over" : ""}`}
              key={item.id}
              draggable={!estaEditando && sortBy === "manual"}
              onDragStart={() => handleDragStart(item.id)}
              onDragEnter={() => handleDragEnter(item.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(item.id)}
              onDragEnd={handleDragEnd}
            >
              <div
                className="inventario-card-header"
                role="button"
                tabIndex={0}
                onMouseDown={(e) => {
                  if (estaEditando) return;
                  if (e.button !== 0) return;
                  e.preventDefault();
                  toggleItem(item.id);
                }}
                onTouchStart={(e) => {
                  if (estaEditando) return;
                  e.preventDefault();
                  toggleItem(item.id);
                }}
                onKeyDown={(e) => {
                  if (estaEditando) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleItem(item.id);
                  }
                }}
              >
                <div className="inventario-card-title">
                  {estaEditando ? (
                    <div
                      className="inventario-item-edit"
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        className="inventario-item-edit-input"
                        value={nomeEmEdicao}
                        onChange={(e) => setNomeEmEdicao(e.target.value)}
                        onKeyDown={(e) => {
                          if (
                            e.key === "Enter" ||
                            (e.key === "s" && (e.ctrlKey || e.metaKey))
                          ) {
                            e.preventDefault();
                            handleSalvarEdicaoItem(item.id);
                          }
                          if (e.key === "Escape") {
                            e.preventDefault();
                            handleCancelarEdicaoItem();
                          }
                        }}
                        autoFocus
                      />
                      <div className="inventario-item-edit-actions">
                        <button
                          type="button"
                          className="btn-salvar-edicao-item"
                          onClick={() => handleSalvarEdicaoItem(item.id)}
                        >
                          Salvar
                        </button>
                        <button
                          type="button"
                          className="btn-cancelar-edicao-item"
                          onClick={handleCancelarEdicaoItem}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="inventario-item-name">{item.item}</span>
                      <div className="inventario-card-meta">
                        <span className="inventario-item-count">
                          {item.unidades.length} unidades
                        </span>
                        {statusResumo.map((entry) => (
                          <span
                            key={entry.value}
                            className={`status-badge status-${entry.value}`}
                          >
                            {entry.label}: {entry.total}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <div className="inventario-card-buttons">
                  <button
                    type="button"
                    className={`btn-drag-item ${
                      sortBy !== "manual" ? "is-disabled" : ""
                    }`}
                    title="Arrastar item"
                    aria-label="Arrastar item"
                    disabled={sortBy !== "manual"}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                  >
                    ::
                  </button>
                  <button
                    type="button"
                    className="btn-editar-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleIniciarEdicaoItem(item);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn-add-unit-header"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddUnit(item.id);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                  >
                    + Unidade
                  </button>
                  <button
                    type="button"
                    className="btn-remover-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePedirRemocaoItem(item.id);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                  >
                    Remover
                  </button>
                </div>
              </div>

              <div
                className={`inventario-card-body ${
                  aberto ? "is-open" : "is-closed"
                }`}
                aria-hidden={!aberto}
              >
                <div className="inventario-card-inner">
                  <div className="tabela-container">
                    <table className="tabela-unidades">
                      <thead>
                        <tr>
                          <th>Status</th>
                          <th>Modelo</th>
                          <th>Patrimônio</th>
                          <th>Localização</th>
                          <th>Requerente</th>
                          <th>Montado por</th>
                          <th>Atualizado</th>
                          <th>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.unidades.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="empty-state">
                              Nenhuma unidade cadastrada.
                            </td>
                          </tr>
                        ) : (
                          item.unidades.map((unidade) => (
                            <tr key={unidade.id}>
                              <td data-label="Status" className="status-cell">
                                <span
                                  className={`status-badge status-${unidade.status}`}
                                >
                                  {
                                    STATUS_OPTIONS.find(
                                      (option) => option.value === unidade.status,
                                    )?.label
                                  }
                                </span>
                                <select
                                  className="unit-editor status-select"
                                  value={unidade.status}
                                  onChange={(e) =>
                                    handleStatusChange(
                                      item.id,
                                      unidade.id,
                                      e.target.value as InventarioStatus,
                                    )
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      focusNextEditor(e.currentTarget);
                                    }
                                  }}
                                >
                                  {STATUS_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td data-label="Modelo" className="input-cell">
                                <input
                                  className="unit-editor"
                                  type="text"
                                  value={unidade.modelo}
                                  onFocus={() =>
                                    markFieldStartValue(
                                      item.id,
                                      unidade.id,
                                      "modelo",
                                      unidade.modelo,
                                    )
                                  }
                                  onBlur={() =>
                                    handleUnitBlur(
                                      item.id,
                                      unidade.id,
                                      "modelo",
                                      unidade.modelo,
                                    )
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      focusNextEditor(e.currentTarget);
                                    }
                                  }}
                                  onChange={(e) =>
                                    handleUnitChange(
                                      item.id,
                                      unidade.id,
                                      "modelo",
                                      e.target.value,
                                    )
                                  }
                                />
                              </td>
                              <td data-label="Patrimônio" className="input-cell">
                                <input
                                  className="unit-editor"
                                  type="text"
                                  value={unidade.patrimonio}
                                  onFocus={() =>
                                    markFieldStartValue(
                                      item.id,
                                      unidade.id,
                                      "patrimonio",
                                      unidade.patrimonio,
                                    )
                                  }
                                  onBlur={() =>
                                    handleUnitBlur(
                                      item.id,
                                      unidade.id,
                                      "patrimonio",
                                      unidade.patrimonio,
                                    )
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      focusNextEditor(e.currentTarget);
                                    }
                                  }}
                                  onChange={(e) =>
                                    handleUnitChange(
                                      item.id,
                                      unidade.id,
                                      "patrimonio",
                                      e.target.value,
                                    )
                                  }
                                />
                              </td>
                              <td data-label="Localização" className="input-cell">
                                <input
                                  className="unit-editor"
                                  type="text"
                                  value={unidade.localizacao}
                                  onFocus={() =>
                                    markFieldStartValue(
                                      item.id,
                                      unidade.id,
                                      "localizacao",
                                      unidade.localizacao,
                                    )
                                  }
                                  onBlur={() =>
                                    handleUnitBlur(
                                      item.id,
                                      unidade.id,
                                      "localizacao",
                                      unidade.localizacao,
                                    )
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      focusNextEditor(e.currentTarget);
                                    }
                                  }}
                                  onChange={(e) =>
                                    handleUnitChange(
                                      item.id,
                                      unidade.id,
                                      "localizacao",
                                      e.target.value,
                                    )
                                  }
                                />
                              </td>
                              <td data-label="Requerente" className="input-cell">
                                <input
                                  className="unit-editor"
                                  type="text"
                                  value={unidade.requerente}
                                  onFocus={() =>
                                    markFieldStartValue(
                                      item.id,
                                      unidade.id,
                                      "requerente",
                                      unidade.requerente,
                                    )
                                  }
                                  onBlur={() =>
                                    handleUnitBlur(
                                      item.id,
                                      unidade.id,
                                      "requerente",
                                      unidade.requerente,
                                    )
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      focusNextEditor(e.currentTarget);
                                    }
                                  }}
                                  onChange={(e) =>
                                    handleUnitChange(
                                      item.id,
                                      unidade.id,
                                      "requerente",
                                      e.target.value,
                                    )
                                  }
                                />
                              </td>
                              <td data-label="Montado por" className="input-cell">
                                <input
                                  className="unit-editor"
                                  type="text"
                                  value={unidade.montadoPor}
                                  onFocus={() =>
                                    markFieldStartValue(
                                      item.id,
                                      unidade.id,
                                      "montadoPor",
                                      unidade.montadoPor,
                                    )
                                  }
                                  onBlur={() =>
                                    handleUnitBlur(
                                      item.id,
                                      unidade.id,
                                      "montadoPor",
                                      unidade.montadoPor,
                                    )
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      focusNextEditor(e.currentTarget);
                                    }
                                  }}
                                  onChange={(e) =>
                                    handleUnitChange(
                                      item.id,
                                      unidade.id,
                                      "montadoPor",
                                      e.target.value,
                                    )
                                  }
                                />
                              </td>
                              <td data-label="Atualizado" className="updated-cell">
                                {formatDateTime(unidade.updatedAt)}
                              </td>
                              <td data-label="Ações" className="acoes-cell">
                                <button
                                  type="button"
                                  className="btn-historico-unidade"
                                  onClick={() =>
                                    setHistoricoAberto({
                                      itemNome: item.item,
                                      unidadeId: unidade.id,
                                    })
                                  }
                                >
                                  Histórico
                                </button>
                                <button
                                  type="button"
                                  className="btn-remover-unidade"
                                  onClick={() =>
                                    handleRemoveUnit(item.id, unidade.id)
                                  }
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
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default InventarioMontagem;
