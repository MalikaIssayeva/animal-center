import { useState } from "react";
import { request } from "../api";

export default function Register({ onRegisterSuccess }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState("adopter");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Заполните все поля");
      return;
    }

    if (password.length < 6) {
      setError("Пароль должен содержать минимум 6 символов");
      return;
    }

    try {
      setLoading(true);

      await request("/register", {
        method: "POST",
        body: JSON.stringify({
          name,
          email,
          password,
          accountType,
        }),
      });

      setName("");
      setEmail("");
      setPassword("");
      setAccountType("adopter");
      onRegisterSuccess?.();
    } catch (err) {
      setError(err.message || "Ошибка регистрации");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-section">
      <div className="card auth-card">
        <h2>Регистрация</h2>
        <p className="muted">
          Создайте аккаунт усыновителя или хозяина животного.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Имя"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Пароль"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <select
            value={accountType}
            onChange={(e) => setAccountType(e.target.value)}
          >
            <option value="adopter">Усыновитель</option>
            <option value="owner">Хозяин</option>
          </select>

          {error && <div className="form-error">{error}</div>}

          <button className="primary-btn full" type="submit" disabled={loading}>
            {loading ? "Регистрация..." : "Зарегистрироваться"}
          </button>
        </form>
      </div>
    </section>
  );
}
