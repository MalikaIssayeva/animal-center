import { useState, useEffect } from "react";
import Home from "./components/Home";
import AddAnimal from "./components/AddAnimal";
import Analytics from "./components/Analytics";
import Classify from "./components/Classify";
import Login from "./components/Login";
import Register from "./components/Register";

export default function App() {
  const [page, setPage] = useState("home");
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      setUser(JSON.parse(stored));
    }
  }, []);

  const handleLogin = (loggedUser) => {
    setUser(loggedUser);
    setPage("home");
  };

  const handleRegisterSuccess = () => {
    setPage("login");
  };

  const logout = () => {
    localStorage.removeItem("user");
    setUser(null);
    setPage("home");
  };

  return (
    <div className="app-shell">
      <header className="header">
        <div className="brand">
          <div className="brand-logo">🐾</div>
          <div>
            <h1>Animal Center</h1>
            <p>Сервис помощи и усыновления животных</p>
          </div>
        </div>

        <nav className="header-actions">
          <button className="secondary-btn" onClick={() => setPage("home")}>
            Главная
          </button>

          <button className="secondary-btn" onClick={() => setPage("add")}>
            Добавить
          </button>

          <button className="secondary-btn" onClick={() => setPage("classify")}>
            Классификация
          </button>

          <button
            className="secondary-btn"
            onClick={() => setPage("analytics")}
          >
            Аналитика
          </button>

          {!user && (
            <>
              <button
                className="secondary-btn"
                onClick={() => setPage("login")}
              >
                Войти
              </button>
              <button
                className="primary-btn"
                onClick={() => setPage("register")}
              >
                Регистрация
              </button>
            </>
          )}

          {user && (
            <div className="user-box">
              <span className="user-pill">
                👤 {user.name}{" "}
                {user.role === "admin"
                  ? "(admin)"
                  : user.accountType === "owner"
                    ? "(хозяин)"
                    : "(усыновитель)"}
              </span>

              <button className="primary-btn" onClick={logout}>
                Выйти
              </button>
            </div>
          )}
        </nav>
      </header>

      <main className="page-content">
        {page === "home" && <Home user={user} />}
        {page === "add" && <AddAnimal />}
        {page === "classify" && <Classify />}
        {page === "analytics" && <Analytics />}
        {page === "login" && <Login onLogin={handleLogin} />}
        {page === "register" && (
          <Register onRegisterSuccess={handleRegisterSuccess} />
        )}
      </main>
    </div>
  );
}
