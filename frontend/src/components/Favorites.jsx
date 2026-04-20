import { useEffect, useState } from "react";
import { request } from "../api";

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
          <div className="card">У вас пока нет избранных животных.</div>
        )}
      </div>
    </section>
  );
}
