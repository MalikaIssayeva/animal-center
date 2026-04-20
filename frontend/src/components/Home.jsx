import { useEffect, useState } from "react";
import { request } from "../api";

export default function Home({ user, onUserUpdate }) {
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

  const handleStatusChange = async (animalId, status) => {
    try {
      const updatedAnimal = await request(`/animals/${animalId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      setAnimals((prev) =>
        prev.map((animal) => (animal.id === animalId ? updatedAnimal : animal)),
      );
    } catch (error) {
      console.error(error);
      alert("Не удалось изменить статус");
    }
  };

  const toggleFavorite = async (animalId) => {
    if (!user) {
      alert("Сначала войдите в аккаунт");
      return;
    }

    try {
      const isFavorite = user.favorites?.includes(animalId);

      const updatedUser = await request(
        `/users/${user.id}/favorites/${animalId}`,
        {
          method: isFavorite ? "DELETE" : "POST",
        },
      );

      localStorage.setItem("user", JSON.stringify(updatedUser));
      onUserUpdate?.(updatedUser);
    } catch (error) {
      console.error(error);
      alert("Не удалось обновить избранное");
    }
  };

  const handleAdoptionRequest = async (animalId) => {
    if (!user) {
      alert("Сначала войдите в аккаунт");
      return;
    }

    try {
      const updatedAnimal = await request(
        `/animals/${animalId}/adopt-request`,
        {
          method: "POST",
          body: JSON.stringify({ userId: user.id }),
        },
      );

      setAnimals((prev) =>
        prev.map((animal) => (animal.id === animalId ? updatedAnimal : animal)),
      );

      alert("Заявка на усыновление отправлена");
    } catch (error) {
      console.error(error);
      alert("Не удалось отправить заявку");
    }
  };

  const handleApproveAdoption = async (animalId) => {
    try {
      const updatedAnimal = await request(`/animals/${animalId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "adopted" }),
      });

      setAnimals((prev) =>
        prev.map((animal) => (animal.id === animalId ? updatedAnimal : animal)),
      );

      alert("Заявка подтверждена");
    } catch (error) {
      console.error(error);
      alert("Не удалось подтвердить заявку");
    }
  };

  const handleRejectAdoption = async (animalId) => {
    try {
      const updatedAnimal = await request(`/animals/${animalId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "available" }),
      });

      setAnimals((prev) =>
        prev.map((animal) => (animal.id === animalId ? updatedAnimal : animal)),
      );

      alert("Заявка отклонена");
    } catch (error) {
      console.error(error);
      alert("Не удалось отклонить заявку");
    }
  };

  const adopted = animals.filter((a) => a.status === "adopted").length;
  const treatment = animals.filter(
    (a) => a.status === "treatment" || a.health?.toLowerCase().includes("леч"),
  ).length;

  const getStatusLabel = (status) => {
    if (status === "available") return "Доступен";
    if (status === "pending") return "Заявка подана";
    if (status === "adopted") return "Усыновлён";
    if (status === "treatment") return "На лечении";
    return status;
  };

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
          animals.map((a) => {
            const isFavorite = user?.favorites?.includes(a.id);

            return (
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
                    <span className="tag">{getStatusLabel(a.status)}</span>
                  </div>

                  {a.status === "pending" && a.adoptionRequestedBy > 0 && (
                    <p
                      style={{
                        marginTop: "10px",
                        color: "#4f46e5",
                        fontWeight: 600,
                      }}
                    >
                      Заявка от пользователя #{a.adoptionRequestedBy}
                    </p>
                  )}

                  <p style={{ marginTop: "10px" }}>{a.description || ""}</p>

                  <div className="card-actions">
                    {user && user.role !== "admin" && (
                      <button
                        type="button"
                        className={isFavorite ? "primary-btn" : "secondary-btn"}
                        onClick={() => toggleFavorite(a.id)}
                      >
                        {isFavorite ? "Убрать из избранного" : "В избранное"}
                      </button>
                    )}

                    {user?.accountType === "adopter" &&
                      a.status === "available" && (
                        <button
                          type="button"
                          className="primary-btn"
                          onClick={() => handleAdoptionRequest(a.id)}
                        >
                          Подать заявку
                        </button>
                      )}

                    {user?.role === "admin" && (
                      <>
                        {a.status === "pending" ? (
                          <>
                            <button
                              type="button"
                              className="primary-btn"
                              onClick={() => handleApproveAdoption(a.id)}
                            >
                              Подтвердить
                            </button>

                            <button
                              type="button"
                              className="secondary-btn"
                              onClick={() => handleRejectAdoption(a.id)}
                            >
                              Отклонить
                            </button>
                          </>
                        ) : (
                          <select
                            value={a.status}
                            onChange={(e) =>
                              handleStatusChange(a.id, e.target.value)
                            }
                          >
                            <option value="available">Доступен</option>
                            <option value="adopted">Усыновлён</option>
                            <option value="treatment">На лечении</option>
                          </select>
                        )}

                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() => handleDelete(a.id, a.name)}
                        >
                          Удалить
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <div className="card">Ничего не найдено.</div>
        )}
      </div>
    </section>
  );
}
