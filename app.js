const STORAGE_KEY = "gharkhata-expenses-v1";
const CATEGORY_KEY = "gharkhata-categories-v1";

const colors = ["#00bceb", "#005073", "#6ebe4a", "#fbab18", "#049fd9", "#097dbc", "#7f5af0", "#ef4565", "#2cb67d"];

const defaultCategories = [
  {
    name: "Utilities & Bills",
    items: [
      ["BESCOM", "monthly"],
      ["Water Bill", "monthly"],
      ["Internet Bill", "monthly"],
      ["Airtel Mobile", "monthly"],
      ["Tata Play", "monthly"],
      ["Gas Cylinder", "quarterly"]
    ]
  },
  {
    name: "Household Help & Services",
    items: [
      ["Maid Salary", "monthly"],
      ["Inspector Shop", "occasional"]
    ]
  },
  {
    name: "Food & Groceries",
    items: [
      ["Vegetables", "daily"],
      ["Groceries", "daily"],
      ["Food outside expense", "occasional"],
      ["Food in Cisco", "daily"]
    ]
  },
  {
    name: "Travel & Transport",
    items: [
      ["Petrol", "monthly"],
      ["Metro Card", "monthly"],
      ["Auto charges", "occasional"],
      ["KSRTC tickets", "quarterly"]
    ]
  },
  {
    name: "Family Allowances",
    items: [
      ["Nikita Pay std", "monthly"],
      ["Nikita Pay misc", "occasional"],
      ["Raghav Pay", "monthly"]
    ]
  },
  {
    name: "Investments & Insurance",
    items: [
      ["Raghav MF 1", "monthly"],
      ["Raghav MF 2", "monthly"],
      ["LIC", "monthly"],
      ["Stock purchase domestic", "occasional"],
      ["Stock purchase international", "occasional"]
    ]
  },
  {
    name: "Health & Wellness",
    items: [
      ["Doctor consultation charge", "occasional"],
      ["Medicine / pills", "occasional"],
      ["Cosmetic purchase", "occasional"]
    ]
  },
  {
    name: "Personal, Learning & Worship",
    items: [
      ["Clothes", "quarterly"],
      ["Books and Stationaries", "quarterly"],
      ["Flower", "daily"],
      ["Temple / Hundi", "occasional"]
    ]
  }
];

const state = {
  expenses: loadJson(STORAGE_KEY, []),
  categories: loadJson(CATEGORY_KEY, defaultCategories),
  selectedMonth: currentMonthKey()
};

const els = {
  form: document.querySelector("#expenseForm"),
  date: document.querySelector("#dateInput"),
  amount: document.querySelector("#amountInput"),
  item: document.querySelector("#itemInput"),
  notes: document.querySelector("#notesInput"),
  notesCount: document.querySelector("#notesCount"),
  monthTotal: document.querySelector("#monthTotal"),
  monthDelta: document.querySelector("#monthDelta"),
  dailyAverage: document.querySelector("#dailyAverage"),
  entryCount: document.querySelector("#entryCount"),
  topCategory: document.querySelector("#topCategory"),
  topCategoryAmount: document.querySelector("#topCategoryAmount"),
  monthFilter: document.querySelector("#monthFilter"),
  chartTotal: document.querySelector("#chartTotal"),
  chartSubtitle: document.querySelector("#chartSubtitle"),
  categoryChart: document.querySelector("#categoryChart"),
  trendChart: document.querySelector("#trendChart"),
  categoryLegend: document.querySelector("#categoryLegend"),
  categoryList: document.querySelector("#categoryList"),
  categoryCount: document.querySelector("#categoryCount"),
  expenseList: document.querySelector("#expenseList"),
  manageCategories: document.querySelector("#manageCategories"),
  categoryDialog: document.querySelector("#categoryDialog"),
  newCategory: document.querySelector("#newCategoryInput"),
  newItem: document.querySelector("#newItemInput"),
  newCadence: document.querySelector("#newCadenceInput"),
  categoryNames: document.querySelector("#categoryNames"),
  addCategoryItem: document.querySelector("#addCategoryItem"),
  reportForm: document.querySelector("#reportForm"),
  email: document.querySelector("#emailInput"),
  reportType: document.querySelector("#reportType"),
  seedDemo: document.querySelector("#seedDemo"),
  clearData: document.querySelector("#clearData")
};

els.date.value = formatDateInput(new Date());

render();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

