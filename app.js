const currencyOptions = [
  { code: "AED", locale: "en-AE", label: "AED - UAE dirham" },
  { code: "USD", locale: "en-US", label: "USD - US dollar" },
  { code: "EUR", locale: "en-IE", label: "EUR - Euro" },
  { code: "GBP", locale: "en-GB", label: "GBP - British pound" },
  { code: "INR", locale: "en-IN", label: "INR - Indian rupee" },
  { code: "PKR", locale: "en-PK", label: "PKR - Pakistani rupee" },
  { code: "SAR", locale: "en-SA", label: "SAR - Saudi riyal" },
  { code: "QAR", locale: "en-QA", label: "QAR - Qatar riyal" },
];

const defaultPreferences = {
  theme: "light",
  currency: "AED",
  customCurrencies: [],
  profile: {
    name: "Guest budget",
    email: "",
    household: "Personal workspace",
  },
};

const defaultEnvelopes = [
  { name: "Grocery", group: "Regular", planned: 1200, keywords: ["grocery", "supermarket", "market", "carrefour", "lulu", "spinneys", "aldi"] },
  { name: "Fuel", group: "Regular", planned: 550, keywords: ["fuel", "petrol", "gas station", "adnoc", "enoc", "shell", "bp"] },
  { name: "Rent", group: "Regular", planned: 4200, keywords: ["rent", "landlord", "property", "apartment", "lease"] },
  { name: "Education", group: "Regular", planned: 700, keywords: ["school", "university", "tuition", "course", "books", "education"] },
  { name: "Entertainment", group: "Regular", planned: 450, keywords: ["cinema", "movie", "netflix", "spotify", "game", "restaurant", "cafe"] },
  { name: "Utilities", group: "Regular", planned: 850, keywords: ["electric", "water", "internet", "du", "etisalat", "utility", "phone"] },
  { name: "Healthcare", group: "Regular", planned: 350, keywords: ["clinic", "hospital", "pharmacy", "doctor", "medical"] },
  { name: "Emergency Fund", group: "More", planned: 500, target: 12000, keywords: ["savings", "emergency", "transfer to savings"] },
  { name: "Vacation", group: "More", planned: 300, target: 6000, keywords: ["hotel", "flight", "airline", "travel", "booking"] },
  { name: "Debt Payoff", group: "Debt", planned: 900, target: 18000, keywords: ["loan", "credit card", "debt", "repayment", "finance"] },
  { name: "Other", group: "Regular", planned: 250, keywords: [] },
];

const defaultAccounts = ["Main Bank", "Cash", "Credit Card"];

const storedPreferences = JSON.parse(localStorage.getItem("preferences") || "{}");
const configuredApiBaseUrl = localStorage.getItem("apiBaseUrl") || "";
const isFileMode = location.protocol === "file:";
const isGitHubPages = location.hostname.endsWith("github.io");
const apiBaseUrl = configuredApiBaseUrl || (isGitHubPages ? "http://127.0.0.1:8000" : "");
const backendEnabled = Boolean(apiBaseUrl || (!isFileMode && location.protocol.startsWith("http")));

const auth = {
  token: localStorage.getItem("authToken") || "",
  user: null,
  syncTimer: null,
  syncReady: false,
  applyingServerData: false,
  message: backendEnabled
    ? "Create an account to save this browser's data to the laptop database."
    : "Device-only mode. Budget data is saved on this device.",
};

const sampleTransactions = [
  { date: "2026-05-01", description: "Carrefour Hypermarket", amount: 286.4, account: "Main Bank", reference: "Weekly groceries" },
  { date: "2026-05-02", description: "ADNOC Fuel Station", amount: 150, account: "Credit Card", reference: "Car refill" },
  { date: "2026-05-03", description: "Apartment Rent Transfer", amount: 4200, account: "Main Bank", reference: "May rent" },
  { date: "2026-05-05", description: "Online Course Platform", amount: 320, account: "Credit Card", reference: "Excel course" },
  { date: "2026-05-06", description: "Cinema City", amount: 92, account: "Cash", reference: "Family outing" },
  { date: "2026-05-07", description: "Credit Card Repayment", amount: 900, account: "Main Bank", reference: "Debt snowball" },
];

