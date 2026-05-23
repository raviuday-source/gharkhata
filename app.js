const STORAGE_KEY = "gharkhata-expenses-v1";
const CATEGORY_KEY = "gharkhata-categories-v1";
const PASSCODE = "1234";
const PASSCODE_SESSION_KEY = "gharkhata-unlocked-v1";
const FIREBASE_SDK_VERSION = "12.13.0";
const FIREBASE_CONFIG = window.GHARKHATA_FIREBASE_CONFIG || {};
const FIREBASE_HOUSEHOLD_ID = window.GHARKHATA_HOUSEHOLD_ID || "ghar-khata-home";

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
      ["Bakery & Snacks", "daily"],
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
    name: "Clothing, Stationary & Flower/Temple",
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
  categories: loadJson(CATEGORY_KEY, cloneCategories(defaultCategories)),
  selectedMonth: currentMonthKey(),
  categoryQuery: "",
  currentPage: routeFromHash()
};

const firebaseStore = {
  started: false,
  connected: false,
  firstExpenseSnapshot: true,
  db: null,
  api: null,
  expensesRef: null,
  categoriesRef: null,
  unsubscribers: []
};

const els = {
  pages: [...document.querySelectorAll("[data-page]")],
  appShell: document.querySelector("#appShell"),
  passcodeScreen: document.querySelector("#passcodeScreen"),
  passcodeForm: document.querySelector("#passcodeForm"),
  passcodeInput: document.querySelector("#passcodeInput"),
  passcodeError: document.querySelector("#passcodeError"),
  syncStatus: document.querySelector("#syncStatus"),
  form: document.querySelector("#expenseForm"),
  date: document.querySelector("#dateInput"),
  amount: document.querySelector("#amountInput"),
  item: document.querySelector("#itemInput"),
  categoryPicker: document.querySelector("#categoryPicker"),
  categoryPickerText: document.querySelector("#categoryPickerText"),
  categoryPickerMeta: document.querySelector("#categoryPickerMeta"),
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
  bottomPieChart: document.querySelector("#bottomPieChart"),
  bottomPieLegend: document.querySelector("#bottomPieLegend"),
  bottomPieSubtitle: document.querySelector("#bottomPieSubtitle"),
  bottomPieTotal: document.querySelector("#bottomPieTotal"),
  trendChart: document.querySelector("#trendChart"),
  categoryLegend: document.querySelector("#categoryLegend"),
  categoryList: document.querySelector("#categoryList"),
  categoryCount: document.querySelector("#categoryCount"),
  categoryLinkCount: document.querySelector("#categoryLinkCount"),
  categorySearch: document.querySelector("#categorySearch"),
  expenseList: document.querySelector("#expenseList"),
  manageCategories: document.querySelector("#manageCategories"),
  categoryDialog: document.querySelector("#categoryDialog"),
  newCategory: document.querySelector("#newCategoryInput"),
  newItem: document.querySelector("#newItemInput"),
  newCadence: document.querySelector("#newCadenceInput"),
  categoryNames: document.querySelector("#categoryNames"),
  addCategoryItem: document.querySelector("#addCategoryItem"),
  itemDialog: document.querySelector("#itemDialog"),
  itemPickerList: document.querySelector("#itemPickerList"),
  closeItemDialog: document.querySelector("#closeItemDialog"),
  lockApp: document.querySelector("#lockApp")
};

els.date.value = formatDateInput(new Date());

setupPasscode();
render();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

window.addEventListener("hashchange", () => {
  renderRoute(true);
});

els.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const item = findItem(els.item.value);
  const amount = Number(els.amount.value);

  if (!item || !amount || amount < 1) {
    return;
  }

  const expense = {
    id: crypto.randomUUID(),
    date: els.date.value,
    amount,
    item: item.item,
    category: item.category,
    cadence: item.cadence,
    notes: els.notes.value.trim().slice(0, 20),
    createdAt: new Date().toISOString()
  };

  try {
    await addExpense(expense);
  } catch (error) {
    console.warn("Firestore save failed; keeping the entry on this phone.", error);
    saveExpenseLocally(expense);
    setSyncStatus("Saved locally - Firestore error", "warning");
  }

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

els.categorySearch.addEventListener("input", () => {
  state.categoryQuery = els.categorySearch.value.trim();
  renderCategories();
});

els.categoryPicker.addEventListener("click", () => {
  els.itemDialog.showModal();
});

els.closeItemDialog.addEventListener("click", () => {
  els.itemDialog.close();
});

els.itemPickerList.addEventListener("click", (event) => {
  const option = event.target.closest("[data-item]");
  if (!option) return;
  els.item.value = option.dataset.item;
  renderCategoryPickerSelection();
  renderItemPickerList();
  els.itemDialog.close();
});

