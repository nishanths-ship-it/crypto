const supabaseUrl = window.SUPABASE_URL || "https://YOUR_PROJECT.supabase.co";
const supabaseAnonKey = window.SUPABASE_ANON_KEY || "YOUR_PUBLIC_ANON_KEY";

const supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

const elements = {
  email: document.getElementById("email"),
  password: document.getElementById("password"),
  authStatus: document.getElementById("auth-status"),
  signUp: document.getElementById("sign-up"),
  signIn: document.getElementById("sign-in"),
  signOut: document.getElementById("sign-out"),
  asset: document.getElementById("asset"),
  loadData: document.getElementById("load-data"),
  message: document.getElementById("message"),
  volatility: document.getElementById("volatility"),
  var95: document.getElementById("var"),
  sharpe: document.getElementById("sharpe"),
  maxDrawdown: document.getElementById("max-drawdown"),
};

let volatilityChart;

function setMessage(text, isError = false) {
  elements.message.textContent = text;
  elements.message.style.color = isError ? "#ff7b7b" : "#ffd166";
}

function formatPercent(value) {
  if (value === null || Number.isNaN(value)) return "-";
  return `${(value * 100).toFixed(2)}%`;
}

function formatNumber(value) {
  if (value === null || Number.isNaN(value)) return "-";
  return value.toFixed(3);
}

function renderChart(points) {
  const ctx = document.getElementById("volatility-chart");

  if (volatilityChart) {
    volatilityChart.destroy();
  }

  volatilityChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: points.map((p) => p.date),
      datasets: [
        {
          label: "30-Day Rolling Volatility",
          data: points.map((p) => (p.volatility * 100).toFixed(2)),
          borderColor: "#7ea7ff",
          backgroundColor: "rgba(126, 167, 255, 0.2)",
          tension: 0.2,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          ticks: {
            callback: (value) => `${value}%`,
          },
        },
      },
    },
  });
}

async function refreshAuthState() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  elements.authStatus.textContent = user ? `Signed in as ${user.email}` : "Not signed in";
}

async function authAction(type) {
  const email = elements.email.value.trim();
  const password = elements.password.value.trim();

  if (!email || !password) {
    setMessage("Email and password are required.", true);
    return;
  }

  const fn = type === "signup" ? supabase.auth.signUp : supabase.auth.signInWithPassword;
  const { error } = await fn({ email, password });

  if (error) {
    setMessage(error.message, true);
    return;
  }

  setMessage(type === "signup" ? "Sign-up successful." : "Sign-in successful.");
  await refreshAuthState();
}

async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    setMessage(error.message, true);
    return;
  }
  setMessage("Signed out.");
  await refreshAuthState();
}

async function loadMetrics() {
  const asset = elements.asset.value;
  setMessage(`Fetching ${asset} metrics...`);

  const { data, error } = await supabase.functions.invoke("crypto-metrics", {
    body: { asset },
  });

  if (error) {
    setMessage(error.message, true);
    return;
  }

  elements.volatility.textContent = formatPercent(data.summary.currentVolatility);
  elements.var95.textContent = formatPercent(data.summary.valueAtRisk95);
  elements.sharpe.textContent = formatNumber(data.summary.sharpeRatio);
  elements.maxDrawdown.textContent = formatPercent(data.summary.maximumDrawdown);

  renderChart(data.volatilitySeries);
  setMessage(`Loaded ${asset} metrics successfully.`);
}

elements.signUp.addEventListener("click", () => authAction("signup"));
elements.signIn.addEventListener("click", () => authAction("signin"));
elements.signOut.addEventListener("click", signOut);
elements.loadData.addEventListener("click", loadMetrics);

refreshAuthState();