const state = {
  monthlyIncome: Number(localStorage.getItem("monthlyIncome") || 0),
  filledAmount: Number(localStorage.getItem("filledAmount") || 0),
  envelopes: JSON.parse(localStorage.getItem("envelopes") || JSON.stringify(defaultEnvelopes)),
  transactions: JSON.parse(localStorage.getItem("transactions") || "[]").map((transaction) => ({
    ...transaction,
    envelope: transaction.envelope || transaction.category || "Other",
    account: transaction.account || "Main Bank",
  })),
  preferences: {
    ...defaultPreferences,
    ...storedPreferences,
    customCurrencies: Array.isArray(storedPreferences.customCurrencies) ? storedPreferences.customCurrencies : [],
    profile: {
      ...defaultPreferences.profile,
      ...(storedPreferences.profile || {}),
    },
  },
  preview: [],
};

const elements = {
  incomeFilled: document.querySelector("#incomeFilled"),
  plannedBudget: document.querySelector("#plannedBudget"),
  availableBudget: document.querySelector("#availableBudget"),
  totalSpent: document.querySelector("#totalSpent"),
  monthlyIncome: document.querySelector("#monthlyIncome"),
  fillForm: document.querySelector("#fillForm"),
  envelopeGrid: document.querySelector("#envelopeGrid"),
  underfundedAmount: document.querySelector("#underfundedAmount"),
  overspentCount: document.querySelector("#overspentCount"),
  savingsProgress: document.querySelector("#savingsProgress"),
  transactionForm: document.querySelector("#transactionForm"),
  transactionDate: document.querySelector("#transactionDate"),
  transactionDescription: document.querySelector("#transactionDescription"),
  transactionAmount: document.querySelector("#transactionAmount"),
  transactionEnvelope: document.querySelector("#transactionEnvelope"),
  transactionAccount: document.querySelector("#transactionAccount"),
  transactionReference: document.querySelector("#transactionReference"),
  envelopeFilter: document.querySelector("#envelopeFilter"),
  transactionCount: document.querySelector("#transactionCount"),
  transactionsBody: document.querySelector("#transactionsBody"),
  statementFile: document.querySelector("#statementFile"),
  previewBody: document.querySelector("#previewBody"),
  previewCount: document.querySelector("#previewCount"),
  importPreviewButton: document.querySelector("#importPreviewButton"),
  goalGrid: document.querySelector("#goalGrid"),
  rulesGrid: document.querySelector("#rulesGrid"),
  profileAvatar: document.querySelector("#profileAvatar"),
  profileDisplayName: document.querySelector("#profileDisplayName"),
  profileDisplayMeta: document.querySelector("#profileDisplayMeta"),
  accountStatus: document.querySelector("#accountStatus"),
  syncStatus: document.querySelector("#syncStatus"),
  registerForm: document.querySelector("#registerForm"),
  accountName: document.querySelector("#accountName"),
  accountEmail: document.querySelector("#accountEmail"),
  accountHousehold: document.querySelector("#accountHousehold"),
  accountPassword: document.querySelector("#accountPassword"),
  loginForm: document.querySelector("#loginForm"),
  loginEmail: document.querySelector("#loginEmail"),
  loginPassword: document.querySelector("#loginPassword"),
  logoutButton: document.querySelector("#logoutButton"),
  profileForm: document.querySelector("#profileForm"),
  profileName: document.querySelector("#profileName"),
  profileEmail: document.querySelector("#profileEmail"),
  profileHousehold: document.querySelector("#profileHousehold"),
  currencySelect: document.querySelector("#currencySelect"),
  customCurrencyForm: document.querySelector("#customCurrencyForm"),
  customCurrencyCode: document.querySelector("#customCurrencyCode"),
  customCurrencySymbol: document.querySelector("#customCurrencySymbol"),
  customCurrencyName: document.querySelector("#customCurrencyName"),
  darkModeToggle: document.querySelector("#darkModeToggle"),
  loadSampleData: document.querySelector("#loadSampleData"),
  clearDataButton: document.querySelector("#clearDataButton"),
};