els.manageCategories.addEventListener("click", () => {
  els.newCategory.value = "";
  els.newItem.value = "";
  els.categoryDialog.showModal();
});

els.addCategoryItem.addEventListener("click", async () => {
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

  try {
    await saveCategories();
  } catch (error) {
    console.warn("Firestore category save failed; keeping the category on this phone.", error);
    saveJson(CATEGORY_KEY, state.categories);
    setSyncStatus("Category saved locally", "warning");
  }
  els.categoryDialog.close();
  render();
});

function setupPasscode() {
  if (sessionStorage.getItem(PASSCODE_SESSION_KEY) === "true") {
    unlockApp();
  } else {
    lockApp();
    requestAnimationFrame(() => els.passcodeInput.focus());
  }

  els.passcodeForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (els.passcodeInput.value === PASSCODE) {
      sessionStorage.setItem(PASSCODE_SESSION_KEY, "true");
      els.passcodeInput.value = "";
      els.passcodeError.textContent = "";
      unlockApp();
      return;
    }

    els.passcodeError.textContent = "Incorrect passcode.";
    els.passcodeInput.value = "";
    els.passcodeInput.focus();
  });

  els.lockApp.addEventListener("click", () => {
    sessionStorage.removeItem(PASSCODE_SESSION_KEY);
    lockApp();
    requestAnimationFrame(() => els.passcodeInput.focus());
  });
}

function unlockApp() {
  els.passcodeScreen.classList.add("is-hidden");
  els.appShell.classList.remove("is-locked");
  els.appShell.removeAttribute("aria-hidden");
  startDataStore();
}

function lockApp() {
  els.passcodeScreen.classList.remove("is-hidden");
  els.appShell.classList.add("is-locked");
  els.appShell.setAttribute("aria-hidden", "true");
}

function startDataStore() {
  if (firebaseStore.started) return;
  firebaseStore.started = true;
  setupFirestore().catch((error) => {
    console.warn("Firestore setup failed; using phone storage.", error);
    setSyncStatus("Phone local storage", "local");
  });
}

async function setupFirestore() {
  if (!hasFirebaseConfig()) {
    setSyncStatus("Phone local storage", "local");
    return;
  }

  setSyncStatus("Connecting Firestore", "loading");

  const [appModule, authModule, firestoreModule] = await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-auth.js`),
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`)
  ]);

  const app = appModule.initializeApp(FIREBASE_CONFIG);
  const auth = authModule.getAuth(app);
  await authModule.signInAnonymously(auth);

  const db = firestoreModule.getFirestore(app);
  firebaseStore.db = db;
  firebaseStore.api = firestoreModule;
  firebaseStore.expensesRef = firestoreModule.collection(db, "households", FIREBASE_HOUSEHOLD_ID, "expenses");
  firebaseStore.categoriesRef = firestoreModule.doc(db, "households", FIREBASE_HOUSEHOLD_ID, "settings", "categories");
  firebaseStore.connected = true;

  firebaseStore.unsubscribers = [
    firestoreModule.onSnapshot(firebaseStore.expensesRef, (snapshot) => {
      handleExpenseSnapshot(snapshot).catch(handleFirestoreError);
    }, handleFirestoreError),
    firestoreModule.onSnapshot(firebaseStore.categoriesRef, handleCategorySnapshot, handleFirestoreError)
  ];

  setSyncStatus("Shared Firestore", "remote");
}

async function addExpense(expense) {
  if (!firebaseStore.connected) {
    saveExpenseLocally(expense);
    return;
  }

  await firebaseStore.api.addDoc(firebaseStore.expensesRef, {
    ...expense,
    updatedAt: firebaseStore.api.serverTimestamp()
  });
}

async function saveCategories() {
  if (!firebaseStore.connected) {
    saveJson(CATEGORY_KEY, state.categories);
    return;
  }

  await firebaseStore.api.setDoc(firebaseStore.categoriesRef, {
    categories: categoriesForFirestore(state.categories),
    updatedAt: firebaseStore.api.serverTimestamp()
  });
}

function saveExpenseLocally(expense) {
  state.expenses.unshift(expense);
  state.expenses.sort(sortExpenseDesc);
  saveJson(STORAGE_KEY, state.expenses);
}

async function handleExpenseSnapshot(snapshot) {
  const remoteExpenses = snapshot.docs
    .map((doc) => normalizeRemoteExpense(doc.id, doc.data()))
    .sort(sortExpenseDesc);

  if (firebaseStore.firstExpenseSnapshot && !remoteExpenses.length && state.expenses.length) {
    firebaseStore.firstExpenseSnapshot = false;
    setSyncStatus("Moving phone data to Firestore", "loading");
    await uploadLocalExpenses(state.expenses);
    return;
  }

  firebaseStore.firstExpenseSnapshot = false;
  state.expenses = remoteExpenses;
  saveJson(STORAGE_KEY, state.expenses);
  render();
  setSyncStatus("Shared Firestore", "remote");
}

