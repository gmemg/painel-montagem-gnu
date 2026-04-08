import { useEffect, useMemo, useState } from "react";
import { InventarioItem, InventarioUnidade } from "../types";
import { getInventario, saveInventario } from "../utils/storage";
import "./InventarioMontagem.css";

const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const createUnidade = (): InventarioUnidade => ({
  id: createId(),
  modelo: "",
  patrimonio: "",
  localizacao: "",
  requerente: "",
  montadoPor: "",
});

const itensPadrao: InventarioItem[] = [
  { id: "projetor", item: "Projetor", unidades: [createUnidade()] },
  { id: "notebook", item: "Notebook", unidades: [createUnidade()] },
  { id: "passador-slide", item: "Passador Slide", unidades: [createUnidade()] },
  {
    id: "microfone-mesa",
    item: "Microfone de Mesa",
    unidades: [createUnidade()],
  },
  { id: "jbl", item: "JBL", unidades: [createUnidade()] },
  { id: "pinpad", item: "Pinpad", unidades: [createUnidade()] },
  { id: "switch", item: "Switch", unidades: [createUnidade()] },
  { id: "cabo-rede", item: "Cabo de Rede", unidades: [createUnidade()] },
  { id: "totem", item: "Totem", unidades: [createUnidade()] },
  { id: "celular", item: "Celular", unidades: [createUnidade()] },
  { id: "camera", item: "Câmera", unidades: [createUnidade()] },
  { id: "tripe", item: "Tripé", unidades: [createUnidade()] },
  { id: "regua", item: "Régua", unidades: [createUnidade()] },
  { id: "extensao", item: "Extensão", unidades: [createUnidade()] },
  { id: "monitor", item: "Monitor", unidades: [createUnidade()] },
  { id: "minidesk", item: "Minidesk", unidades: [createUnidade()] },
];

const normalizeInventario = (
  data: InventarioItem[] | any[],
): InventarioItem[] => {
  return data.map((item) => {
    if (Array.isArray(item?.unidades)) {
      return item as InventarioItem;
    }

    const quantidade = Number(item?.quantidade);
    const totalUnidades =
      Number.isFinite(quantidade) && quantidade > 0 ? quantidade : 1;
    const unidades = Array.from({ length: totalUnidades }, () => ({
      id: createId(),
      modelo: item?.modelo ?? "",
      patrimonio: item?.patrimonio ?? "",
      localizacao: item?.localizacao ?? "",
      requerente: item?.requerente ?? "",
      montadoPor: item?.montadoPor ?? "",
    }));

    return {
      id: item?.id ?? createId(),
      item: item?.item ?? "Item",
      unidades,
    };
  });
};

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

  const totalUnidades = useMemo(
    () => itens.reduce((acc, item) => acc + item.unidades.length, 0),
    [itens],
  );

  const toggleItem = (id: string) => {
    setItensExpandidos((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleUnitChange = (
    itemId: string,
    unidadeId: string,
    campo: keyof Omit<InventarioUnidade, "id">,
    valor: string,
  ) => {
    setItens((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              unidades: item.unidades.map((unidade) =>
                unidade.id === unidadeId
                  ? { ...unidade, [campo]: valor }
                  : unidade,
              ),
            }
          : item,
      ),
    );
  };

  const handleAddUnit = (itemId: string) => {
    setItens((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, unidades: [...item.unidades, createUnidade()] }
          : item,
      ),
    );
    setItensExpandidos((prev) => ({ ...prev, [itemId]: true }));
  };

  const handleRemoveUnit = (itemId: string, unidadeId: string) => {
    setItens((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              unidades: item.unidades.filter(
                (unidade) => unidade.id !== unidadeId,
              ),
            }
          : item,
      ),
    );
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

    const novoItem: InventarioItem = {
      id: createId(),
      item: nome,
      unidades: [createUnidade()],
    };

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

  const handleCancelarRemocaoItem = () => {
    setItemParaRemover(null);
  };

  const handleConfirmarRemocaoItem = () => {
    if (!itemParaRemover) return;
    const id = itemParaRemover.id;
    setItens((prev) => prev.filter((item) => item.id !== id));
    setItensExpandidos((prev) => {
      const proximo = { ...prev };
      delete proximo[id];
      return proximo;
    });
    setItemParaRemover(null);
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

      <div className="inventario-list">
        {itens.map((item) => {
          const aberto = itensExpandidos[item.id] ?? true;
          return (
            <section className="inventario-card" key={item.id}>
              <div
                className="inventario-card-header"
                role="button"
                tabIndex={0}
                onMouseDown={(e) => {
                  if (e.button !== 0) return;
                  e.preventDefault();
                  toggleItem(item.id);
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  toggleItem(item.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleItem(item.id);
                  }
                }}
              >
                <div className="inventario-card-title">
                  <span className="inventario-item-name">{item.item}</span>
                  <span className="inventario-item-count">
                    {item.unidades.length} unidades
                  </span>
                </div>
                <div className="inventario-card-buttons">
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
                    Remover item
                  </button>
                  <button
                    type="button"
                    className="btn-toggle"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleItem(item.id);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    aria-expanded={aberto}
                    aria-label={aberto ? "Fechar unidades" : "Abrir unidades"}
                  >
                    {aberto ? "−" : "+"}
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
                          <th>Modelo</th>
                          <th>Patrimônio</th>
                          <th>Localização</th>
                          <th>Requerente</th>
                          <th>Montado por</th>
                          <th>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.unidades.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="empty-state">
                              Nenhuma unidade cadastrada.
                            </td>
                          </tr>
                        ) : (
                          item.unidades.map((unidade) => (
                            <tr key={unidade.id}>
                              <td className="input-cell">
                                <input
                                  type="text"
                                  value={unidade.modelo}
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
                              <td className="input-cell">
                                <input
                                  type="text"
                                  value={unidade.patrimonio}
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
                              <td className="input-cell">
                                <input
                                  type="text"
                                  value={unidade.localizacao}
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
                              <td className="input-cell">
                                <input
                                  type="text"
                                  value={unidade.requerente}
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
                              <td className="input-cell">
                                <input
                                  type="text"
                                  value={unidade.montadoPor}
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
                              <td className="acoes-cell">
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
