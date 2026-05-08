const currencyFormatter = new Intl.NumberFormat("en-AE", {
  style: "currency",
  currency: "AED",
});

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
  loadSampleData: document.querySelector("#loadSampleData"),
  clearDataButton: document.querySelector("#clearDataButton"),
};

function saveState() {
  localStorage.setItem("monthlyIncome", String(state.monthlyIncome));
  localStorage.setItem("filledAmount", String(state.filledAmount));
  localStorage.setItem("envelopes", JSON.stringify(state.envelopes));
  localStorage.setItem("transactions", JSON.stringify(state.transactions));
}

function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0));
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
  renderSummary();
  renderEnvelopes();
  renderTransactions();
  renderPreview();
  renderGoals();
  renderRules();
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
  bindEvents();
  render();
  registerServiceWorker();
}

init();