els.form.addEventListener("submit", (event) => {
  event.preventDefault();
  const item = findItem(els.item.value);
  const amount = Number(els.amount.value);

  if (!item || !amount || amount < 1) {
    return;
  }

  state.expenses.unshift({
    id: crypto.randomUUID(),
    date: els.date.value,
    amount,
    item: item.item,
    category: item.category,
    cadence: item.cadence,
    notes: els.notes.value.trim().slice(0, 20),
    createdAt: new Date().toISOString()
  });

  saveJson(STORAGE_KEY, state.expenses);
  state.selectedMonth = monthKey(els.date.value);
  els.amount.value = "";
  els.notes.value = "";
  updateNotesCount();
  render();
});

els.notes.addEventListener("input", () => {
  if (els.notes.value.length > 20) {
    els.notes.value = els.notes.value.slice(0, 20);
  }
  updateNotesCount();
});

els.monthFilter.addEventListener("change", () => {
  state.selectedMonth = els.monthFilter.value;
  renderDashboard();
});

els.manageCategories.addEventListener("click", () => {
  els.newCategory.value = "";
  els.newItem.value = "";
  els.categoryDialog.showModal();
});

els.addCategoryItem.addEventListener("click", () => {
  const categoryName = els.newCategory.value.trim();
  const itemName = els.newItem.value.trim();
  if (!categoryName || !itemName) return;

  let group = state.categories.find((category) => category.name.toLowerCase() === categoryName.toLowerCase());
  if (!group) {
    group = { name: categoryName, items: [] };
    state.categories.push(group);
  }

  if (!group.items.some(([name]) => name.toLowerCase() === itemName.toLowerCase())) {
    group.items.push([itemName, els.newCadence.value]);
  }

  saveJson(CATEGORY_KEY, state.categories);
  els.categoryDialog.close();
  render();
});

els.reportForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const report = buildReport(els.reportType.value, state.selectedMonth);
  const subject = encodeURIComponent(`GharKhata report - ${formatMonth(state.selectedMonth)}`);
  const body = encodeURIComponent(report);
  window.location.href = `mailto:${encodeURIComponent(els.email.value)}?subject=${subject}&body=${body}`;
});

els.seedDemo.addEventListener("click", () => {
  if (state.expenses.length && !confirm("Add sample entries to existing data?")) return;
  state.expenses = [...sampleExpenses(), ...state.expenses];
  saveJson(STORAGE_KEY, state.expenses);
  render();
});

els.clearData.addEventListener("click", () => {
  if (!state.expenses.length || !confirm("Clear all saved expenses from this device?")) return;
  state.expenses = [];
  saveJson(STORAGE_KEY, state.expenses);
  render();
});

function render() {
  updateNotesCount();
  renderItemOptions();
  renderMonthOptions();
  renderCategories();
  renderDashboard();
}

function updateNotesCount() {
  els.notesCount.textContent = `${els.notes.value.length}/20`;
}

function renderItemOptions() {
  els.item.innerHTML = allItems()
    .map((item) => `<option value="${escapeHtml(item.item)}">${escapeHtml(item.item)} - ${escapeHtml(item.category)}</option>`)
    .join("");
}

function renderMonthOptions() {
  const months = [...new Set([currentMonthKey(), ...state.expenses.map((expense) => monthKey(expense.date))])].sort().reverse();
  if (!months.includes(state.selectedMonth)) {
    state.selectedMonth = months[0] || currentMonthKey();
  }

  els.monthFilter.innerHTML = months
    .map((key) => `<option value="${key}" ${key === state.selectedMonth ? "selected" : ""}>${formatMonth(key)}</option>`)
    .join("");
}

function renderCategories() {
  const items = allItems();
  els.categoryCount.textContent = `${items.length} items`;
  els.categoryNames.innerHTML = state.categories.map((category) => `<option value="${escapeHtml(category.name)}"></option>`).join("");
  els.categoryList.innerHTML = state.categories
    .map((category, index) => {
      const chips = category.items
        .map(([item, cadence]) => `<span class="chip ${cadence}">${escapeHtml(item)} · ${cadenceLabel(cadence)}</span>`)
        .join("");
      return `
        <details class="category-group" ${index < 3 ? "open" : ""}>
          <summary>${escapeHtml(category.name)} <small>${category.items.length} items</small></summary>
          <div class="category-items">${chips}</div>
        </details>
      `;
    })
    .join("");
}

