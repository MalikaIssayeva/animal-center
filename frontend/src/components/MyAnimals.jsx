import { useEffect, useState } from "react";
import { request } from "../api";

export default function MyAnimals({ user }) {
  const [animals, setAnimals] = useState([]);

  const loadMyAnimals = async () => {
    try {
      const all = await request("/animals");
      const mine = all.filter((a) => a.ownerId === user.id);
      setAnimals(mine);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (user) {
      loadMyAnimals();
    }
  }, [user]);

  const handleMarkAdopted = async (id) => {
    try {
      const updatedAnimal = await request(`/animals/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "adopted" }),
      });

      setAnimals((prev) =>
        prev.map((animal) => (animal.id === id ? updatedAnimal : animal)),
      );
    } catch (err) {
      console.error(err);
      alert("Не удалось изменить статус");
    }
  };

  const getStatusLabel = (status) => {
    if (status === "available") return "Доступен";
    if (status === "adopted") return "Усыновлён";
    if (status === "treatment") return "На лечении";
    return status;
  };

  if (!animals.length) {
    return <div className="card">У вас пока нет добавленных животных.</div>;
  }

  return (
    <section>
      <h3>Мои животные</h3>

      <div className="animal-grid">
        {animals.map((a) => (
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

              <p style={{ marginTop: "10px" }}>{a.description || ""}</p>

              {a.status === "available" && (
                <div className="card-actions">
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={() => handleMarkAdopted(a.id)}
                  >
                    Отметить как усыновлён
                  </button>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