function saveState() {
  localStorage.setItem("monthlyIncome", String(state.monthlyIncome));
  localStorage.setItem("filledAmount", String(state.filledAmount));
  localStorage.setItem("envelopes", JSON.stringify(state.envelopes));
  localStorage.setItem("transactions", JSON.stringify(state.transactions));
  localStorage.setItem("preferences", JSON.stringify(state.preferences));
  queueServerSync();
}

function apiUrl(path) {
  return `${apiBaseUrl}${path}`;
}

async function apiRequest(path, options = {}) {
  if (!backendEnabled) {
    throw new Error("Database sync is available only from the laptop backend web app.");
  }

  const response = await fetch(apiUrl(path), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Backend request failed");
  }
  return data;
}

function currentDataSnapshot() {
  return {
    monthlyIncome: state.monthlyIncome,
    filledAmount: state.filledAmount,
    envelopes: state.envelopes,
    transactions: state.transactions,
    preferences: state.preferences,
  };
}

function applyServerData(data) {
  auth.applyingServerData = true;
  state.monthlyIncome = Number(data.monthlyIncome || 0);
  state.filledAmount = Number(data.filledAmount || 0);
  state.envelopes = Array.isArray(data.envelopes) ? data.envelopes : structuredClone(defaultEnvelopes);
  state.transactions = Array.isArray(data.transactions) ? data.transactions : [];
  state.preferences = {
    ...defaultPreferences,
    ...(data.preferences || {}),
    customCurrencies: Array.isArray(data.preferences?.customCurrencies) ? data.preferences.customCurrencies : [],
    profile: {
      ...defaultPreferences.profile,
      ...(data.preferences?.profile || {}),
    },
  };
  elements.monthlyIncome.value = state.monthlyIncome || "";
  renderOptions();
  render();
  auth.applyingServerData = false;
}

function setAuthSession(session) {
  clearTimeout(auth.syncTimer);
  auth.token = session.token;
  auth.user = session.user;
  localStorage.setItem("authToken", auth.token);
  auth.syncReady = true;
}

function clearAuthSession(message = "Signed out. Local changes stay on this device.") {
  clearTimeout(auth.syncTimer);
  auth.token = "";
  auth.user = null;
  auth.syncReady = false;
  localStorage.removeItem("authToken");
  auth.message = message;
  renderAccount();
}

function renderAccount() {
  if (!backendEnabled) {
    elements.accountStatus.textContent = "Device storage";
    elements.syncStatus.textContent = "Device-only mode. Budget data is saved on this device.";
    elements.logoutButton.hidden = true;
    elements.registerForm.hidden = true;
    elements.loginForm.hidden = true;
    return;
  }

  const signedIn = Boolean(auth.user);
  elements.accountStatus.textContent = signedIn ? `Signed in as ${auth.user.email}` : "Local only";
  elements.syncStatus.textContent = signedIn ? auth.message || "Database sync is active." : auth.message;
  elements.logoutButton.hidden = !signedIn;
  elements.registerForm.hidden = signedIn;
  elements.loginForm.hidden = signedIn;
  if (!signedIn) {
    elements.accountName.value = state.preferences.profile.name === defaultPreferences.profile.name ? "" : state.preferences.profile.name;
    elements.accountEmail.value = state.preferences.profile.email;
    elements.accountHousehold.value = state.preferences.profile.household === defaultPreferences.profile.household ? "" : state.preferences.profile.household;
  }
}

async function syncServerNow() {
  if (!auth.token || !auth.syncReady || auth.applyingServerData) return;
  clearTimeout(auth.syncTimer);
  try {
    await apiRequest("/api/data", {
      method: "PUT",
      body: JSON.stringify(currentDataSnapshot()),
    });
    auth.message = `Saved to database for ${auth.user.email}.`;
  } catch (error) {
    auth.message = error.message;
  }
  renderAccount();
}

function queueServerSync() {
  if (!auth.token || !auth.syncReady || auth.applyingServerData) return;
  const token = auth.token;
  clearTimeout(auth.syncTimer);
  auth.message = "Saving to database...";
  renderAccount();
  auth.syncTimer = setTimeout(() => {
    if (auth.token === token) {
      syncServerNow();
    }
  }, 450);
}

