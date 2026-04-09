const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

export async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    throw new Error("Ошибка запроса к серверу");
  }

  return response.json();
}