async function uploadLocalExpenses(expenses) {
  const batch = firebaseStore.api.writeBatch(firebaseStore.db);
  expenses.forEach((expense) => {
    const id = expense.id || crypto.randomUUID();
    batch.set(firebaseStore.api.doc(firebaseStore.expensesRef, id), {
      ...expense,
      id,
      updatedAt: firebaseStore.api.serverTimestamp()
    });
  });
  await batch.commit();
}

function handleCategorySnapshot(snapshot) {
  if (!snapshot.exists()) {
    firebaseStore.api.setDoc(firebaseStore.categoriesRef, {
      categories: categoriesForFirestore(cloneCategories(defaultCategories)),
      updatedAt: firebaseStore.api.serverTimestamp()
    }).catch(handleFirestoreError);
    return;
  }

  const categories = categoriesFromFirestore(snapshot.data().categories);
  if (!categories.length) return;

  state.categories = categories;
  saveJson(CATEGORY_KEY, state.categories);
  render();
  setSyncStatus("Shared Firestore", "remote");
}

function handleFirestoreError(error) {
  console.warn("Firestore sync error.", error);
  firebaseStore.connected = false;
  setSyncStatus("Phone local storage", "warning");
}

function hasFirebaseConfig() {
  return ["apiKey", "authDomain", "projectId", "appId"].every((key) => Boolean(FIREBASE_CONFIG[key]));
}

function setSyncStatus(text, mode) {
  els.syncStatus.textContent = text;
  els.syncStatus.dataset.mode = mode;
}

function render() {
  updateNotesCount();
  renderItemOptions();
  renderMonthOptions();
  renderCategories();
  renderDashboard();
  renderRoute();
}

