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
    if (status === "pending") return "status-tag status-pending";
    if (status === "adopted") return "status-tag status-adopted";
    if (status === "available") return "status-tag status-available";
    if (status === "treatment") return "status-tag status-treatment";
    return "status-tag";
  };

  if (!animals.length) {
    return <div className="card">У вас пока нет заявок на усыновление.</div>;
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

              <p>
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
                <p className="request-message request-pending">
                  Ваша заявка отправлена и ожидает решения администратора.
                </p>
              )}

              {a.adoptionDecision === "approved" && (
                <p className="request-message request-approved">
                  Ваша заявка одобрена. Усыновление подтверждено.
                </p>
              )}

              {a.adoptionDecision === "rejected" && (
                <p className="request-message request-rejected">
                  Ваша заявка отклонена. Вы можете выбрать другое животное.
                </p>
              )}

              <p style={{ marginTop: "10px" }}>{a.description || ""}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
