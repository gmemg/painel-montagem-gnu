import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Painel from "./components/Painel";
import Historico from "./components/Historico";
import "./App.css";

/**
 * Componente raiz de layout e rotas.
 * O Router fica aqui para que a navegação e o topo sejam persistentes
 * entre as telas de Painel e Histórico.
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
              <Link to="/" className="nav-link">
                Painel
              </Link>
              <Link to="/historico" className="nav-link">
                Histórico
              </Link>
            </div>
          </div>
        </nav>
        <main className="main-content">
          {/* Rotas separadas para manter cada tela isolada e simples */}
          <Routes>
            <Route path="/" element={<Painel />} />
            <Route path="/historico" element={<Historico />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
