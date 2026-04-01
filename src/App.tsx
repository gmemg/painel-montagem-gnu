import { BrowserRouter as Router, Routes, Route, NavLink } from "react-router-dom";
import Painel from "./components/Painel";
import Historico from "./components/Historico";
import InventarioMontagem from "./components/InventarioMontagem";
import "./App.css";

/**
 * Componente raiz de layout e rotas.
 * O Router fica aqui para que a navegaÃ§Ã£o e o topo sejam persistentes
 * entre as telas de Painel e HistÃ³rico.
 */
function App() {
  return (
    <Router>
      <div className="app">
        <nav className="navbar">
          <div className="nav-container">
            <div className="nav-title-wrapper">
              <img
                className="nav-logo"
                src="https://www.gnu.com.br/site/img/logo-gnu.svg"
                alt="Logo GNU"
              />
              <h1 className="nav-title">Painel de Montagem</h1>
            </div>
            <div className="nav-links">
              <NavLink to="/" className="nav-link">
                Painel
              </NavLink>
              <NavLink to="/historico" className="nav-link">
                HistÃ³rico
              </NavLink>
              <NavLink to="/inventario" className="nav-link">
                InventÃ¡rio
              </NavLink>
            </div>
          </div>
        </nav>
        <main className="main-content">
          {/* Rotas separadas para manter cada tela isolada e simples */}
          <Routes>
            <Route path="/" element={<Painel />} />
            <Route path="/historico" element={<Historico />} />
            <Route path="/inventario" element={<InventarioMontagem />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
