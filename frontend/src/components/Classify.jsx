import { useEffect, useState } from "react";
import { request } from "../api";

function formatLabel(label) {
  if (!label) return "Не определено";

  const normalized = label.replaceAll("_", " ").trim();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
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
    <section>
      <h2>Модуль классификации</h2>
      <p className="muted">Загрузите фото животного для классификации.</p>

      <div className="card classify-card">
        <div className="upload-box">
          <div className="upload-icon">📷</div>
          <p>Нажмите для загрузки или выберите фото</p>

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
            <p style={{ marginTop: "10px" }}>
              Выбран файл: <strong>{selectedFile.name}</strong>
            </p>
          )}

          {previewUrl && (
            <div style={{ marginTop: "18px" }}>
              <img
                src={previewUrl}
                alt="Предпросмотр"
                style={{
                  maxWidth: "260px",
                  width: "100%",
                  borderRadius: "16px",
                  border: "1px solid #d9e1de",
                }}
              />
            </div>
          )}

          <button
            className="primary-btn"
            onClick={runClassification}
            disabled={loading}
            style={{ marginTop: "18px" }}
          >
            {loading ? "Классификация..." : "Классифицировать"}
          </button>
        </div>

        {result && (
          <div className="result-box">
            <div className="card">
              <h3>{result.predictedType || "Не определено"}</h3>

              <p>
                <strong>Основной результат:</strong> {formatLabel(mainLabel)}
              </p>

              <p>
                <strong>Состояние:</strong>{" "}
                {result.healthStatus || "Не определено"}
              </p>

              <p>
                <strong>Точность:</strong> {result.confidence ?? 0}%
              </p>

              {!!result.alternatives?.length && (
                <div style={{ marginTop: "18px" }}>
                  <strong>Другие варианты:</strong>

                  {result.alternatives.map((item, index) => (
                    <div key={index} style={{ marginTop: "12px" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "4px",
                        }}
                      >
                        <span>{formatLabel(item.label)}</span>
                        <strong>{item.confidence}%</strong>
                      </div>

                      <div
                        style={{
                          height: "8px",
                          background: "#e5e7eb",
                          borderRadius: "999px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "8px",
                            background: "#1f9d72",
                            width: `${item.confidence}%`,
                          }}
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
