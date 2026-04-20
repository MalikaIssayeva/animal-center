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
    if (!window.confirm(`Удалить животное "${name}"?`)) return;

    try {
      await request(`/animals/${id}`, { method: "DELETE" });
      setAnimals((prev) => prev.filter((a) => a.id !== id));
    } catch {
      alert("Не удалось удалить животное");
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      const updated = await request(`/animals/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      setAnimals((prev) => prev.map((a) => (a.id === id ? updated : a)));
    } catch {
      alert("Ошибка изменения статуса");
    }
  };

  const toggleFavorite = async (id) => {
    if (!user) return alert("Сначала войдите");

    try {
      const isFav = user.favorites?.includes(id);

      const updatedUser = await request(`/users/${user.id}/favorites/${id}`, {
        method: isFav ? "DELETE" : "POST",
      });

      localStorage.setItem("user", JSON.stringify(updatedUser));
      onUserUpdate?.(updatedUser);
    } catch {
      alert("Ошибка избранного");
    }
  };

  const handleAdoptionRequest = async (id) => {
    if (!user) return alert("Сначала войдите");

    try {
      const updated = await request(`/animals/${id}/adopt-request`, {
        method: "POST",
        body: JSON.stringify({ userId: user.id }),
      });

      setAnimals((prev) => prev.map((a) => (a.id === id ? updated : a)));
    } catch {
      alert("Ошибка заявки");
    }
  };

  const handleApprove = async (id) => {
    const updated = await request(`/animals/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "adopted" }),
    });

    setAnimals((prev) => prev.map((a) => (a.id === id ? updated : a)));
  };

  const handleReject = async (id) => {
    const updated = await request(`/animals/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "available" }),
    });

    setAnimals((prev) => prev.map((a) => (a.id === id ? updated : a)));
  };

  const getStatusClass = (status) => {
    if (status === "available") return "status-pill status-available";
    if (status === "pending") return "status-pill status-pending";
    if (status === "adopted") return "status-pill status-adopted";
    return "status-pill status-treatment";
  };

  const getStatusLabel = (status) => {
    if (status === "available") return "Доступен";
    if (status === "pending") return "Есть заявка";
    if (status === "adopted") return "Усыновлён";
    return "На лечении";
  };

  return (
    <section>
      <div className="hero">
        <h2>Найди друга 🐾</h2>
        <p>Все животные ждут своего хозяина</p>
      </div>

      <form className="filters" onSubmit={handleSearchSubmit}>
        <input
          placeholder="Поиск..."
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
          <option value="age_asc">Младшие</option>
          <option value="age_desc">Старшие</option>
        </select>

        <button className="secondary-btn">Найти</button>
      </form>

      <h3>Животные</h3>

      <div className="animal-grid">
        {animals.map((a) => {
          const isFav = user?.favorites?.includes(a.id);

          return (
            <article className="animal-card" key={a.id}>
              <div className="animal-image">{a.image || "🐾"}</div>

              <div className="animal-content">
                <h4>{a.name}</h4>

                <p className="animal-meta">
                  {a.breed}, {a.age}
                </p>

                <div className="badge-row">
                  <span className="badge">{a.health}</span>
                  <span className="tag">{a.type}</span>
                  <span className={getStatusClass(a.status)}>
                    {getStatusLabel(a.status)}
                  </span>
                </div>

                {a.adoptionRequestedBy === user?.id && (
                  <>
                    {a.adoptionDecision === "pending" && (
                      <div className="notice-box notice-pending">
                        Заявка отправлена
                      </div>
                    )}

                    {a.adoptionDecision === "approved" && (
                      <div className="notice-box notice-approved">
                        Усыновление подтверждено
                      </div>
                    )}

                    {a.adoptionDecision === "rejected" && (
                      <div className="notice-box notice-rejected">
                        Заявка отклонена
                      </div>
                    )}
                  </>
                )}

                {a.description && (
                  <p className="animal-desc">{a.description}</p>
                )}

                <div className="card-actions">
                  {user && user.role !== "admin" && (
                    <button
                      className={isFav ? "primary-btn" : "secondary-btn"}
                      onClick={() => toggleFavorite(a.id)}
                    >
                      {isFav ? "Убрать" : "В избранное"}
                    </button>
                  )}

                  {user?.accountType === "adopter" &&
                    a.status === "available" &&
                    a.ownerId !== user.id && (
                      <button
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
                            className="primary-btn"
                            onClick={() => handleApprove(a.id)}
                          >
                            Подтвердить
                          </button>
                          <button
                            className="secondary-btn"
                            onClick={() => handleReject(a.id)}
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
        })}
      </div>
    </section>
  );
}
