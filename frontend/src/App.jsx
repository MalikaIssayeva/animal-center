import { useState } from "react";
import Home from "./components/Home";
import AddAnimal from "./components/AddAnimal";
import Classify from "./components/Classify";
import Analytics from "./components/Analytics";

export default function App() {
  const [activeTab, setActiveTab] = useState("home");

  return (
    <div className="app-shell">
      <header className="header">
        <div className="brand">
          <div className="brand-logo">🐾</div>
          <div>
            <h1>Центр защиты животных</h1>
            <p>Черновой вариант дипломного проекта</p>
          </div>
        </div>

        <button className="primary-btn" onClick={() => setActiveTab("add")}>
          + Добавить
        </button>
      </header>

      <nav className="tabs">
        <button
          className={`tab ${activeTab === "home" ? "active" : ""}`}
          onClick={() => setActiveTab("home")}
        >
          Главная
        </button>
        <button
          className={`tab ${activeTab === "add" ? "active" : ""}`}
          onClick={() => setActiveTab("add")}
        >
          Добавить
        </button>
        <button
          className={`tab ${activeTab === "classify" ? "active" : ""}`}
          onClick={() => setActiveTab("classify")}
        >
          Классификация
        </button>
        <button
          className={`tab ${activeTab === "analytics" ? "active" : ""}`}
          onClick={() => setActiveTab("analytics")}
        >
          Аналитика
        </button>
      </nav>

      <main>
        {activeTab === "home" && <Home />}
        {activeTab === "add" && (
          <AddAnimal onSuccess={() => setActiveTab("home")} />
        )}
        {activeTab === "classify" && <Classify />}
        {activeTab === "analytics" && <Analytics />}
      </main>
    </div>
  );
}
