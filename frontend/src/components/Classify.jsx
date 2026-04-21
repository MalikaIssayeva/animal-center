import { useEffect, useState } from "react";
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

function getConfidenceText(confidence) {
  const value = Number(confidence) || 0;
  if (value >= 80) return "Высокая";
  if (value >= 50) return "Средняя";
  return "Низкая";
}

export default function Classify() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  const runClassification = async () => {
    if (!selectedFile) {
      alert("Сначала выбери изображение");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("file", selectedFile);

      const data = await request("/classify", {
        method: "POST",
        body: formData,
      });

      setResult(data);
    } catch (error) {
      console.error(error);
      alert("Не удалось выполнить классификацию");
    } finally {
      setLoading(false);
    }
  };

  const mainLabel =
    result?.alternatives?.[0]?.label ||
    result?.predictedBreed ||
    "Не определено";

  return (
    <section className="classify-page">
      <h2>Проверка модели</h2>
      <p className="muted classify-subtitle">
        Загрузите фотографию животного, чтобы посмотреть результат работы
        модели.
      </p>

      <div className="card classify-card">
        <div className="upload-box">
          <div className="upload-icon">📷</div>
          <p className="upload-title">Загрузите изображение животного</p>
          <p className="muted">
            Модель проанализирует фото и покажет наиболее вероятный результат.
          </p>

          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              setSelectedFile(file);
              setResult(null);
            }}
          />

          {selectedFile && (
            <p className="selected-file">
              Выбран файл: <strong>{selectedFile.name}</strong>
            </p>
          )}

          {previewUrl && (
            <div className="preview-box">
              <img
                src={previewUrl}
                alt="Предпросмотр"
                className="preview-image"
              />
            </div>
          )}

          <button
            className="primary-btn classify-btn"
            onClick={runClassification}
            disabled={loading}
          >
            {loading ? "Классификация..." : "Проверить изображение"}
          </button>
        </div>

        {result && (
          <div className="result-box">
            <div className="card classify-result-card">
              <div className="result-header">
                <h3>Результат анализа</h3>
                <span className="status-pill status-pending">
                  {getConfidenceText(result.confidence)} уверенность
                </span>
              </div>

              <div className="result-details">
                <p>
                  <strong>Тип:</strong>{" "}
                  {result.predictedType || "Не удалось уверенно определить тип"}
                </p>

                <p>
                  <strong>Наиболее близкий результат модели:</strong>{" "}
                  {translateLabel(mainLabel)}
                </p>

                <p>
                  <strong>Состояние:</strong>{" "}
                  {result.healthStatus || "Не определено"}
                </p>

                <p>
                  <strong>Уверенность:</strong> {result.confidence ?? 0}%
                </p>
              </div>

              <div className="notice-box notice-pending">
                Результат модели является вспомогательной подсказкой и может
                быть использован при добавлении карточки животного.
              </div>

              {!!result.alternatives?.length && (
                <div className="alternatives-box">
                  <strong>Другие варианты:</strong>

                  {result.alternatives.map((item, index) => (
                    <div key={index} className="alternative-item">
                      <div className="alternative-head">
                        <span>{translateLabel(item.label)}</span>
                        <strong>{item.confidence}%</strong>
                      </div>

                      <div className="confidence-track">
                        <div
                          className="confidence-fill"
                          style={{ width: `${item.confidence}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
