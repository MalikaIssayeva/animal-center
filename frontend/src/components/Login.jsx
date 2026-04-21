import { useState } from "react";
import { request } from "../api";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Введите email и пароль");
      return;
    }

    try {
      setLoading(true);

      const user = await request("/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      localStorage.setItem("user", JSON.stringify(user));
      onLogin?.(user);
    } catch (err) {
      setError(err.message || "Ошибка входа");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-section">
      <div className="card auth-card">
        <h2>Вход</h2>
        <p className="muted">Войдите в аккаунт, чтобы продолжить работу.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <div className="form-error">{error}</div>}

          <button className="primary-btn full" type="submit" disabled={loading}>
            {loading ? "Вход..." : "Войти"}
          </button>
        </form>
      </div>
    </section>
  );
}