async function restoreSession() {
  clearTimeout(auth.syncTimer);
  if (!backendEnabled) {
    auth.token = "";
    auth.user = null;
    auth.syncReady = false;
    localStorage.removeItem("authToken");
    renderAccount();
    return;
  }

  if (!auth.token) {
    renderAccount();
    return;
  }

  try {
    const session = await apiRequest("/api/me");
    auth.user = session.user;
    auth.syncReady = true;
    auth.message = `Database sync is active for ${auth.user.email}.`;
    applyServerData(session.data);
    renderAccount();
  } catch {
    clearAuthSession("Session expired. Sign in again to sync with the database.");
  }
}

function availableCurrencies() {
  return [...currencyOptions, ...state.preferences.customCurrencies];
}

function formatDecimal(value) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(Number(value || 0)));
}

function formatCurrency(value) {
  const amount = Number(value || 0);
  const option = availableCurrencies().find((currency) => currency.code === state.preferences.currency) || currencyOptions[0];
  if (option.custom) {
    const prefix = option.symbol?.trim() || `${option.code} `;
    return `${amount < 0 ? "-" : ""}${prefix}${formatDecimal(amount)}`;
  }

  try {
    return new Intl.NumberFormat(option.locale, {
      style: "currency",
      currency: option.code,
    }).format(amount);
  } catch {
    return `${option.code} ${amount < 0 ? "-" : ""}${formatDecimal(amount)}`;
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (character) => {
    const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
    return entities[character];
  });
}

function envelopeNames() {
  return state.envelopes.map((envelope) => envelope.name);
}

function categorize(description) {
  const text = description.toLowerCase();
  const match = state.envelopes.find((envelope) => envelope.keywords.some((keyword) => text.includes(keyword)));
  return match?.name || "Other";
}

function createTransaction(transaction) {
  const description = transaction.description?.trim() || "Imported transaction";
  return {
    id: crypto.randomUUID(),
    date: transaction.date || new Date().toISOString().slice(0, 10),
    description,
    amount: Math.abs(Number(transaction.amount || 0)),
    envelope: transaction.envelope || categorize(description),
    account: transaction.account || "Main Bank",
    reference: transaction.reference?.trim() || "",
  };
}

function envelopeStats(name) {
  const envelope = state.envelopes.find((item) => item.name === name);
  const spent = state.transactions
    .filter((transaction) => transaction.envelope === name)
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const funded = state.filledAmount > 0 ? envelope.planned : 0;
  return { envelope, spent, funded, available: funded - spent };
}

function renderOptions() {
  const envelopeOptions = envelopeNames().map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");
  elements.transactionEnvelope.innerHTML = envelopeOptions;
  elements.envelopeFilter.innerHTML = [`<option value="All">All</option>`, envelopeOptions].join("");
  elements.transactionAccount.innerHTML = defaultAccounts.map((name) => `<option value="${name}">${name}</option>`).join("");
  elements.currencySelect.innerHTML = availableCurrencies()
    .map((currency) => `<option value="${currency.code}">${currency.label}</option>`)
    .join("");
}

function applyTheme() {
  document.body.dataset.theme = state.preferences.theme;
  document.querySelector('meta[name="theme-color"]').setAttribute(
    "content",
    state.preferences.theme === "dark" ? "#10272d" : "#20505c",
  );
}

function renderProfile() {
  const { name, email, household } = state.preferences.profile;
  const displayName = name.trim() || defaultPreferences.profile.name;
  const displayMeta = household.trim() || email.trim() || defaultPreferences.profile.household;

  elements.profileAvatar.textContent = displayName.slice(0, 1).toUpperCase();
  elements.profileDisplayName.textContent = displayName;
  elements.profileDisplayMeta.textContent = displayMeta;
  elements.profileName.value = name;
  elements.profileEmail.value = email;
  elements.profileHousehold.value = household;
  elements.currencySelect.value = state.preferences.currency;
  elements.darkModeToggle.checked = state.preferences.theme === "dark";
  renderAccount();
}

