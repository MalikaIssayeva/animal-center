import MyAnimals from "./MyAnimals";
import MyRequests from "./MyRequests";

export default function Profile({ user }) {
  if (!user) {
    return <div className="card">Сначала войдите в аккаунт.</div>;
  }

  const getRoleLabel = () => {
    if (user.role === "admin") return "Администратор";
    if (user.accountType === "owner") return "Хозяин";
    if (user.accountType === "adopter") return "Усыновитель";
    return "Пользователь";
  };

  return (
    <section className="profile-page">
      <h2>Личный кабинет</h2>

      <div className="profile-grid">
        <div className="card profile-main">
          <div className="profile-header">
            <div className="profile-avatar">👤</div>
            <div>
              <h3>{user.name}</h3>
              <p className="muted">{user.email}</p>
            </div>
          </div>

          <div className="profile-info">
            <p>
              <strong>Роль:</strong> {getRoleLabel()}
            </p>

            <p>
              <strong>ID пользователя:</strong> {user.id}
            </p>
          </div>
        </div>

        <div className="card profile-stats">
          <h3>Активность</h3>

          <div className="profile-stat">
            <div className="stat-value">{user.favorites?.length || 0}</div>
            <div className="stat-label">В избранном</div>
          </div>

          <div className="profile-hint">
            <p>💡 Сохраняйте животных, чтобы быстро вернуться к ним позже.</p>
          </div>
        </div>
      </div>

      {user.accountType === "owner" && (
        <div className="profile-section">
          <MyAnimals user={user} />
        </div>
      )}

      {user.accountType === "adopter" && (
        <div className="profile-section">
          <MyRequests user={user} />
        </div>
      )}
    </section>
  );
}