function renderDashboard() {
  const monthExpenses = state.expenses.filter((expense) => monthKey(expense.date) === state.selectedMonth);
  const monthTotal = sum(monthExpenses);
  const daysElapsed = state.selectedMonth === currentMonthKey() ? new Date().getDate() : daysInMonth(state.selectedMonth);
  const grouped = groupByCategory(monthExpenses);
  const top = [...grouped.entries()].sort((a, b) => b[1] - a[1])[0];
  const previousMonth = shiftMonth(state.selectedMonth, -1);
  const previousTotal = sum(state.expenses.filter((expense) => monthKey(expense.date) === previousMonth));

  els.monthTotal.textContent = formatInr(monthTotal);
  els.monthDelta.textContent = previousTotal ? `${deltaText(monthTotal, previousTotal)} vs previous month` : formatMonth(state.selectedMonth);
  els.dailyAverage.textContent = formatInr(Math.round(monthTotal / Math.max(daysElapsed, 1)));
  els.entryCount.textContent = `${monthExpenses.length} ${monthExpenses.length === 1 ? "entry" : "entries"}`;
  els.topCategory.textContent = top ? top[0] : "-";
  els.topCategoryAmount.textContent = top ? formatInr(top[1]) : "₹0";
  els.chartTotal.textContent = formatInr(monthTotal);
  els.chartSubtitle.textContent = `${formatMonth(state.selectedMonth)} by category`;

  renderCategoryChart(grouped, monthTotal);
  renderTrendChart();
  renderExpenseList(monthExpenses);
}

function renderCategoryChart(grouped, total) {
  const canvas = els.categoryChart;
  const ctx = canvas.getContext("2d");
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radius = 78;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!total) {
    drawEmptyDonut(ctx, cx, cy, radius, "No data");
    els.categoryLegend.innerHTML = `<div class="empty-state">Add expenses to see category mix.</div>`;
    return;
  }

  let start = -Math.PI / 2;
  const entries = [...grouped.entries()].sort((a, b) => b[1] - a[1]);

  entries.forEach(([category, amount], index) => {
    const slice = (amount / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, start, start + slice);
    ctx.closePath();
    ctx.fillStyle = colors[index % colors.length];
    ctx.fill();
    start += slice;
  });

  ctx.beginPath();
  ctx.arc(cx, cy, 44, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.fillStyle = "#005073";
  ctx.font = "700 15px system-ui";
  ctx.textAlign = "center";
  ctx.fillText("Total", cx, cy - 4);
  ctx.font = "800 18px system-ui";
  ctx.fillText(compactInr(total), cx, cy + 20);

  els.categoryLegend.innerHTML = entries
    .map(([category, amount], index) => {
      const percent = Math.round((amount / total) * 100);
      return `
        <div class="legend-item">
          <span class="legend-dot" style="background:${colors[index % colors.length]}"></span>
          <span>${escapeHtml(category)} · ${percent}%</span>
        </div>
      `;
    })
    .join("");
}

function renderTrendChart() {
  const canvas = els.trendChart;
  const ctx = canvas.getContext("2d");
  const months = lastSixMonths();
  const totals = months.map((key) => sum(state.expenses.filter((expense) => monthKey(expense.date) === key)));
  const max = Math.max(...totals, 1);
  const left = 28;
  const bottom = canvas.height - 28;
  const width = canvas.width - left - 10;
  const barGap = 8;
  const barWidth = (width - barGap * (months.length - 1)) / months.length;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#dce8ef";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left, 12);
  ctx.lineTo(left, bottom);
  ctx.lineTo(canvas.width - 4, bottom);
  ctx.stroke();

  months.forEach((key, index) => {
    const amount = totals[index];
    const height = Math.max((amount / max) * 104, amount ? 6 : 0);
    const x = left + index * (barWidth + barGap);
    const y = bottom - height;
    ctx.fillStyle = key === state.selectedMonth ? "#005073" : "#00bceb";
    roundRect(ctx, x, y, barWidth, height, 5);
    ctx.fill();
    ctx.fillStyle = "#657481";
    ctx.font = "700 10px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(formatShortMonth(key), x + barWidth / 2, bottom + 16);
  });
}

function renderExpenseList(expenses) {
  const rows = expenses.slice(0, 12);
  if (!rows.length) {
    els.expenseList.innerHTML = `<div class="empty-state">No expenses saved for ${formatMonth(state.selectedMonth)}.</div>`;
    return;
  }

  els.expenseList.innerHTML = rows
    .map((expense) => `
      <article class="expense-row">
        <strong>${escapeHtml(expense.item)}</strong>
        <span>${formatInr(expense.amount)}</span>
        <small>${escapeHtml(expense.category)} · ${formatDate(expense.date)}${expense.notes ? ` · ${escapeHtml(expense.notes)}` : ""}</small>
      </article>
    `)
    .join("");
}