function renderRoute(shouldScroll = false) {
  state.currentPage = routeFromHash();
  els.pages.forEach((page) => {
    page.hidden = page.dataset.page !== state.currentPage;
  });

  if (shouldScroll) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function updateNotesCount() {
  els.notesCount.textContent = `${els.notes.value.length}/20`;
}

function renderItemOptions() {
  const currentValue = els.item.value;
  els.item.innerHTML = state.categories
    .map((category) => {
      const options = category.items
        .map(([item]) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`)
        .join("");
      return `<optgroup label="${escapeHtml(category.name)}">${options}</optgroup>`;
    })
    .join("");

  const items = allItems();
  if (items.some((item) => item.item === currentValue)) {
    els.item.value = currentValue;
  } else if (items.length) {
    els.item.value = items[0].item;
  }

  renderCategoryPickerSelection();
  renderItemPickerList();
}

function renderCategoryPickerSelection() {
  const selected = findItem(els.item.value);
  if (!selected) {
    els.categoryPickerText.textContent = "Choose category";
    els.categoryPickerMeta.textContent = "Tap to select";
    return;
  }

  els.categoryPickerText.textContent = selected.item;
  els.categoryPickerMeta.textContent = `${selected.category} · ${cadenceLabel(selected.cadence)}`;
}

function renderItemPickerList() {
  const selectedItem = els.item.value;
  els.itemPickerList.innerHTML = state.categories
    .map((category) => {
      const buttons = category.items
        .map(([item, cadence]) => {
          const isSelected = item === selectedItem;
          return `
            <button class="picker-option ${isSelected ? "is-selected" : ""}" type="button" data-item="${escapeHtml(item)}" aria-pressed="${isSelected}">
              <span>${escapeHtml(item)}</span>
              <small>${cadenceLabel(cadence)}</small>
            </button>
          `;
        })
        .join("");
      return `
        <section class="picker-group" aria-label="${escapeHtml(category.name)}">
          <div class="picker-group-title">
            <strong>${escapeHtml(category.name)}</strong>
            <small>${category.items.length} items</small>
          </div>
          <div class="picker-options">${buttons}</div>
        </section>
      `;
    })
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
  const query = state.categoryQuery.toLowerCase();
  const groups = state.categories
    .map((category, index) => {
      const categoryMatches = category.name.toLowerCase().includes(query);
      const filteredItems = query
        ? category.items.filter(([item]) => categoryMatches || item.toLowerCase().includes(query))
        : category.items;
      return { ...category, filteredItems, index };
    })
    .filter((category) => category.filteredItems.length);
  const visibleItemCount = groups.reduce((total, category) => total + category.filteredItems.length, 0);

  els.categoryCount.textContent = query
    ? `${visibleItemCount} ${visibleItemCount === 1 ? "match" : "matches"}`
    : `${items.length} items`;
  els.categoryLinkCount.textContent = `${items.length} items`;
  els.categoryNames.innerHTML = state.categories.map((category) => `<option value="${escapeHtml(category.name)}"></option>`).join("");

  if (!groups.length) {
    els.categoryList.innerHTML = `<div class="empty-state">No category item matches "${escapeHtml(state.categoryQuery)}".</div>`;
    return;
  }

  els.categoryList.innerHTML = groups
    .map((category) => {
      const chips = category.filteredItems
        .map(([item, cadence]) => `<span class="chip ${cadence}">${escapeHtml(item)} · ${cadenceLabel(cadence)}</span>`)
        .join("");
      const countLabel = query
        ? `${category.filteredItems.length} ${category.filteredItems.length === 1 ? "match" : "matches"}`
        : `${category.items.length} items`;
      return `
        <details class="category-group" ${query || category.index < 3 ? "open" : ""}>
          <summary>${escapeHtml(category.name)} <small>${countLabel}</small></summary>
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
  els.topCategory.textContent = top ? top[0] : "No expenses";
  els.topCategoryAmount.textContent = top ? formatInr(top[1]) : "₹0";
  els.chartTotal.textContent = formatInr(monthTotal);
  els.chartSubtitle.textContent = `${formatMonth(state.selectedMonth)} by category`;
  els.bottomPieTotal.textContent = formatInr(monthTotal);
  els.bottomPieSubtitle.textContent = `${formatMonth(state.selectedMonth)} category split`;

  renderCategoryChart(grouped, monthTotal);
  renderTrendChart();
  renderExpenseList(monthExpenses);
}

function renderCategoryChart(grouped, total) {
  drawCategoryChart(els.categoryChart, els.categoryLegend, grouped, total, {
    emptyLegend: "Add expenses to see category mix.",
    innerRadius: 44,
    centerLabel: "Total"
  });

  drawCategoryChart(els.bottomPieChart, els.bottomPieLegend, grouped, total, {
    emptyLegend: "Add expenses to see this month's category pie.",
    innerRadius: 0
  });
}

function drawCategoryChart(canvas, legend, grouped, total, options = {}) {
  const ctx = canvas.getContext("2d");
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radius = 78;
  const innerRadius = options.innerRadius ?? 44;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!total) {
    drawEmptyDonut(ctx, cx, cy, radius, "No data");
    legend.innerHTML = `<div class="empty-state">${escapeHtml(options.emptyLegend || "Add expenses to see category mix.")}</div>`;
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

  if (innerRadius) {
    ctx.beginPath();
    ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.fillStyle = "#005073";
    ctx.font = "700 15px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(options.centerLabel || "Total", cx, cy - 4);
    ctx.font = "800 18px system-ui";
    ctx.fillText(compactInr(total), cx, cy + 20);
  }

  legend.innerHTML = entries
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

function cloneCategories(categories) {
  return categories.map((category) => ({
    name: category.name,
    items: category.items.map(([item, cadence]) => [item, cadence])
  }));
}

function categoriesForFirestore(categories) {
  return categories.map((category) => ({
    name: category.name,
    items: category.items.map(([name, cadence]) => ({ name, cadence }))
  }));
}

function categoriesFromFirestore(categories) {
  if (!Array.isArray(categories)) return [];
  return categories
    .map((category) => ({
      name: String(category.name || "").trim(),
      items: Array.isArray(category.items)
        ? category.items
            .map((item) => {
              if (Array.isArray(item)) return [String(item[0] || "").trim(), item[1] || "occasional"];
              return [String(item.name || "").trim(), item.cadence || "occasional"];
            })
            .filter(([name]) => name)
        : []
    }))
    .filter((category) => category.name && category.items.length);
}

function normalizeRemoteExpense(id, data) {
  return {
    id,
    date: String(data.date || formatDateInput(new Date())).slice(0, 10),
    amount: Number(data.amount || 0),
    item: String(data.item || "Expense"),
    category: String(data.category || "Uncategorised"),
    cadence: String(data.cadence || "occasional"),
    notes: String(data.notes || "").slice(0, 20),
    createdAt: timestampToIso(data.createdAt)
  };
}

function timestampToIso(value) {
  if (value && typeof value.toDate === "function") return value.toDate().toISOString();
  if (typeof value === "string") return value;
  return new Date(0).toISOString();
}

function sortExpenseDesc(a, b) {
  const dateCompare = String(b.date || "").localeCompare(String(a.date || ""));
  if (dateCompare) return dateCompare;
  return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
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

function routeFromHash() {
  const page = window.location.hash.replace("#", "");
  return ["home", "categories", "analytics"].includes(page) ? page : "home";
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
