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

export default function Favorites({ user, onUserUpdate }) {
  const [animals, setAnimals] = useState([]);

  useEffect(() => {
    const loadFavorites = async () => {
      if (!user?.favorites?.length) {
        setAnimals([]);
        return;
      }

      try {
        const allAnimals = await request("/animals");
        const favoriteAnimals = allAnimals.filter((animal) =>
          user.favorites.includes(animal.id),
        );
        setAnimals(favoriteAnimals);
      } catch (error) {
        console.error(error);
      }
    };

    loadFavorites();
  }, [user]);

  const removeFromFavorites = async (animalId) => {
    try {
      const updatedUser = await request(
        `/users/${user.id}/favorites/${animalId}`,
        {
          method: "DELETE",
        },
      );

      localStorage.setItem("user", JSON.stringify(updatedUser));
      onUserUpdate?.(updatedUser);
    } catch (error) {
      console.error(error);
      alert("Не удалось удалить из избранного");
    }
  };

  if (!user) {
    return <div className="card">Сначала войдите в аккаунт.</div>;
  }

  return (
    <section>
      <h2>Избранные животные</h2>
      <p className="muted">Здесь собраны животные, которых вы сохранили.</p>

      <div className="animal-grid">
        {animals.length ? (
          animals.map((a) => (
            <article className="animal-card" key={a.id}>
              <div className="animal-image">
                <img src={getAnimalIcon(a.type)} alt={a.type} />
              </div>

              <div className="animal-content">
                <h4>{a.name}</h4>
                <p className="animal-meta">
                  {a.breed}, {a.age}
                </p>

                <div className="badge-row">
                  <span className="badge">{a.health}</span>
                  <span className="tag">{a.type}</span>
                </div>

                <div className="status-row">
                  {a.status === "available" && (
                    <span className="status-pill status-available">
                      Доступен
                    </span>
                  )}

                  {a.status === "pending" && (
                    <span className="status-pill status-pending">
                      Есть заявка
                    </span>
                  )}

                  {a.status === "adopted" && (
                    <span className="status-pill status-adopted">
                      Усыновлён
                    </span>
                  )}

                  {a.status === "treatment" && (
                    <span className="status-pill status-treatment">
                      На лечении
                    </span>
                  )}
                </div>

                {a.description && (
                  <p className="animal-desc">{a.description}</p>
                )}

                {a.adoptionRequestedBy === user?.id && (
                  <>
                    {a.adoptionDecision === "pending" && (
                      <div className="notice-box notice-pending">
                        Заявка отправлена. Ожидайте решения.
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

                <div className="card-actions">
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => removeFromFavorites(a.id)}
                  >
                    Убрать из избранного
                  </button>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="card empty-state">
            У вас пока нет избранных животных.
          </div>
        )}
      </div>
    </section>
  );
}