function buildReport(type, month) {
  const rows = state.expenses.filter((expense) => monthKey(expense.date) === month);
  const total = sum(rows);
  const grouped = [...groupByCategory(rows).entries()].sort((a, b) => b[1] - a[1]);
  const lines = [
    "From: do-not-reply@gmail.com",
    `GharKhata report for ${formatMonth(month)}`,
    `Total: ${formatInr(total)}`,
    ""
  ];

  if (type === "analysis" || type === "both") {
    lines.push("Analysis");
    if (grouped.length) {
      grouped.forEach(([category, amount]) => {
        const percent = total ? Math.round((amount / total) * 100) : 0;
        lines.push(`- ${category}: ${formatInr(amount)} (${percent}%)`);
      });
    } else {
      lines.push("- No expenses recorded.");
    }
    lines.push("");
  }

  if (type === "raw" || type === "both") {
    lines.push("Raw expenses");
    if (rows.length) {
      rows
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date))
        .forEach((expense) => {
          lines.push(`${expense.date}, ${expense.category}, ${expense.item}, ${formatInr(expense.amount)}, ${expense.notes || "-"}`);
        });
    } else {
      lines.push("No expenses recorded.");
    }
  }

  return lines.join("\n");
}

function allItems() {
  return state.categories.flatMap((category) =>
    category.items.map(([item, cadence]) => ({ category: category.name, item, cadence }))
  );
}

function findItem(itemName) {
  return allItems().find((item) => item.item === itemName);
}

function groupByCategory(expenses) {
  return expenses.reduce((map, expense) => {
    map.set(expense.category, (map.get(expense.category) || 0) + expense.amount);
    return map;
  }, new Map());
}

function sum(expenses) {
  return expenses.reduce((total, expense) => total + Number(expense.amount || 0), 0);
}

function sampleExpenses() {
  const today = new Date();
  const days = [1, 2, 3, 5, 6, 9, 12, 15, 18, 21];
  const samples = [
    ["BESCOM", 1840, "paid"],
    ["Groceries", 3260, "weekly"],
    ["Petrol", 2500, "car"],
    ["Food in Cisco", 420, "lunch"],
    ["Vegetables", 560, "fresh"],
    ["Maid Salary", 3500, "month"],
    ["Airtel Mobile", 999, "plan"],
    ["Medicine / pills", 780, "cold"],
    ["Temple / Hundi", 300, "visit"],
    ["Metro Card", 1000, "topup"]
  ];

  return samples.map(([itemName, amount, notes], index) => {
    const item = findItem(itemName);
    const date = new Date(today.getFullYear(), today.getMonth(), Math.min(days[index], today.getDate()));
    return {
      id: crypto.randomUUID(),
      date: formatDateInput(date),
      amount,
      item: item.item,
      category: item.category,
      cadence: item.cadence,
      notes,
      createdAt: new Date().toISOString()
    };
  });
}

function loadJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function formatInr(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value || 0);
}

function compactInr(value) {
  if (value >= 100000) return `₹${Math.round(value / 100000)}L`;
  if (value >= 1000) return `₹${Math.round(value / 1000)}K`;
  return `₹${Math.round(value || 0)}`;
}

function currentMonthKey() {
  return monthKey(formatDateInput(new Date()));
}

function monthKey(date) {
  return date.slice(0, 7);
}

function formatMonth(key) {
  const [year, month] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
}

function formatShortMonth(key) {
  const [year, month] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", { month: "short" }).format(new Date(year, month - 1, 1));
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(new Date(`${date}T00:00:00`));
}

function shiftMonth(key, shift) {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(year, month - 1 + shift, 1);
  return formatDateInput(date).slice(0, 7);
}

function daysInMonth(key) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

function lastSixMonths() {
  return Array.from({ length: 6 }, (_, index) => shiftMonth(currentMonthKey(), index - 5));
}

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function deltaText(current, previous) {
  const delta = current - previous;
  const percent = Math.round((delta / previous) * 100);
  if (delta === 0) return "Flat";
  return `${delta > 0 ? "+" : ""}${percent}%`;
}

function cadenceLabel(cadence) {
  return {
    monthly: "monthly",
    daily: "daily",
    quarterly: "2-3 mo",
    occasional: "as needed"
  }[cadence] || cadence;
}

function drawEmptyDonut(ctx, cx, cy, radius, text) {
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = "#edf5f9";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, 48, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.fillStyle = "#657481";
  ctx.font = "800 16px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(text, cx, cy + 5);
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}
