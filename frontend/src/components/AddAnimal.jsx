import { useState } from "react";
import { request } from "../api";

export default function AddAnimal({ onSuccess }) {
  const [form, setForm] = useState({
    name: "",
    type: "Собака",
    breed: "",
    age: "",
    gender: "Самец",
    health: "Здоров",
    description: "",
  });

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        ...form,
        tags: [],
        status: form.health === "На лечении" ? "treatment" : "available",
      };

      await request("/animals", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setForm({
        name: "",
        type: "Собака",
        breed: "",
        age: "",
        gender: "Самец",
        health: "Здоров",
        description: "",
      });

      alert("Животное добавлено");
      onSuccess?.();
    } catch (error) {
      console.error(error);
      alert("Не удалось добавить животное");
    }
  };

  return (
    <section>
      <h2>Добавить животное</h2>

      <form className="card form-card" onSubmit={handleSubmit}>
        <div className="form-row two-cols">
          <label>
            Кличка
            <input
              name="name"
              required
              value={form.name}
              onChange={handleChange}
              placeholder="Барсик"
            />
          </label>

          <label>
            Вид
            <select name="type" value={form.type} onChange={handleChange}>
              <option>Собака</option>
              <option>Кошка</option>
              <option>Птица</option>
              <option>Хомяк</option>
            </select>
          </label>
        </div>

        <div className="form-row two-cols">
          <label>
            Порода
            <input
              name="breed"
              required
              value={form.breed}
              onChange={handleChange}
              placeholder="Лабрадор"
            />
          </label>

          <label>
            Возраст
            <input
              name="age"
              required
              value={form.age}
              onChange={handleChange}
              placeholder="2 года"
            />
          </label>
        </div>

        <div className="form-row two-cols">
          <label>
            Пол
            <select name="gender" value={form.gender} onChange={handleChange}>
              <option>Самец</option>
              <option>Самка</option>
            </select>
          </label>

          <label>
            Статус здоровья
            <select name="health" value={form.health} onChange={handleChange}>
              <option>Здоров</option>
              <option>На лечении</option>
              <option>Стерилизована</option>
            </select>
          </label>
        </div>

        <label>
          Описание
          <textarea
            name="description"
            rows="4"
            value={form.description}
            onChange={handleChange}
            placeholder="Ласковый, игривый, ищет любящий дом..."
          />
        </label>

        <button className="primary-btn full" type="submit">
          Сохранить животное
        </button>
      </form>
    </section>
  );
}
