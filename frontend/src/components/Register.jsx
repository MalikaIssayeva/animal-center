import { useState } from "react";
import { request } from "../api";

export default function Register({ onRegisterSuccess }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState("adopter");

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await request("/register", {
        method: "POST",
        body: JSON.stringify({
          name,
          email,
          password,
          accountType,
        }),
      });

      alert("Регистрация успешна! Теперь войдите в аккаунт.");
      setName("");
      setEmail("");
      setPassword("");
      setAccountType("adopter");
      onRegisterSuccess?.();
    } catch (err) {
      alert("Ошибка регистрации");
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

          <button className="primary-btn full" type="submit">
            Зарегистрироваться
          </button>
        </form>
      </div>
    </section>
  );
}
