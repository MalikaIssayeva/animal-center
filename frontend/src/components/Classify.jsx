import { useState } from "react";
import { request } from "../api";

export default function Classify() {
  const [result, setResult] = useState(null);

  const runClassification = async () => {
    try {
      const data = await request("/classify", {
        method: "POST",
        body: JSON.stringify({}),
      });
      setResult(data);
    } catch (error) {
      console.error(error);
      alert("Не удалось выполнить классификацию");
    }
  };

  return (
    <section>
      <h2>Модуль классификации</h2>
      <p className="muted">
        Пока это мок-версия. Позже можно подключить реальную ML-модель.
      </p>

      <div className="card classify-card">
        <div className="upload-box">
          <div className="upload-icon">📷</div>
          <p>Нажмите для загрузки или перетащите фото</p>
          <input type="file" accept="image/*" />
          <button className="primary-btn" onClick={runClassification}>
            Выбрать фото
          </button>
        </div>

        {result && (
          <div className="result-box">
            <div className="card">
              <h3>{result.predictedBreed}</h3>
              <p>
                {result.predictedType} · {result.ageCategory}
              </p>
              <p>
                <strong>Состояние:</strong> {result.healthStatus}
              </p>
              <p>
                <strong>Точность:</strong> {result.confidence}%
              </p>

              <div>
                {result.alternatives.map((item, index) => (
                  <div key={index} style={{ marginTop: "10px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>{item.label}</span>
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
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
