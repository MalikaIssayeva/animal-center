import { useEffect, useState } from "react";
import { request } from "../api";

export default function Analytics() {
  const [data, setData] = useState(null);

  useEffect(() => {
    request("/analytics")
      .then(setData)
      .catch((error) => {
        console.error(error);
      });
  }, []);

  if (!data) {
    return <div className="card">Загрузка...</div>;
  }

  const maxValue = Math.max(...data.monthlyIntake.map((item) => item.count), 1);
  const total =
    data.typeDistribution.reduce((sum, item) => sum + item.value, 0) || 1;

  return (
    <section>
      <h2>Аналитика</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="value">{data.totalAnimals}</div>
          <div className="label">Всего животных</div>
        </div>

        <div className="stat-card">
          <div className="value" style={{ color: "#4f46e5" }}>
            {data.adoptedAnimals}
          </div>
          <div className="label">Усыновлено</div>
        </div>

        <div className="stat-card">
          <div className="value" style={{ color: "#f97316" }}>
            {data.needTreatment}
          </div>
          <div className="label">На лечении</div>
        </div>

        <div className="stat-card">
          <div className="value" style={{ color: "#2563eb" }}>
            {data.modelAccuracy}%
          </div>
          <div className="label">Точность ИИ</div>
        </div>
      </div>

      <div className="analytics-layout">
        <div className="card">
          <h3>Поступления за 6 месяцев</h3>
          <div className="bars">
            {data.monthlyIntake.map((item, index) => (
              <div className="bar-col" key={index}>
                <div className="bar-value">{item.count}</div>
                <div
                  className="bar"
                  style={{ height: `${(item.count / maxValue) * 150 + 30}px` }}
                />
                <div className="bar-label">{item.month}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3>Породы</h3>
          <table>
            <thead>
              <tr>
                <th>Порода</th>
                <th>Кол-во</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              {data.breedTable.map((row, index) => (
                <tr key={index}>
                  <td>{row.breed}</td>
                  <td>{row.count}</td>
                  <td>
                    <span
                      className={`status-pill ${
                        row.status === "Много" ? "warning" : "ok"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3>Распределение по видам</h3>
          <div>
            {data.typeDistribution.map((item, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 0",
                  borderBottom: "1px solid #d9e1de",
                }}
              >
                <span>{item.label}</span>
                <strong>{Math.round((item.value / total) * 100)}%</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
