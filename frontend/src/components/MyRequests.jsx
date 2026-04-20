import { useEffect, useState } from "react";
import { request } from "../api";

export default function MyRequests({ user }) {
  const [animals, setAnimals] = useState([]);

  const loadMyRequests = async () => {
    try {
      const all = await request("/animals");
      const requested = all.filter((a) => a.adoptionRequestedBy === user.id);
      setAnimals(requested);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (user) {
      loadMyRequests();
    }
  }, [user]);

  const getStatusLabel = (status) => {
    if (status === "pending") return "Ожидает решения";
    if (status === "adopted") return "Усыновление подтверждено";
    if (status === "available") return "Снова доступно";
    if (status === "treatment") return "На лечении";
    return status;
  };

  const getStatusClass = (status) => {
    if (status === "pending") return "status-pill status-pending";
    if (status === "adopted") return "status-pill status-adopted";
    if (status === "available") return "status-pill status-available";
    if (status === "treatment") return "status-pill status-treatment";
    return "status-pill";
  };

  if (!animals.length) {
    return (
      <div className="card empty-state">
        У вас пока нет заявок на усыновление.
      </div>
    );
  }

  return (
    <section className="profile-section">
      <h3>Мои заявки</h3>

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

              {a.adoptionDecision === "pending" && (
                <div className="notice-box notice-pending">
                  Ваша заявка отправлена и ожидает решения администратора.
                </div>
              )}

              {a.adoptionDecision === "approved" && (
                <div className="notice-box notice-approved">
                  Ваша заявка одобрена. Усыновление подтверждено.
                </div>
              )}

              {a.adoptionDecision === "rejected" && (
                <div className="notice-box notice-rejected">
                  Ваша заявка отклонена. Вы можете выбрать другое животное.
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
