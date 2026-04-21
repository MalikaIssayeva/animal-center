const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

export async function request(path, options = {}) {
  const isFormData = options.body instanceof FormData;

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: isFormData
      ? { ...(options.headers || {}) }
      : {
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
  });

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.error || "Ошибка запроса к серверу");
  }

  return data;
}
