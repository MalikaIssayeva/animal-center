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

  const getStatusLabel = (status) => {
    if (status === "available") return "Доступен";
    if (status === "pending") return "Ожидает подтверждения";
    if (status === "adopted") return "Усыновлён";
    if (status === "treatment") return "На лечении";
    return status;
  };

  const getStatusClass = (status) => {
    if (status === "available") return "status-pill status-available";
    if (status === "pending") return "status-pill status-pending";
    if (status === "adopted") return "status-pill status-adopted";
    if (status === "treatment") return "status-pill status-treatment";
    return "status-pill";
  };

  if (!animals.length) {
    return (
      <div className="card empty-state">
        У вас пока нет добавленных животных.
      </div>
    );
  }

  return (
    <section className="profile-section">
      <h3>Мои животные</h3>

      <div className="animal-grid">
        {animals.map((a) => (
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

              {a.status === "pending" && a.adoptionRequestedBy > 0 && (
                <div className="notice-box notice-pending">
                  Подана заявка от пользователя #{a.adoptionRequestedBy}
                </div>
              )}

              {a.adoptionDecision === "approved" && (
                <div className="notice-box notice-approved">
                  Заявка одобрена. Животное успешно усыновлено.
                </div>
              )}

              {a.adoptionDecision === "rejected" && (
                <div className="notice-box notice-rejected">
                  Заявка была отклонена. Животное снова доступно для
                  усыновления.
                </div>
              )}

              {a.status === "available" && !a.adoptionDecision && (
                <div className="notice-box notice-approved">
                  Животное доступно для усыновления.
                </div>
              )}

              {a.status === "treatment" && (
                <div className="notice-box notice-rejected">
                  Животное временно недоступно, так как находится на лечении.
                </div>
              )}

              {a.description && <p className="animal-desc">{a.description}</p>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
