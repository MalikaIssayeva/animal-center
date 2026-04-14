import { useEffect, useState } from "react";
import { request } from "../api";

export default function Home({ user }) {
  const [animals, setAnimals] = useState([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("Все");
  const [sort, setSort] = useState("newest");

  const loadAnimals = async () => {
    try {
      const query = new URLSearchParams();

      if (search) query.set("search", search);
      if (type !== "Все") query.set("type", type);
      if (sort && sort !== "newest") query.set("sort", sort);

      const data = await request(`/animals?${query.toString()}`);
      setAnimals(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadAnimals();
  }, []);

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    await loadAnimals();
  };

  const handleDelete = async (id, name) => {
    const confirmed = window.confirm(`Удалить животное "${name}"?`);
    if (!confirmed) return;

    try {
      await request(`/animals/${id}`, {
        method: "DELETE",
      });

      setAnimals((prev) => prev.filter((animal) => animal.id !== id));
    } catch (error) {
      console.error(error);
      alert("Не удалось удалить животное");
    }
  };

  const adopted = animals.filter((a) => a.status === "adopted").length;
  const treatment = animals.filter(
    (a) => a.status === "treatment" || a.health?.toLowerCase().includes("леч"),
  ).length;

  return (
    <section>
      <div className="hero">
        <h2>Найди друга 🐾</h2>
        <p>Все животные ждут своего хозяина</p>
      </div>

      <form className="filters" onSubmit={handleSearchSubmit}>
        <input
          type="text"
          placeholder="Поиск по имени или породе..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option>Все</option>
          <option>Собака</option>
          <option>Кошка</option>
          <option>Птица</option>
          <option>Хомяк</option>
        </select>

        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="newest">Сначала новые</option>
          <option value="name_asc">Имя А-Я</option>
          <option value="name_desc">Имя Я-А</option>
          <option value="age_asc">Сначала младшие</option>
          <option value="age_desc">Сначала старшие</option>
        </select>

        <button type="submit" className="secondary-btn">
          Найти
        </button>
      </form>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="value">{animals.length}</div>
          <div className="label">Животных</div>
        </div>

        <div className="stat-card">
          <div className="value" style={{ color: "#4f46e5" }}>
            {adopted}
          </div>
          <div className="label">Усыновлено</div>
        </div>

        <div className="stat-card">
          <div className="value" style={{ color: "#f97316" }}>
            {treatment}
          </div>
          <div className="label">Нуждаются</div>
        </div>
      </div>

      <h3>Животные</h3>

      <div className="animal-grid">
        {animals.length ? (
          animals.map((a) => (
            <article className="animal-card" key={a.id}>
              <div className="animal-image">{a.image || "🐾"}</div>

              <div className="animal-content">
                <h4>{a.name}</h4>

                <p>
                  {a.breed}, {a.age}
                </p>

                <div className="badge-row">
                  <span className="badge">{a.health}</span>
                  <span className="tag">{a.type}</span>
                </div>

                <p style={{ marginTop: "10px" }}>{a.description || ""}</p>

                {user?.role === "admin" && (
                  <div
                    style={{ marginTop: "14px", display: "flex", gap: "10px" }}
                  >
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() => handleDelete(a.id, a.name)}
                    >
                      Удалить
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))
        ) : (
          <div className="card">Ничего не найдено.</div>
        )}
      </div>
    </section>
  );
}