function addCustomCurrency() {
  const code = elements.customCurrencyCode.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  const symbol = elements.customCurrencySymbol.value.trim();
  const name = elements.customCurrencyName.value.trim();

  if (!code || !name) {
    alert("Add a currency code and name to save it.");
    return;
  }

  if (currencyOptions.some((currency) => currency.code === code)) {
    state.preferences.currency = code;
    elements.customCurrencyForm.reset();
    render();
    return;
  }

  const customCurrency = {
    code,
    symbol,
    label: `${code} - ${name}`,
    custom: true,
  };

  state.preferences.customCurrencies = [
    ...state.preferences.customCurrencies.filter((currency) => currency.code !== code),
    customCurrency,
  ];
  state.preferences.currency = code;
  elements.customCurrencyForm.reset();
  renderOptions();
  render();
}

function syncProfileDraft() {
  state.preferences.profile = {
    name: elements.profileName.value.trim() || defaultPreferences.profile.name,
    email: elements.profileEmail.value.trim(),
    household: elements.profileHousehold.value.trim() || defaultPreferences.profile.household,
  };
}

function renderSummary() {
  const planned = state.envelopes.reduce((sum, envelope) => sum + envelope.planned, 0);
  const spent = state.transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const available = state.filledAmount - spent;
  const underfunded = Math.max(planned - state.filledAmount, 0);
  const overspent = state.envelopes.filter((envelope) => envelopeStats(envelope.name).available < 0).length;
  const savingsEnvelopes = state.envelopes.filter((envelope) => envelope.target);
  const savingsPlanned = savingsEnvelopes.reduce((sum, envelope) => sum + envelope.planned, 0);
  const savingsTargets = savingsEnvelopes.reduce((sum, envelope) => sum + envelope.target, 0);

  elements.incomeFilled.textContent = formatCurrency(state.filledAmount);
  elements.plannedBudget.textContent = formatCurrency(planned);
  elements.availableBudget.textContent = formatCurrency(available);
  elements.totalSpent.textContent = formatCurrency(spent);
  elements.underfundedAmount.textContent = formatCurrency(underfunded);
  elements.overspentCount.textContent = String(overspent);
  elements.savingsProgress.textContent = `${Math.round((savingsPlanned / savingsTargets) * 100)}%`;
  elements.availableBudget.style.color = available < 0 ? "#ffd1d1" : "#fff";
}

function renderEnvelopes() {
  elements.envelopeGrid.innerHTML = state.envelopes
    .map((envelope) => {
      const stats = envelopeStats(envelope.name);
      const percent = Math.min((stats.spent / Math.max(envelope.planned, 1)) * 100, 120);
      const status = stats.available < 0 ? "overspent" : percent > 80 ? "watch" : "good";
      return `
        <article class="envelope-card ${status}">
          <header>
            <div><span>${escapeHtml(envelope.group)}</span><h3>${escapeHtml(envelope.name)}</h3></div>
            <strong>${formatCurrency(stats.available)}</strong>
          </header>
          <div class="meter" aria-hidden="true"><span style="width: ${Math.min(percent, 100)}%"></span></div>
          <dl>
            <div><dt>Planned</dt><dd>${formatCurrency(envelope.planned)}</dd></div>
            <div><dt>Spent</dt><dd>${formatCurrency(stats.spent)}</dd></div>
          </dl>
        </article>
      `;
    })
    .join("");
}

function renderTransactions() {
  const selectedEnvelope = elements.envelopeFilter.value || "All";
  const transactions = state.transactions.filter(
    (transaction) => selectedEnvelope === "All" || transaction.envelope === selectedEnvelope,
  );

  elements.transactionCount.textContent = `${transactions.length} transaction${transactions.length === 1 ? "" : "s"}`;

  if (!transactions.length) {
    elements.transactionsBody.innerHTML = `<tr><td class="empty-state" colspan="6">No spending recorded yet.</td></tr>`;
    return;
  }

  elements.transactionsBody.innerHTML = transactions
    .map(
      (transaction) => `
        <tr>
          <td>${escapeHtml(transaction.date)}</td>
          <td>${escapeHtml(transaction.description)}</td>
          <td><span class="category-pill">${escapeHtml(transaction.envelope)}</span></td>
          <td>${escapeHtml(transaction.account)}</td>
          <td>${escapeHtml(transaction.reference || "-")}</td>
          <td class="amount-cell">${formatCurrency(transaction.amount)}</td>
        </tr>
      `,
    )
    .join("");
}

