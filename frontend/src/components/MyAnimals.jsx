import { useEffect, useState } from "react";
import { request } from "../api";
import dogIcon from "../assets/dog.svg";
import catIcon from "../assets/cat.svg";
import birdIcon from "../assets/bird.svg";
import hamsterIcon from "../assets/hamster.svg";

function getAnimalIcon(type) {
  if (!type) return dogIcon;

  const t = type.toLowerCase();

  if (t.includes("собак")) return dogIcon;
  if (t.includes("кошк")) return catIcon;
  if (t.includes("птиц")) return birdIcon;
  if (t.includes("хомяк")) return hamsterIcon;

  return dogIcon;
}

function getHealthClass(health) {
  if (!health) return "healthy";

  const h = health.toLowerCase();

  if (h.includes("здоров")) return "healthy";
  if (h.includes("осмотр")) return "warning";
  if (h.includes("леч")) return "treatment";
  if (h.includes("уход")) return "care";

  return "healthy";
}

export default function MyAnimals({ user }) {
  const [animals, setAnimals] = useState([]);
  const [requestUsers, setRequestUsers] = useState({});

  const loadMyAnimals = async () => {
    try {
      const all = await request("/animals");
      const mine = all.filter((a) => a.ownerId === user.id);
      setAnimals(mine);

      const requestIds = [
        ...new Set(
          mine
            .filter((a) => a.adoptionRequestedBy > 0)
            .map((a) => a.adoptionRequestedBy),
        ),
      ];

      const usersMap = {};

      await Promise.all(
        requestIds.map(async (id) => {
          try {
            const requestUser = await request(`/users/${id}`);
            usersMap[id] = requestUser;
          } catch {
            usersMap[id] = null;
          }
        }),
      );

      setRequestUsers(usersMap);
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
        {animals.map((a) => {
          const applicant = requestUsers[a.adoptionRequestedBy];

          return (
            <article className="animal-card" key={a.id}>
              <div className="animal-image">
                <img src={getAnimalIcon(a.type)} alt={a.type} />
              </div>

              <div className="animal-content">
                <h4>{a.name}</h4>

                <p className="animal-meta">
                  {a.breed}, {a.age}
                </p>

                {a.source && (
                  <p className="animal-source">Источник: {a.source}</p>
                )}

                <div className="badge-row">
                  {!(a.health === "На лечении" && a.status === "treatment") && (
                    <span className={`badge badge-${getHealthClass(a.health)}`}>
                      {a.health}
                    </span>
                  )}
                  <span className="tag">{a.type}</span>
                  <span className={getStatusClass(a.status)}>
                    {getStatusLabel(a.status)}
                  </span>
                </div>

                {a.status === "pending" && a.adoptionRequestedBy > 0 && (
                  <div className="notice-box notice-pending">
                    <strong>Есть заявка на усыновление</strong>
                    <div className="request-contact">
                      <div>
                        Пользователь:{" "}
                        {applicant?.name || `#${a.adoptionRequestedBy}`}
                      </div>
                      <div>
                        Email: {applicant?.email || "Не удалось загрузить"}
                      </div>
                    </div>
                  </div>
                )}

                {a.adoptionDecision === "approved" &&
                  a.adoptionRequestedBy > 0 && (
                    <div className="notice-box notice-approved">
                      <strong>Заявка одобрена</strong>
                      <div className="request-contact">
                        <div>
                          Пользователь:{" "}
                          {applicant?.name || `#${a.adoptionRequestedBy}`}
                        </div>
                        <div>
                          Email: {applicant?.email || "Не удалось загрузить"}
                        </div>
                      </div>
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

                {a.description && (
                  <p className="animal-desc">{a.description}</p>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
