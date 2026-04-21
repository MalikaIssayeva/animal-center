import { useEffect, useMemo, useState } from "react";
import { request } from "../api";

export default function Home({ user, onUserUpdate }) {
  const [animals, setAnimals] = useState([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("Все");
  const [sort, setSort] = useState("newest");

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("Все");
  const [healthFilter, setHealthFilter] = useState("Все");
  const [onlyPending, setOnlyPending] = useState(false);
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  const sortAnimalsForAdmin = (list) => {
    const statusPriority = {
      pending: 0,
      available: 1,
      treatment: 2,
      adopted: 3,
    };

    return [...list].sort((a, b) => {
      const aPriority = statusPriority[a.status] ?? 99;
      const bPriority = statusPriority[b.status] ?? 99;

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      return b.id - a.id;
    });
  };

  const prepareAnimals = (list) => {
    return user?.role === "admin" ? sortAnimalsForAdmin(list) : list;
  };

  const loadAnimals = async () => {
    try {
      const query = new URLSearchParams();

      if (search) query.set("search", search);
      if (type !== "Все") query.set("type", type);
      if (sort && sort !== "newest") query.set("sort", sort);

      const data = await request(`/animals?${query.toString()}`);
      setAnimals(prepareAnimals(data));
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadAnimals();
  }, [user]);

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

      setAnimals((prev) => {
        const updatedList = prev.map((a) => (a.id === id ? updated : a));
        return prepareAnimals(updatedList);
      });
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

      setAnimals((prev) => {
        const updatedList = prev.map((a) => (a.id === id ? updated : a));
        return prepareAnimals(updatedList);
      });
    } catch {
      alert("Ошибка заявки");
    }
  };

  const handleApprove = async (id) => {
    try {
      const updated = await request(`/animals/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "adopted" }),
      });

      setAnimals((prev) => {
        const updatedList = prev.map((a) => (a.id === id ? updated : a));
        return prepareAnimals(updatedList);
      });
    } catch {
      alert("Не удалось подтвердить заявку");
    }
  };

  const handleReject = async (id) => {
    try {
      const updated = await request(`/animals/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "available" }),
      });

      setAnimals((prev) => {
        const updatedList = prev.map((a) => (a.id === id ? updated : a));
        return prepareAnimals(updatedList);
      });
    } catch {
      alert("Не удалось отклонить заявку");
    }
  };

  const resetAdvancedFilters = () => {
    setStatusFilter("Все");
    setHealthFilter("Все");
    setOnlyPending(false);
    setOnlyAvailable(false);
  };

  const filteredAnimals = useMemo(() => {
    let list = [...animals];

    if (statusFilter !== "Все") {
      list = list.filter((a) => a.status === statusFilter);
    }

    if (healthFilter !== "Все") {
      list = list.filter((a) =>
        (a.health || "").toLowerCase().includes(healthFilter.toLowerCase()),
      );
    }

    if (onlyPending) {
      list = list.filter((a) => a.status === "pending");
    }

    if (onlyAvailable) {
      list = list.filter((a) => a.status === "available");
    }

    return prepareAnimals(list);
  }, [animals, statusFilter, healthFilter, onlyPending, onlyAvailable, user]);

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

        <button className="secondary-btn" type="submit">
          Найти
        </button>

        <button
          type="button"
          className="primary-btn"
          onClick={() => setIsFilterModalOpen(true)}
        >
          Расширенный поиск
        </button>
      </form>

      <h3>Животные</h3>

      <div className="animal-grid">
        {filteredAnimals.length ? (
          filteredAnimals.map((a) => {
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

                  {user?.role === "admin" && a.status === "pending" && (
                    <div className="notice-box notice-pending">
                      Требует решения администратора
                    </div>
                  )}

                  {(user?.role === "admin" || a.ownerId === user?.id) &&
                    a.status === "pending" &&
                    a.adoptionRequestedBy > 0 && (
                      <div className="notice-box notice-pending">
                        Заявка от пользователя #{a.adoptionRequestedBy}
                      </div>
                    )}

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
                        type="button"
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
                              onClick={() => handleApprove(a.id)}
                            >
                              Подтвердить
                            </button>

                            <button
                              type="button"
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
          <div className="card empty-state">Ничего не найдено.</div>
        )}
      </div>

      {isFilterModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => setIsFilterModalOpen(false)}
        >
          <div className="filter-modal" onClick={(e) => e.stopPropagation()}>
            <div className="filter-modal-header">
              <h3>Расширенный поиск</h3>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setIsFilterModalOpen(false)}
              >
                Закрыть
              </button>
            </div>

            <div className="filter-modal-body">
              <label>
                Статус
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="Все">Все</option>
                  <option value="available">Доступен</option>
                  <option value="pending">Есть заявка</option>
                  <option value="adopted">Усыновлён</option>
                  <option value="treatment">На лечении</option>
                </select>
              </label>

              <label>
                Состояние здоровья
                <select
                  value={healthFilter}
                  onChange={(e) => setHealthFilter(e.target.value)}
                >
                  <option value="Все">Все</option>
                  <option value="Здоров">Здоров</option>
                  <option value="леч">На лечении</option>
                  <option value="Стерилизована">Стерилизована</option>
                </select>
              </label>

              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={onlyPending}
                  onChange={(e) => setOnlyPending(e.target.checked)}
                />
                <span>Только животные с заявками</span>
              </label>

              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={onlyAvailable}
                  onChange={(e) => setOnlyAvailable(e.target.checked)}
                />
                <span>Только доступные для усыновления</span>
              </label>
            </div>

            <div className="filter-modal-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={resetAdvancedFilters}
              >
                Сбросить
              </button>

              <button
                type="button"
                className="primary-btn"
                onClick={() => setIsFilterModalOpen(false)}
              >
                Применить
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