function renderPreview() {
  elements.importPreviewButton.disabled = state.preview.length === 0;
  elements.previewCount.textContent = state.preview.length ? `${state.preview.length} transactions ready` : "No preview loaded";

  if (!state.preview.length) {
    elements.previewBody.innerHTML = `<tr><td class="empty-state" colspan="6">Upload a CSV file or load the sample month.</td></tr>`;
    return;
  }

  elements.previewBody.innerHTML = state.preview
    .map(
      (transaction) => `
        <tr>
          <td>${escapeHtml(transaction.date)}</td>
          <td>${escapeHtml(transaction.description)}</td>
          <td><span class="category-pill">${escapeHtml(transaction.envelope)}</span></td>
          <td>${escapeHtml(transaction.account)}</td>
          <td>${escapeHtml(transaction.reference || "-")}</td>
          <td class="amount-cell">${formatCurrency(transaction.amount)}</td>
        </tr>
      `,
    )
    .join("");
}

function renderGoals() {
  const goals = state.envelopes.filter((envelope) => envelope.target);
  elements.goalGrid.innerHTML = goals
    .map((goal) => {
      const saved = goal.planned;
      const percent = Math.min((saved / goal.target) * 100, 100);
      const remaining = goal.target - saved;
      return `
        <article class="goal-card">
          <header><div><span>${escapeHtml(goal.group)}</span><h3>${escapeHtml(goal.name)}</h3></div><strong>${Math.round(percent)}%</strong></header>
          <div class="meter" aria-hidden="true"><span style="width: ${percent}%"></span></div>
          <p>${formatCurrency(saved)} planned toward ${formatCurrency(goal.target)}. ${formatCurrency(Math.max(remaining, 0))} remaining.</p>
        </article>
      `;
    })
    .join("");
}

function renderRules() {
  elements.rulesGrid.innerHTML = state.envelopes
    .map(
      (envelope) => `
        <article class="rule-card">
          <h3>${escapeHtml(envelope.name)}</h3>
          <div class="keyword-list">
            ${(envelope.keywords.length ? envelope.keywords : ["manual review"])
              .map((keyword) => `<span>${escapeHtml(keyword)}</span>`)
              .join("")}
          </div>
        </article>
      `,
    )
    .join("");
}

function render() {
  saveState();
  applyTheme();
  renderSummary();
  renderEnvelopes();
  renderTransactions();
  renderPreview();
  renderGoals();
  renderRules();
  renderProfile();
}

function splitCsvLine(line) {
  const values = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const next = line[index + 1];
    if (character === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }

  values.push(current.trim());
  return values;
}

function parseStatementCsv(csvText) {
  const lines = csvText.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]).map((header) => header.toLowerCase().trim());
  const dateIndex = headers.findIndex((header) => ["date", "transaction date"].includes(header));
  const descriptionIndex = headers.findIndex((header) => ["description", "details", "merchant", "narration"].includes(header));
  const amountIndex = headers.findIndex((header) => ["amount", "debit", "withdrawal", "spent"].includes(header));
  const accountIndex = headers.findIndex((header) => ["account", "source"].includes(header));
  const referenceIndex = headers.findIndex((header) => ["reference", "ref", "notes", "memo"].includes(header));

  return lines.slice(1).map(splitCsvLine).reduce((transactions, row) => {
    const description = row[descriptionIndex] || "Imported transaction";
    const amount = Number(String(row[amountIndex] || "0").replace(/[^0-9.-]/g, ""));
    if (!amount) return transactions;

    transactions.push(
      createTransaction({
        date: row[dateIndex] || new Date().toISOString().slice(0, 10),
        description,
        amount,
        account: row[accountIndex] || "Main Bank",
        reference: referenceIndex >= 0 ? row[referenceIndex] : "",
      }),
    );
    return transactions;
  }, []);
}

function setView(viewName) {
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewName);
  });
  document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
  document.querySelector(`#${viewName}View`).classList.add("active");
}

