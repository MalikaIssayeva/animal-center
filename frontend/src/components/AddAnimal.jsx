import { useState } from "react";
import { request } from "../api";

function translateLabel(label) {
  if (!label) return "Не определено";

  const map = {
    chihuahua: "Чихуахуа",
    toy_terrier: "Той-терьер",
    miniature_pinscher: "Карликовый пинчер",
    doberman: "Доберман",
    golden_retriever: "Золотистый ретривер",
    labrador_retriever: "Лабрадор-ретривер",
    german_shepherd: "Немецкая овчарка",
    siberian_husky: "Сибирский хаски",
    beagle: "Бигль",
    french_bulldog: "Французский бульдог",
    english_bulldog: "Английский бульдог",
    pug: "Мопс",
    pomeranian: "Померанский шпиц",
    samoyed: "Самоед",
    boxer: "Боксер",
    dalmatian: "Далматин",
    tabby: "Полосатая кошка",
    tiger_cat: "Тигровая кошка",
    persian_cat: "Персидская кошка",
    siamese_cat: "Сиамская кошка",
    egyptian_cat: "Египетская кошка",
    lynx: "Рысь",
    hamster: "Хомяк",
    guinea_pig: "Морская свинка",
    mouse: "Мышь",
    rat: "Крыса",
    cockatoo: "Какаду",
    macaw: "Ара",
    lorikeet: "Лорикет",
    parrot: "Попугай",
    canary: "Канарейка",
  };

  const normalized = label.toLowerCase().replaceAll(" ", "_").trim();

  if (map[normalized]) return map[normalized];

  return label
    .replaceAll("_", " ")
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

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

  const [file, setFile] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loadingML, setLoadingML] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleClassify = async () => {
    if (!file) {
      alert("Сначала выбери фото");
      return;
    }

    try {
      setLoadingML(true);

      const formData = new FormData();
      formData.append("file", file);

      const data = await request("/classify", {
        method: "POST",
        body: formData,
      });

      const label = data?.predictedBreed || "Не определено";
      const type = data?.predictedType || "Не удалось уверенно определить тип";

      setPrediction({
        raw: label,
        type,
        confidence: data?.confidence ?? 0,
      });

      // 🔥 гибрид: тип подставляем сразу
      if (type !== "Не удалось уверенно определить тип") {
        setForm((prev) => ({
          ...prev,
          type,
        }));
      }
    } catch (err) {
      console.error(err);
      alert("Ошибка ML");
    } finally {
      setLoadingML(false);
    }
  };

  const applyPrediction = () => {
    if (!prediction) return;

    // 🔥 гибрид: по кнопке подставляем только породу
    setForm((prev) => ({
      ...prev,
      breed: translateLabel(prediction.raw),
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

      setFile(null);
      setPrediction(null);

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
        <label>
          Фото животного
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>

        <button
          type="button"
          className="secondary-btn"
          onClick={handleClassify}
          disabled={loadingML}
        >
          {loadingML ? "Определение..." : "Определить по фото"}
        </button>

        {prediction && (
          <div className="ml-result">
            <p>
              <strong>Тип:</strong> {prediction.type}
            </p>
            <p>
              <strong>Метка модели:</strong> {translateLabel(prediction.raw)}
            </p>
            <p>
              <strong>Уверенность:</strong> {prediction.confidence}%
            </p>

            <p className="muted">
              Тип уже подставлен в форму автоматически. Породу можно добавить по
              кнопке ниже.
            </p>

            {prediction.type !== "Не удалось уверенно определить тип" && (
              <button
                type="button"
                className="primary-btn"
                onClick={applyPrediction}
              >
                Подставить породу
              </button>
            )}
          </div>
        )}

        <div className="form-row two-cols">
          <label>
            Кличка
            <input
              name="name"
              required
              value={form.name}
              onChange={handleChange}
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
            <input name="breed" value={form.breed} onChange={handleChange} />
          </label>

          <label>
            Возраст
            <input name="age" value={form.age} onChange={handleChange} />
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
          />
        </label>

        <button className="primary-btn full" type="submit">
          Сохранить животное
        </button>
      </form>
    </section>
  );
}
