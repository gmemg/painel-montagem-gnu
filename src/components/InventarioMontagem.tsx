import { useEffect, useState } from "react";
import { InventarioItem } from "../types";
import { getInventario, saveInventario } from "../utils/storage";
import "./InventarioMontagem.css";

const itensPadrao: InventarioItem[] = [
  {
    id: "projetor",
    item: "Projetor",
    modelo: "",
    quantidade: "",
    patrimonio: "",
    localizacao: "",
    requerente: "",
    montadoPor: "",
  },
  {
    id: "notebook",
    item: "Notebook",
    modelo: "",
    quantidade: "",
    patrimonio: "",
    localizacao: "",
    requerente: "",
    montadoPor: "",
  },
  {
    id: "passador-slide",
    item: "Passador Slide",
    modelo: "",
    quantidade: "",
    patrimonio: "",
    localizacao: "",
    requerente: "",
    montadoPor: "",
  },
  {
    id: "microfone-mesa",
    item: "Microfone de Mesa",
    modelo: "",
    quantidade: "",
    patrimonio: "",
    localizacao: "",
    requerente: "",
    montadoPor: "",
  },
  {
    id: "jbl",
    item: "JBL",
    modelo: "",
    quantidade: "",
    patrimonio: "",
    localizacao: "",
    requerente: "",
    montadoPor: "",
  },
  {
    id: "pinpad",
    item: "Pinpad",
    modelo: "",
    quantidade: "",
    patrimonio: "",
    localizacao: "",
    requerente: "",
    montadoPor: "",
  },
  {
    id: "switch",
    item: "Switch",
    modelo: "",
    quantidade: "",
    patrimonio: "",
    localizacao: "",
    requerente: "",
    montadoPor: "",
  },
  {
    id: "cabo-rede",
    item: "Cabo de Rede",
    modelo: "",
    quantidade: "",
    patrimonio: "",
    localizacao: "",
    requerente: "",
    montadoPor: "",
  },
  {
    id: "totem",
    item: "Totem",
    modelo: "",
    quantidade: "",
    patrimonio: "",
    localizacao: "",
    requerente: "",
    montadoPor: "",
  },
  {
    id: "celular",
    item: "Celular",
    modelo: "",
    quantidade: "",
    patrimonio: "",
    localizacao: "",
    requerente: "",
    montadoPor: "",
  },
  {
    id: "camera",
    item: "Camera",
    modelo: "",
    quantidade: "",
    patrimonio: "",
    localizacao: "",
    requerente: "",
    montadoPor: "",
  },
  {
    id: "tripe",
    item: "Tripe",
    modelo: "",
    quantidade: "",
    patrimonio: "",
    localizacao: "",
    requerente: "",
    montadoPor: "",
  },
  {
    id: "regua",
    item: "Regua",
    modelo: "",
    quantidade: "",
    patrimonio: "",
    localizacao: "",
    requerente: "",
    montadoPor: "",
  },
  {
    id: "extensao",
    item: "Extensao",
    modelo: "",
    quantidade: "",
    patrimonio: "",
    localizacao: "",
    requerente: "",
    montadoPor: "",
  },
  {
    id: "monitor",
    item: "Monitor",
    modelo: "",
    quantidade: "",
    patrimonio: "",
    localizacao: "",
    requerente: "",
    montadoPor: "",
  },
  {
    id: "minidesk",
    item: "Minidesk",
    modelo: "",
    quantidade: "",
    patrimonio: "",
    localizacao: "",
    requerente: "",
    montadoPor: "",
  },
];

const InventarioMontagem = () => {
  const [itens, setItens] = useState<InventarioItem[]>([]);

  useEffect(() => {
    const inventarioSalvo = getInventario();
    if (inventarioSalvo.length > 0) {
      setItens(inventarioSalvo);
      return;
    }

    setItens(itensPadrao);
    saveInventario(itensPadrao);
  }, []);

  useEffect(() => {
    if (itens.length === 0) return;
    saveInventario(itens);
  }, [itens]);

  const handleChange = (
    id: string,
    campo: keyof Omit<InventarioItem, "id" | "item">,
    valor: string,
  ) => {
    setItens((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [campo]: valor } : item,
      ),
    );
  };

  return (
    <div className="inventario">
      <div className="inventario-header">
        <div>
          <h2>INVENTARIO DE MONTAGEM</h2>
          <p className="inventario-subtitle">
            Itens padrao com campos para preenchimento.
          </p>
        </div>
        <div className="inventario-info">
          Itens cadastrados: <strong>{itens.length}</strong>
        </div>
      </div>

      <div className="tabela-container">
        <table className="tabela-inventario">
          <thead>
            <tr>
              <th>Item</th>
              <th>Modelo</th>
              <th>Quantidade</th>
              <th>Patrimonio</th>
              <th>Localizacao</th>
              <th>Requerente</th>
              <th>Montado por</th>
            </tr>
          </thead>
          <tbody>
            {itens.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-state">
                  Nenhum item de inventario cadastrado.
                </td>
              </tr>
            ) : (
              itens.map((item) => (
                <tr key={item.id}>
                  <td className="item-label">{item.item}</td>
                  <td className="input-cell">
                    <input
                      type="text"
                      value={item.modelo}
                      onChange={(e) =>
                        handleChange(item.id, "modelo", e.target.value)
                      }
                      placeholder="Ex: Epson X3"
                    />
                  </td>
                  <td className="input-cell">
                    <input
                      type="number"
                      min="0"
                      value={item.quantidade}
                      onChange={(e) =>
                        handleChange(item.id, "quantidade", e.target.value)
                      }
                      placeholder="0"
                    />
                  </td>
                  <td className="input-cell">
                    <input
                      type="text"
                      value={item.patrimonio}
                      onChange={(e) =>
                        handleChange(item.id, "patrimonio", e.target.value)
                      }
                      placeholder="Ex: 000123"
                    />
                  </td>
                  <td className="input-cell">
                    <input
                      type="text"
                      value={item.localizacao}
                      onChange={(e) =>
                        handleChange(item.id, "localizacao", e.target.value)
                      }
                      placeholder="Ex: Sala 201"
                    />
                  </td>
                  <td className="input-cell">
                    <input
                      type="text"
                      value={item.requerente}
                      onChange={(e) =>
                        handleChange(item.id, "requerente", e.target.value)
                      }
                      placeholder="Ex: Ana Ribeiro"
                    />
                  </td>
                  <td className="input-cell">
                    <input
                      type="text"
                      value={item.montadoPor}
                      onChange={(e) =>
                        handleChange(item.id, "montadoPor", e.target.value)
                      }
                      placeholder="Ex: Carlos Silva"
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InventarioMontagem;