function bindEvents() {
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });

  elements.fillForm.addEventListener("submit", (event) => {
    event.preventDefault();
    state.monthlyIncome = Number(elements.monthlyIncome.value || 0);
    state.filledAmount = state.monthlyIncome;
    render();
  });

  elements.transactionForm.addEventListener("submit", (event) => {
    event.preventDefault();
    state.transactions.unshift(
      createTransaction({
        date: elements.transactionDate.value,
        description: elements.transactionDescription.value,
        amount: elements.transactionAmount.value,
        envelope: elements.transactionEnvelope.value,
        account: elements.transactionAccount.value,
        reference: elements.transactionReference.value,
      }),
    );
    elements.transactionForm.reset();
    elements.transactionDate.value = new Date().toISOString().slice(0, 10);
    render();
  });

  elements.envelopeFilter.addEventListener("change", renderTransactions);

  elements.currencySelect.addEventListener("change", () => {
    syncProfileDraft();
    state.preferences.currency = elements.currencySelect.value;
    render();
  });

  elements.customCurrencyForm.addEventListener("submit", (event) => {
    event.preventDefault();
    syncProfileDraft();
    addCustomCurrency();
  });

  elements.darkModeToggle.addEventListener("change", () => {
    syncProfileDraft();
    state.preferences.theme = elements.darkModeToggle.checked ? "dark" : "light";
    render();
  });

  elements.profileForm.addEventListener("submit", (event) => {
    event.preventDefault();
    syncProfileDraft();
    render();
  });

  elements.registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    syncProfileDraft();
    try {
      const session = await apiRequest("/api/register", {
        method: "POST",
        body: JSON.stringify({
          name: elements.accountName.value,
          email: elements.accountEmail.value,
          household: elements.accountHousehold.value,
          password: elements.accountPassword.value,
        }),
      });
      setAuthSession(session);
      state.preferences.profile = {
        ...state.preferences.profile,
        name: session.user.name,
        email: session.user.email,
        household: session.user.household,
      };
      elements.accountPassword.value = "";
      auth.message = `Account created. Saved to database for ${session.user.email}.`;
      render();
      await syncServerNow();
    } catch (error) {
      auth.message = error.message;
      renderAccount();
    }
  });

  elements.loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const session = await apiRequest("/api/login", {
        method: "POST",
        body: JSON.stringify({
          email: elements.loginEmail.value,
          password: elements.loginPassword.value,
        }),
      });
      setAuthSession(session);
      elements.loginPassword.value = "";
      auth.message = `Signed in as ${session.user.email}.`;
      applyServerData(session.data);
      renderAccount();
    } catch (error) {
      auth.message = error.message;
      renderAccount();
    }
  });

  elements.logoutButton.addEventListener("click", async () => {
    try {
      await syncServerNow();
      await apiRequest("/api/logout", { method: "POST", body: "{}" });
    } catch {
      // Signing out locally is still useful if the backend is offline.
    }
    clearAuthSession();
  });

  elements.statementFile.addEventListener("change", async () => {
    const file = elements.statementFile.files[0];
    state.preview = file ? parseStatementCsv(await file.text()) : [];
    renderPreview();
  });

  elements.importPreviewButton.addEventListener("click", () => {
    state.transactions = [...state.preview, ...state.transactions];
    state.preview = [];
    elements.statementFile.value = "";
    setView("dashboard");
    render();
  });

  elements.loadSampleData.addEventListener("click", () => {
    state.monthlyIncome = 10200;
    state.filledAmount = 10200;
    elements.monthlyIncome.value = state.monthlyIncome;
    state.preview = sampleTransactions.map(createTransaction);
    setView("import");
    render();
  });

  elements.clearDataButton.addEventListener("click", () => {
    if (!confirm("Clear all local budget and transaction data from this browser?")) return;
    state.monthlyIncome = 0;
    state.filledAmount = 0;
    state.envelopes = structuredClone(defaultEnvelopes);
    state.transactions = [];
    state.preview = [];
    elements.monthlyIncome.value = "";
    renderOptions();
    render();
  });
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("service-worker.js");
  }
}

function init() {
  elements.monthlyIncome.value = state.monthlyIncome || "";
  elements.transactionDate.value = new Date().toISOString().slice(0, 10);
  renderOptions();
  applyTheme();
  bindEvents();
  render();
  restoreSession();
  registerServiceWorker();
}

init();