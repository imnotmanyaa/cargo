import { useEffect, useMemo, useState } from "react";

type Role = "courier";

type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  station?: string;
  token: string;
};

type CourierTask = {
  id: string;
  shipment_number: string;
  shipment_status: string;
  client_name: string;
  pickup_address?: string;
  door_to_door_phone?: string;
};

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

function apiPath(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (!API_BASE) return path;
  return `${API_BASE}${path}`;
}

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [tasks, setTasks] = useState<CourierTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem("courier_user");
    if (raw) setUser(JSON.parse(raw) as AuthUser);
  }, []);

  const authHeaders = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${user?.token || ""}`,
    }),
    [user]
  );

  const loadTasks = async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const resp = await fetch(apiPath("/api/courier/tasks"), {
        headers: authHeaders,
      });
      if (!resp.ok) throw new Error("Не удалось загрузить задачи");
      const data = await resp.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const login = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      const resp = await fetch(apiPath("/api/auth/courier/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!resp.ok) throw new Error("Неверный логин или пароль");
      const data = await resp.json();
      const auth: AuthUser = {
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
        station: data.station,
        token: data.token,
      };
      localStorage.setItem("courier_user", JSON.stringify(auth));
      setUser(auth);
      setPassword("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка входа");
    }
  };

  const logout = () => {
    localStorage.removeItem("courier_user");
    setUser(null);
    setTasks([]);
  };

  const taskAction = async (id: string, action: "pickup-start" | "pickup-confirm") => {
    if (!user) return;
    setError("");
    const payload =
      action === "pickup-confirm"
        ? { confirmed_at: new Date().toISOString() }
        : {};
    const resp = await fetch(apiPath(`/api/shipments/${id}/${action}`), {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      setError("Не удалось выполнить действие");
      return;
    }
    await loadTasks();
  };

  if (!user) {
    return (
      <main className="auth-wrap">
        <section className="auth-card">
          <h1>Cargo Courier</h1>
          <p>Вход для курьеров</p>
          <form onSubmit={login}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit">Войти</button>
          </form>
          {error && <p className="error">{error}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="tasks-wrap">
      <header>
        <div>
          <h2>Задачи курьера</h2>
          <p>
            {user.name} {user.station ? `• ${user.station}` : ""}
          </p>
        </div>
        <button onClick={logout} className="ghost">Выйти</button>
      </header>

      <div className="controls">
        <button onClick={loadTasks}>Обновить</button>
      </div>

      {loading && <p>Загрузка...</p>}
      {error && <p className="error">{error}</p>}
      {!loading && tasks.length === 0 && <p>Новых задач нет</p>}

      <section className="cards">
        {tasks.map((task) => (
          <article key={task.id} className="card">
            <div className="row">
              <strong>{task.shipment_number}</strong>
              <span>{task.shipment_status}</span>
            </div>
            <p>{task.client_name}</p>
            {task.pickup_address && <p>Адрес: {task.pickup_address}</p>}
            {task.door_to_door_phone && (
              <a href={`tel:${task.door_to_door_phone}`}>{task.door_to_door_phone}</a>
            )}
            <div className="row">
              <button onClick={() => taskAction(task.id, "pickup-start")}>Принять</button>
              <button className="accent" onClick={() => taskAction(task.id, "pickup-confirm")}>
                Забрал груз
              </button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

export default App;
