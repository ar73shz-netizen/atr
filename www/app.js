/* ============ Jalali (Persian) calendar conversion ============ */
function div(a, b) { return Math.trunc(a / b); }
function mod(a, b) { return a - Math.trunc(a / b) * b; }

function jalCal(jy) {
  const breaks = [-61,9,38,199,426,686,756,818,1111,1181,1210,1635,2060,2097,2192,2262,2324,2394,2456,3178];
  const bl = breaks.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = breaks[0];
  if (jy < jp || jy >= breaks[bl - 1]) throw new Error("Invalid Jalaali year " + jy);
  let jump = 0, jm = 0;
  for (let i = 1; i < bl; i += 1) {
    jm = breaks[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  let n = jy - jp;
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  if (jump - n < 6) n = n - jump + div(jump, 33) * 33;
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  return { leap, gy, march };
}

function g2d(gy, gm, gd) {
  let d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4)
    + div(153 * mod(gm + 9, 12) + 2, 5)
    + gd - 34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}
function d2g(jdn) {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}
function j2d(jy, jm, jd) {
  const r = jalCal(jy);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}
function d2j(jdn) {
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  let r = jalCal(jy);
  const jdn1f = g2d(gy, 3, r.march);
  let k = jdn - jdn1f;
  let jm, jd;
  if (k >= 0) {
    if (k <= 185) return { jy, jm: 1 + div(k, 31), jd: mod(k, 31) + 1 };
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (jalCal(jy).leap === 1) k += 1;
  }
  jm = 7 + div(k, 30);
  jd = mod(k, 30) + 1;
  return { jy, jm, jd };
}
function toJalaali(gy, gm, gd) { return d2j(g2d(gy, gm, gd)); }
function isLeapJalaaliYear(jy) { return jalCal(jy).leap === 0; }
function jalaliMonthLength(jy, jm) {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isLeapJalaaliYear(jy) ? 30 : 29;
}
function todayJalali() {
  const t = new Date();
  return toJalaali(t.getFullYear(), t.getMonth() + 1, t.getDate());
}
function jalaliRank(v) { return (!v || !v.jy) ? 0 : v.jy * 372 + v.jm * 31 + v.jd; }
function jalaliValid(v) { return !!(v && v.jy && v.jm && v.jd); }
function jalaliStr(v) { return jalaliValid(v) ? `${v.jd} ${MONTHS[v.jm - 1]} ${v.jy}` : "—"; }
function jalaliMonthKey(v) { return jalaliValid(v) ? `${v.jy}-${String(v.jm).padStart(2, "0")}` : null; }

const MONTHS = ["فروردین","اردیبهشت","خرداد","تیر","مرداد","شهریور","مهر","آبان","آذر","دی","بهمن","اسفند"];

/* ============ helpers ============ */
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function toman(n) { return (Number(n) || 0).toLocaleString("en-US") + " تومان"; }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c])); }
function getByPath(obj, path) { return path.split(".").reduce((a, p) => (a == null ? a : a[p]), obj); }
function setByPath(obj, path, value) {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const p = parts[i];
    if (cur[p] == null || typeof cur[p] !== "object") cur[p] = {};
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
}

/* ============ persistence ============ */
const STORAGE_KEY = "financeAppData_v1";
const DEFAULT_CATEGORIES = ["خوراک", "پوشاک", "سلامت و بهداشت", "حمل و نقل", "قبوض", "تفریح و سرگرمی", "متفرقه"];
function loadState() {
  let s = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) s = JSON.parse(raw);
  } catch (e) { /* ignore */ }
  if (!s) s = {};
  s.incomes = s.incomes || [];
  s.expenses = s.expenses || [];
  s.debts = s.debts || [];
  s.credits = s.credits || [];
  s.futureExpenses = s.futureExpenses || [];
  s.notes = s.notes || [];
  s.ledgers = s.ledgers || [];
  s.categories = s.categories && s.categories.length ? s.categories : DEFAULT_CATEGORIES.slice();
  if (!s.categories.includes("متفرقه")) s.categories.push("متفرقه");
  return s;
}
function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
}

const state = loadState();
let activeTab = "overview";
const drafts = {
  income: { amount: "", source: "", date: todayJalali() },
  expense: { amount: "", for: "", date: todayJalali(), category: "متفرقه" },
  debt: { amount: "", for: "", creditor: "", date: todayJalali() },
  credit: { amount: "", for: "", debtor: "", date: todayJalali() },
  future: { amount: "", for: "", date: null },
  note: "",
  ov: { month: { jy: todayJalali().jy, jm: todayJalali().jm }, year: todayJalali().jy },
  report: { from: { jy: todayJalali().jy, jm: todayJalali().jm, jd: 1 }, to: todayJalali() },
  search: "",
  archiveView: "months",
  ledgerName: "",
  ledgerEntry: { amount: "", for: "", date: todayJalali() },
  openLedger: null,
};
const formErrors = {};
const CONFIRM_MSG = "آیا مطمئن هستید که حذف شود؟";

const ICON_PATHS = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v9a1 1 0 0 0 1 1h4v-5h4v5h4a1 1 0 0 0 1-1v-9"/>',
  up: '<path d="M22 7l-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
  down: '<path d="M22 17l-8.5-8.5-5 5L2 7"/><path d="M16 17h6v-6"/>',
  debt: '<path d="M7 17 17 7"/><path d="M8 7h9v9"/>',
  credit: '<path d="M17 7 7 17"/><path d="M16 17H7V8"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M8 14h3M13 14h3M8 18h3"/>',
  note: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
  archive: '<rect x="2" y="3" width="20" height="5" rx="1.5"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M10 12h4"/>',
  chart: '<path d="M18 20V10M12 20V4M6 20v-6"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M9 7h7"/>',
  search: '<circle cx="11" cy="11" r="7.5"/><path d="m21 21-4.3-4.3"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  share: '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="m16 6-4-4-4 4M12 2v13"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  back: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  pdf: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h2a1.5 1.5 0 0 1 0 3H8v-3zM13 16v-3h1.2a1.5 1.5 0 0 1 0 3"/>',
};
function ico(name, size) {
  const z = size || 22;
  return `<svg viewBox="0 0 24 24" width="${z}" height="${z}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ""}</svg>`;
}
const TOP_TABS = [
  { key: "overview", label: "نمای کلی", icon: "home" },
  { key: "income", label: "درآمدها", icon: "up" },
  { key: "expense", label: "هزینه‌ها", icon: "down" },
  { key: "debt", label: "بدهی", icon: "debt" },
  { key: "credit", label: "طلب", icon: "credit" },
];
const BOTTOM_TABS = [
  { key: "future", label: "هزینه‌های آتی", icon: "calendar", color: "#C4B5FD" },
  { key: "notes", label: "یادداشت", icon: "note", color: "#FCD34D" },
  { key: "archive", label: "بایگانی", icon: "archive", color: "#5EEAD4" },
  { key: "report", label: "گزارش", icon: "chart", color: "#F9A8D4" },
  { key: "ledger", label: "دفتر موقت", icon: "book", color: "#7DD3FC" },
];
function currentMonthKey() { return jalaliMonthKey(todayJalali()); }
let reportRange = null;

/* ============ derived totals ============ */
function sum(arr, f) { return arr.reduce((s, x) => s + (Number(f ? f(x) : x.amount) || 0), 0); }
function totals() {
  const totalIncome = sum(state.incomes);
  const totalExpense = sum(state.expenses);
  const totalDebt = sum(state.debts.filter((d) => !d.paid));
  const totalCredit = sum(state.credits.filter((c) => !c.received));
  const totalFuture = sum(state.futureExpenses);
  return { totalIncome, totalExpense, totalDebt, totalCredit, totalFuture, balance: totalIncome - totalExpense };
}
function monthlyBreakdown() {
  const map = {};
  state.incomes.forEach((i) => {
    const k = jalaliMonthKey(i.date);
    if (!k) return;
    map[k] = map[k] || { income: 0, expense: 0 };
    map[k].income += Number(i.amount || 0);
  });
  state.expenses.forEach((i) => {
    const k = jalaliMonthKey(i.date);
    if (!k) return;
    map[k] = map[k] || { income: 0, expense: 0 };
    map[k].expense += Number(i.amount || 0);
  });
  return Object.entries(map)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([k, v]) => {
      const [jy, jm] = k.split("-").map(Number);
      return { key: k, jy, jm, income: v.income, expense: v.expense, net: v.income - v.expense };
    });
}
function monthsWithData() {
  const keys = new Set();
  [state.incomes, state.expenses, state.debts, state.credits].forEach((arr) => {
    arr.forEach((i) => { const k = jalaliMonthKey(i.date); if (k) keys.add(k); });
  });
  keys.add(currentMonthKey());
  return Array.from(keys).sort((a, b) => b.localeCompare(a));
}
function monthSummary(monthKey) {
  const incomes = state.incomes.filter((i) => jalaliMonthKey(i.date) === monthKey);
  const expenses = state.expenses.filter((i) => jalaliMonthKey(i.date) === monthKey);
  const debtsAdded = state.debts.filter((i) => jalaliMonthKey(i.date) === monthKey);
  const creditsAdded = state.credits.filter((i) => jalaliMonthKey(i.date) === monthKey);
  const income = sum(incomes);
  const expense = sum(expenses);
  return { income, expense, net: income - expense, debtAdded: sum(debtsAdded), creditAdded: sum(creditsAdded) };
}
function categoryBreakdown() {
  const map = {};
  state.expenses.forEach((e) => {
    const cat = e.category || "بدون دسته‌بندی";
    map[cat] = (map[cat] || 0) + Number(e.amount || 0);
  });
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

/* ============ actions ============ */
function addIncome() {
  const amt = Number(drafts.income.amount);
  if (!amt || amt <= 0) { formErrors.income = "لطفاً مبلغ معتبر وارد کنید."; render(); return; }
  if (!jalaliValid(drafts.income.date)) { formErrors.income = "لطفاً تاریخ را کامل انتخاب کنید."; render(); return; }
  state.incomes.unshift({ id: uid(), amount: amt, source: drafts.income.source || "", date: { ...drafts.income.date } });
  persist();
  drafts.income = { amount: "", source: "", date: todayJalali() };
  formErrors.income = "";
  render();
}
function addExpense() {
  const amt = Number(drafts.expense.amount);
  if (!amt || amt <= 0) { formErrors.expense = "لطفاً مبلغ معتبر وارد کنید."; render(); return; }
  if (!jalaliValid(drafts.expense.date)) { formErrors.expense = "لطفاً تاریخ را کامل انتخاب کنید."; render(); return; }
  state.expenses.unshift({ id: uid(), amount: amt, for: drafts.expense.for || "", category: drafts.expense.category || "", date: { ...drafts.expense.date } });
  persist();
  drafts.expense = { amount: "", for: "", date: todayJalali(), category: "متفرقه" };
  formErrors.expense = "";
  render();
}
function addDebt() {
  const amt = Number(drafts.debt.amount);
  if (!amt || amt <= 0) { formErrors.debt = "لطفاً مبلغ معتبر وارد کنید."; render(); return; }
  if (!jalaliValid(drafts.debt.date)) { formErrors.debt = "لطفاً تاریخ را کامل انتخاب کنید."; render(); return; }
  state.debts.unshift({ id: uid(), amount: amt, for: drafts.debt.for || "", creditor: drafts.debt.creditor || "", date: { ...drafts.debt.date }, paid: false, linkedExpenseId: null });
  persist();
  drafts.debt = { amount: "", for: "", creditor: "", date: todayJalali() };
  formErrors.debt = "";
  render();
}
function addCredit() {
  const amt = Number(drafts.credit.amount);
  if (!amt || amt <= 0) { formErrors.credit = "لطفاً مبلغ معتبر وارد کنید."; render(); return; }
  if (!jalaliValid(drafts.credit.date)) { formErrors.credit = "لطفاً تاریخ را کامل انتخاب کنید."; render(); return; }
  state.credits.unshift({ id: uid(), amount: amt, for: drafts.credit.for || "", debtor: drafts.credit.debtor || "", date: { ...drafts.credit.date }, received: false, linkedIncomeId: null });
  persist();
  drafts.credit = { amount: "", for: "", debtor: "", date: todayJalali() };
  formErrors.credit = "";
  render();
}
function addFuture() {
  const amt = Number(drafts.future.amount);
  if (!amt || amt <= 0) { formErrors.future = "لطفاً مبلغ معتبر وارد کنید."; render(); return; }
  if (!jalaliValid(drafts.future.date)) { formErrors.future = "لطفاً روز، ماه و سال را انتخاب کنید."; render(); return; }
  state.futureExpenses.unshift({ id: uid(), amount: amt, for: drafts.future.for || "", date: { ...drafts.future.date } });
  persist();
  drafts.future = { amount: "", for: "", date: null };
  formErrors.future = "";
  render();
}
function addNote() {
  const text = drafts.note.trim();
  if (!text) { formErrors.note = "لطفاً متن یادداشت را بنویسید."; render(); return; }
  state.notes.unshift({ id: uid(), text, date: todayJalali() });
  persist();
  drafts.note = "";
  formErrors.note = "";
  render();
}
function settleDebt(id) {
  const debt = state.debts.find((d) => d.id === id);
  if (!debt || debt.paid) return;
  const expenseId = uid();
  state.expenses.unshift({
    id: expenseId, amount: debt.amount,
    for: `پرداخت بدهی: ${debt.for}${debt.creditor ? " (طلبکار: " + debt.creditor + ")" : ""}`,
    date: todayJalali(), fromDebtId: debt.id,
  });
  debt.paid = true;
  debt.paidDate = todayJalali();
  debt.linkedExpenseId = expenseId;
  persist();
  render();
}
function settleCredit(id) {
  const credit = state.credits.find((c) => c.id === id);
  if (!credit || credit.received) return;
  const incomeId = uid();
  state.incomes.unshift({
    id: incomeId, amount: credit.amount,
    source: `دریافت طلب: ${credit.for}${credit.debtor ? " (بدهکار: " + credit.debtor + ")" : ""}`,
    date: todayJalali(), fromCreditId: credit.id,
  });
  credit.received = true;
  credit.receivedDate = todayJalali();
  credit.linkedIncomeId = incomeId;
  persist();
  render();
}
function restoreDebt(id) {
  const debt = state.debts.find((d) => d.id === id);
  if (!debt) return;
  if (debt.linkedExpenseId) state.expenses = state.expenses.filter((e) => e.id !== debt.linkedExpenseId);
  debt.paid = false; debt.paidDate = null; debt.linkedExpenseId = null;
  persist(); render();
}
function restoreCredit(id) {
  const credit = state.credits.find((c) => c.id === id);
  if (!credit) return;
  if (credit.linkedIncomeId) state.incomes = state.incomes.filter((i) => i.id !== credit.linkedIncomeId);
  credit.received = false; credit.receivedDate = null; credit.linkedIncomeId = null;
  persist(); render();
}
function removeDebt(id) {
  const debt = state.debts.find((d) => d.id === id);
  // یک بدهی پرداخت‌نشده حذف می‌شود؛ بدهی بایگانی‌شده فقط از سابقه پاک می‌شود و هزینه ثبت‌شده‌اش می‌ماند
  if (debt && !debt.paid && debt.linkedExpenseId) state.expenses = state.expenses.filter((e) => e.id !== debt.linkedExpenseId);
  state.debts = state.debts.filter((d) => d.id !== id);
  persist(); render();
}
function removeCredit(id) {
  const credit = state.credits.find((c) => c.id === id);
  if (credit && !credit.received && credit.linkedIncomeId) state.incomes = state.incomes.filter((i) => i.id !== credit.linkedIncomeId);
  state.credits = state.credits.filter((c) => c.id !== id);
  persist(); render();
}

/* ---- confirm / message modal ---- */
let modalYes = null;
function askConfirm(msg, onYes) {
  modalYes = onYes;
  document.getElementById("modal-root").innerHTML = `
    <div class="modal-back"><div class="modal">
      <div class="modal-msg">${esc(msg)}</div>
      <div class="modal-actions">
        <button class="btn" data-modal="yes">بلی</button>
        <button class="btn btn-light" data-modal="no">خیر</button>
      </div>
    </div></div>`;
}
function showMessage(msg) {
  modalYes = null;
  document.getElementById("modal-root").innerHTML = `
    <div class="modal-back"><div class="modal">
      <div class="modal-msg">${esc(msg)}</div>
      <div class="modal-actions"><button class="btn" data-modal="no">باشه</button></div>
    </div></div>`;
}
function closeModal() { document.getElementById("modal-root").innerHTML = ""; modalYes = null; }

/* ---- temporary ledgers ---- */
function addLedger() {
  const name = drafts.ledgerName.trim();
  if (!name) { formErrors.ledger = "لطفاً نام دفتر را وارد کنید."; render(); return; }
  const id = uid();
  state.ledgers.unshift({ id, name, items: [] });
  persist();
  drafts.ledgerName = "";
  formErrors.ledger = "";
  navigate("ledger", id);
}
function addLedgerEntry() {
  const led = state.ledgers.find((l) => l.id === drafts.openLedger);
  if (!led) return;
  const d = drafts.ledgerEntry;
  const amt = Number(d.amount);
  if (!amt || amt <= 0) { formErrors.ledgerEntry = "لطفاً مبلغ معتبر وارد کنید."; render(); return; }
  if (!jalaliValid(d.date)) { formErrors.ledgerEntry = "لطفاً تاریخ را کامل انتخاب کنید."; render(); return; }
  led.items.unshift({ id: uid(), amount: amt, for: d.for || "", date: { ...d.date } });
  persist();
  drafts.ledgerEntry = { amount: "", for: "", date: todayJalali() };
  formErrors.ledgerEntry = "";
  render();
}

/* ============ render helpers ============ */
function dateSelectsHTML(prefix, dateObj) {
  const y = dateObj && dateObj.jy ? dateObj.jy : "";
  const m = dateObj && dateObj.jm ? dateObj.jm : "";
  const d = dateObj && dateObj.jd ? dateObj.jd : "";
  const base = todayJalali();
  const dayCount = m ? jalaliMonthLength(y || base.jy, m) : 31;
  const years = [];
  for (let yy = base.jy - 5; yy <= base.jy + 5; yy += 1) years.push(yy);
  return `
    <div class="date-row">
      <select data-bind="${prefix}.jy" data-datepart="jy" data-prefix="${prefix}">
        <option value="" ${y ? "" : "selected"} disabled>سال</option>
        ${years.map((yy) => `<option value="${yy}" ${yy === y ? "selected" : ""}>${yy}</option>`).join("")}
      </select>
      <select dir="rtl" data-bind="${prefix}.jm" data-datepart="jm" data-prefix="${prefix}">
        <option value="" ${m ? "" : "selected"} disabled>ماه</option>
        ${MONTHS.map((mn, i) => `<option value="${i + 1}" ${i + 1 === m ? "selected" : ""}>${mn}</option>`).join("")}
      </select>
      <select data-bind="${prefix}.jd" data-datepart="jd" data-prefix="${prefix}">
        <option value="" ${d ? "" : "selected"} disabled>روز</option>
        ${Array.from({ length: dayCount }, (_, i) => i + 1).map((n) => `<option value="${n}" ${n === d ? "selected" : ""}>${n}</option>`).join("")}
      </select>
    </div>`;
}
function categorySelectHTML(bind, selected) {
  const cats = state.categories;
  return `<select data-bind="${bind}" data-category-select="true">
      <option value="" ${selected ? "" : "selected"} disabled>انتخاب دسته‌بندی</option>
      ${cats.map((c) => `<option value="${esc(c)}" ${c === selected ? "selected" : ""}>${esc(c)}</option>`).join("")}
      <option value="__new__">+ افزودن دسته‌بندی جدید...</option>
    </select>`;
}
function buildDonut(parts) {
  const filtered = parts.filter((p) => p[1] > 0);
  const grand = filtered.reduce((s, p) => s + p[1], 0);
  if (grand <= 0) return emptyHTML("داده‌ای برای نمایش نمودار وجود ندارد.");
  let acc = 0;
  const segs = filtered.map(([, val, cvar]) => {
    const start = (acc / grand) * 360;
    acc += val;
    const end = (acc / grand) * 360;
    return `var(${cvar}) ${start}deg ${end}deg`;
  });
  return `
    <div class="donut-wrap">
      <div class="donut" style="background:conic-gradient(${segs.join(",")})"></div>
      <div class="legend">
        ${filtered.map(([label, val, cvar]) => `
          <div class="legend-item">
            <span class="legend-dot" style="background:var(${cvar})"></span>
            <span>${esc(label)}:</span>
            <span class="legend-val">${toman(val)}</span>
          </div>`).join("")}
      </div>
    </div>`;
}
function monthSelectHTML(bind, selected, keys) {
  return `<select data-bind="${bind}" data-rerender="true">
      ${keys.map((k) => {
        const [jy, jm] = k.split("-").map(Number);
        return `<option value="${k}" ${k === selected ? "selected" : ""}>${MONTHS[jm - 1]} ${jy}</option>`;
      }).join("")}
    </select>`;
}
function amountFieldHTML(bind, value, placeholder) {
  const display = value === "" || value == null ? "" : Number(value).toLocaleString("en-US");
  return `<input class="input amount-field" type="text" inputmode="numeric" data-bind="${bind}" value="${display}" placeholder="${placeholder || "0"}" />`;
}
function rowHTML({ title, subtitle, amount, colorVar, date, deleteAction, deleteId, extraHTML, actionsHTML, dateLabel }) {
  return `
    <div class="row">
      <div class="row-left">
        ${extraHTML || ""}
        <div style="min-width:0;">
          <div class="row-title">${esc(title)}</div>
          ${subtitle ? `<div class="row-subtitle">${esc(subtitle)}</div>` : ""}
          <div class="row-date">${dateLabel ? esc(dateLabel) + " " : ""}${jalaliStr(date)}</div>
        </div>
      </div>
      <div class="row-right">
        <span class="row-amount" style="color:var(${colorVar})">${toman(amount)}</span>
        ${actionsHTML ? `<div class="row-actions">${actionsHTML}</div>` : ""}
        ${deleteAction ? `<button class="icon-btn" data-action="${deleteAction}" data-id="${deleteId}" title="حذف">${ico("x", 16)}</button>` : ""}
      </div>
    </div>`;
}
function emptyHTML(text) { return `<div class="empty">${esc(text)}</div>`; }
function errorHTML(key) { return formErrors[key] ? `<div class="error-text">${esc(formErrors[key])}</div>` : ""; }

/* ============ tab renderers ============ */
async function exportBackup() {
  const t = todayJalali();
  const name = `finance-backup-${t.jy}-${String(t.jm).padStart(2, "0")}-${String(t.jd).padStart(2, "0")}.json`;
  const dataStr = JSON.stringify(state, null, 2);
  const cap = window.Capacitor;
  const P = cap && cap.Plugins;
  // داخل APK دانلود مستقیم کار نمی‌کند؛ فایل را می‌سازیم و با منوی اشتراک‌گذاری ذخیره/ارسال می‌کنیم
  if (cap && cap.isNativePlatform && cap.isNativePlatform() && P && P.Filesystem && P.Share) {
    try {
      await P.Filesystem.writeFile({ path: name, data: dataStr, directory: "CACHE", encoding: "utf8" });
      const r = await P.Filesystem.getUri({ path: name, directory: "CACHE" });
      await P.Share.share({ title: "پشتیبان مدیریت مالی", url: r.uri, dialogTitle: "ذخیره یا ارسال فایل پشتیبان" });
      return;
    } catch (e) {
      if (String((e && e.message) || e).toLowerCase().includes("cancel")) return;
    }
  }
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function importBackupFile(file) {
  if (!file) return;
  askConfirm("بازیابی فایل پشتیبان، اطلاعات فعلی برنامه را جایگزین می‌کند. ادامه می‌دهید؟", () => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data || typeof data !== "object") throw new Error("bad");
        state.incomes = Array.isArray(data.incomes) ? data.incomes : [];
        state.expenses = Array.isArray(data.expenses) ? data.expenses : [];
        state.debts = Array.isArray(data.debts) ? data.debts : [];
        state.credits = Array.isArray(data.credits) ? data.credits : [];
        state.futureExpenses = Array.isArray(data.futureExpenses) ? data.futureExpenses : [];
        state.notes = Array.isArray(data.notes) ? data.notes : [];
        state.ledgers = Array.isArray(data.ledgers) ? data.ledgers : [];
        state.categories = Array.isArray(data.categories) && data.categories.length ? data.categories : DEFAULT_CATEGORIES.slice();
        drafts.openLedger = null;
        persist();
        render();
        showMessage("بازیابی اطلاعات با موفقیت انجام شد.");
      } catch (err) {
        showMessage("این فایل، فایل پشتیبان معتبری نیست.");
      }
    };
    reader.readAsText(file);
  });
}

function renderSettings() {
  return `
    <div class="stack">
      <div class="card">
        <div class="section-title">پشتیبان‌گیری و بازیابی اطلاعات</div>
        <div class="hint-text">قبل از حذف یا نصب مجدد برنامه یا تعویض گوشی، حتماً یک فایل پشتیبان بگیرید. فایل پشتیبان شامل درآمد، هزینه، بدهی، طلب، یادداشت‌ها، دفترهای موقت و دسته‌بندی‌هاست.</div>
        <button class="btn" data-action="export-backup">دریافت فایل پشتیبان</button>
        <div style="height:8px;"></div>
        <button class="btn btn-light" data-action="trigger-import">بازیابی از فایل پشتیبان</button>
        <input type="file" id="import-file-input" style="display:none;" />
      </div>
    </div>`;
}

const PALETTE = ["#6C5CE7", "#E5336A", "#0E9F6E", "#EA7B0A", "#2563EB", "#C44DFF", "#14B8A6", "#EAB308", "#F97316", "#06B6D4", "#84CC16", "#EC4899"];
function periodStats(pred, withFuture) {
  const incomes = state.incomes.filter(pred);
  const expenses = state.expenses.filter(pred);
  const income = sum(incomes);
  const expense = sum(expenses);
  return {
    income, expense, net: income - expense, expenses,
    debtAdded: sum(state.debts.filter(pred)),
    creditAdded: sum(state.credits.filter(pred)),
    future: withFuture ? sum(state.futureExpenses.filter(pred)) : 0,
  };
}
function tileHTML(cls, label, value, color, wide) {
  return `<div class="tile ${cls} ${wide ? "wide" : ""}"><div class="stat-label">${label}</div><div class="stat-value" style="color:${color}">${toman(value)}</div></div>`;
}
function tilesHTML(st, suffix, withFuture) {
  const tiles = [
    ["t-income", "درآمد " + suffix, st.income, "var(--income)"],
    ["t-expense", "هزینه " + suffix, st.expense, "var(--expense)"],
    ["t-net", "مانده " + suffix, st.net, st.net >= 0 ? "var(--income)" : "var(--expense)"],
    ["t-debt", "بدهی ثبت‌شده " + suffix, st.debtAdded, "var(--debt)"],
    ["t-credit", "طلب ثبت‌شده " + suffix, st.creditAdded, "var(--credit)"],
  ];
  if (withFuture) tiles.push(["t-future", "هزینه‌های آینده " + suffix, st.future, "var(--future)"]);
  return `<div class="tile-grid">${tiles.map((t, i) => tileHTML(t[0], t[1], t[2], t[3], i === tiles.length - 1 && tiles.length % 2 === 1)).join("")}</div>`;
}
function categoryChartHTML(expenses) {
  const map = {};
  expenses.forEach((e) => { const c = e.category || "بدون دسته‌بندی"; map[c] = (map[c] || 0) + Number(e.amount || 0); });
  const parts = Object.entries(map).filter((p) => p[1] > 0).sort((a, b) => b[1] - a[1]);
  const grand = parts.reduce((a, p) => a + p[1], 0);
  if (grand <= 0) return emptyHTML("هزینه‌ای برای نمایش نمودار وجود ندارد.");
  let acc = 0;
  const segs = parts.map(([, v], i) => {
    const a = (acc / grand) * 360; acc += v; const b = (acc / grand) * 360;
    return `${PALETTE[i % PALETTE.length]} ${a}deg ${b}deg`;
  });
  return `
    <div class="donut-wrap">
      <div class="donut" style="background:conic-gradient(${segs.join(",")})"></div>
      <div class="legend">
        ${parts.map(([c, v], i) => `
          <div class="legend-item">
            <span class="legend-dot" style="background:${PALETTE[i % PALETTE.length]}"></span>
            <span>${esc(c)} (${Math.round((v / grand) * 100)}٪)</span>
            <span class="legend-val">${toman(v)}</span>
          </div>`).join("")}
      </div>
    </div>`;
}
function yearOptionsHTML(selected) {
  const base = todayJalali().jy;
  let minY = base - 5;
  [state.incomes, state.expenses, state.debts, state.credits, state.futureExpenses].forEach((arr) => arr.forEach((x) => { if (x.date && x.date.jy && x.date.jy < minY) minY = x.date.jy; }));
  let out = "";
  for (let y = base + 1; y >= minY; y -= 1) out += `<option value="${y}" ${y === selected ? "selected" : ""}>${y}</option>`;
  return out;
}

function renderOverview() {
  const ov = drafts.ov;
  const { jy: my, jm: mm } = ov.month;
  const mst = periodStats((x) => x.date && x.date.jy === my && x.date.jm === mm, true);
  const msuffix = `${MONTHS[mm - 1]} ${my}`;
  const yy = ov.year;
  const yst = periodStats((x) => x.date && x.date.jy === yy, false);
  const ast = periodStats(() => true, false);
  return `
    <div class="stack">
      <div class="card">
        <div class="section-title">نمای کلی ماهانه</div>
        <div class="ov-sel">
          <select data-bind="ov.month.jm" data-num="true" data-rerender="true">
            ${MONTHS.map((n, i) => `<option value="${i + 1}" ${i + 1 === mm ? "selected" : ""}>${n}</option>`).join("")}
          </select>
          <select data-bind="ov.month.jy" data-num="true" data-rerender="true">${yearOptionsHTML(my)}</select>
        </div>
        ${tilesHTML(mst, msuffix, true)}
      </div>
      <div class="card">
        <div class="section-title">نمودار هزینه‌های ${msuffix}</div>
        ${categoryChartHTML(mst.expenses)}
      </div>

      <div class="card">
        <div class="section-title">نمای کلی سالانه</div>
        <div class="ov-sel">
          <select data-bind="ov.year" data-num="true" data-rerender="true">${yearOptionsHTML(yy)}</select>
        </div>
        ${tilesHTML(yst, "سال " + yy, false)}
      </div>
      <div class="card">
        <div class="section-title">نمودار هزینه‌های سال ${yy}</div>
        ${categoryChartHTML(yst.expenses)}
      </div>

      <div class="card">
        <div class="section-title">نمای کلی (از ابتدا تا الان)</div>
        ${tilesHTML(ast, "کل", false)}
      </div>
      <div class="card">
        <div class="section-title">نمودار هزینه‌ها (از ابتدا تا الان)</div>
        ${categoryChartHTML(ast.expenses)}
      </div>
    </div>`;
}

function renderIncome() {
  const d = drafts.income;
  const curKey = currentMonthKey();
  const visible = state.incomes.filter((i) => { const k = jalaliMonthKey(i.date); return !k || k >= curKey; });
  const list = visible.length === 0 ? emptyHTML("هنوز درآمدی برای این ماه ثبت نشده.") :
    visible.map((i) => rowHTML({ title: i.source || "بدون عنوان", amount: i.amount, colorVar: "--income", date: i.date, deleteAction: "delete-income", deleteId: i.id })).join("");
  return `
    <div class="stack">
      <div class="card">
        <div class="field"><span class="field-label">مبلغ (تومان)</span>${amountFieldHTML("income.amount", d.amount, "5,000,000")}</div>
        <div class="field"><span class="field-label">تاریخ</span>${dateSelectsHTML("income.date", d.date)}</div>
        <div class="field"><span class="field-label">محل درآمد</span><input class="input" data-bind="income.source" value="${esc(d.source)}" placeholder="مثلاً حقوق، فریلنسری، فروش..." /></div>
        <button class="btn" data-action="add-income">+ ثبت درآمد</button>
        ${errorHTML("income")}
      </div>
      <div class="hint-text">درآمدهای ماه‌های گذشته در تب «بایگانی» قابل مشاهده‌اند.</div>
      <div class="card">${list}</div>
    </div>`;
}

function renderExpense() {
  const d = drafts.expense;
  const curKey = currentMonthKey();
  const visible = state.expenses.filter((i) => { const k = jalaliMonthKey(i.date); return !k || k >= curKey; });
  const list = visible.length === 0 ? emptyHTML("هنوز هزینه‌ای برای این ماه ثبت نشده.") :
    visible.map((i) => rowHTML({
      title: i.for || "بدون عنوان",
      subtitle: [i.category, i.fromDebtId ? "بابت پرداخت بدهی" : null].filter(Boolean).join(" — ") || null,
      amount: i.amount, colorVar: "--expense", date: i.date, deleteAction: "delete-expense", deleteId: i.id,
    })).join("");
  return `
    <div class="stack">
      <div class="card">
        <div class="field"><span class="field-label">مبلغ (تومان)</span>${amountFieldHTML("expense.amount", d.amount, "250,000")}</div>
        <div class="field"><span class="field-label">تاریخ</span>${dateSelectsHTML("expense.date", d.date)}</div>
        <div class="field"><span class="field-label">بابت</span><input class="input" data-bind="expense.for" value="${esc(d.for)}" placeholder="مثلاً خرید، قبض، حمل‌ونقل..." /></div>
        <div class="field"><span class="field-label">دسته‌بندی</span>${categorySelectHTML("expense.category", d.category)}</div>
        <button class="btn" data-action="add-expense">+ ثبت هزینه</button>
        ${errorHTML("expense")}
      </div>
      <div class="hint-text">هزینه‌های ماه‌های گذشته در تب «بایگانی» قابل مشاهده‌اند.</div>
      <div class="card">${list}</div>
    </div>`;
}

function renderDebt() {
  const d = drafts.debt;
  const open = state.debts.filter((x) => !x.paid);
  const list = open.length === 0 ? emptyHTML("بدهی بازی وجود ندارد.") :
    open.map((x) => rowHTML({
      title: `${x.for || "بدون عنوان"}${x.creditor ? " — " + x.creditor : ""}`,
      subtitle: "پرداخت‌نشده",
      amount: x.amount, colorVar: "--debt", date: x.date,
      deleteAction: "delete-debt", deleteId: x.id,
      extraHTML: `<input type="checkbox" class="checkbox" data-action="toggle-debt" data-id="${x.id}" />`,
    })).join("");
  return `
    <div class="stack">
      <div class="card">
        <div class="field"><span class="field-label">مبلغ (تومان)</span>${amountFieldHTML("debt.amount", d.amount)}</div>
        <div class="field"><span class="field-label">تاریخ</span>${dateSelectsHTML("debt.date", d.date)}</div>
        <div class="field"><span class="field-label">بابت</span><input class="input" data-bind="debt.for" value="${esc(d.for)}" placeholder="مثلاً وام، قرض..." /></div>
        <div class="field"><span class="field-label">نام طلبکار</span><input class="input" data-bind="debt.creditor" value="${esc(d.creditor)}" placeholder="طرف بدهی" /></div>
        <button class="btn" data-action="add-debt">+ ثبت بدهی</button>
        ${errorHTML("debt")}
      </div>
      <div class="card">
        <div class="hint-text">با تیک‌زدن و تأیید پرداخت، بدهی به «بایگانی ← سابقه بدهی» می‌رود و مبلغ آن در «هزینه‌ها» ثبت می‌شود.</div>
        ${list}
      </div>
    </div>`;
}

function renderCredit() {
  const d = drafts.credit;
  const open = state.credits.filter((x) => !x.received);
  const list = open.length === 0 ? emptyHTML("طلب بازی وجود ندارد.") :
    open.map((x) => rowHTML({
      title: `${x.for || "بدون عنوان"}${x.debtor ? " — " + x.debtor : ""}`,
      subtitle: "دریافت‌نشده",
      amount: x.amount, colorVar: "--credit", date: x.date,
      deleteAction: "delete-credit", deleteId: x.id,
      extraHTML: `<input type="checkbox" class="checkbox" data-action="toggle-credit" data-id="${x.id}" />`,
    })).join("");
  return `
    <div class="stack">
      <div class="card">
        <div class="field"><span class="field-label">مبلغ (تومان)</span>${amountFieldHTML("credit.amount", d.amount)}</div>
        <div class="field"><span class="field-label">تاریخ</span>${dateSelectsHTML("credit.date", d.date)}</div>
        <div class="field"><span class="field-label">بابت</span><input class="input" data-bind="credit.for" value="${esc(d.for)}" placeholder="مثلاً قرض‌دادن..." /></div>
        <div class="field"><span class="field-label">نام بدهکار</span><input class="input" data-bind="credit.debtor" value="${esc(d.debtor)}" placeholder="طرف طلب" /></div>
        <button class="btn" data-action="add-credit">+ ثبت طلب</button>
        ${errorHTML("credit")}
      </div>
      <div class="card">
        <div class="hint-text">با تیک‌زدن و تأیید وصول، طلب به «بایگانی ← سابقه طلب» می‌رود و مبلغ آن در «درآمدها» ثبت می‌شود.</div>
        ${list}
      </div>
    </div>`;
}

function renderFuture() {
  const d = drafts.future;
  const sorted = [...state.futureExpenses].sort((a, b) => jalaliRank(a.date) - jalaliRank(b.date));
  const list = sorted.length === 0 ? emptyHTML("هزینه آینده‌ای ثبت نشده.") :
    sorted.map((f) => rowHTML({ title: f.for || "بدون عنوان", amount: f.amount, colorVar: "--future", date: f.date, deleteAction: "delete-future", deleteId: f.id })).join("");
  return `
    <div class="stack">
      <div class="card">
        <div class="field"><span class="field-label">مبلغ (تومان)</span>${amountFieldHTML("future.amount", d.amount)}</div>
        <div class="field"><span class="field-label">تاریخ (باید دستی انتخاب شود)</span>${dateSelectsHTML("future.date", d.date)}</div>
        <div class="field"><span class="field-label">بابت</span><input class="input" data-bind="future.for" value="${esc(d.for)}" placeholder="مثلاً قسط، اجاره..." /></div>
        <button class="btn" data-action="add-future">+ ثبت هزینه آینده</button>
        ${errorHTML("future")}
      </div>
      <div class="card">${list}</div>
    </div>`;
}

function renderArchive() {
  const view = drafts.archiveView;
  const pills = `
    <div class="pills">
      <button class="pill ${view === "months" ? "active" : ""}" data-action="archive-view" data-view="months">بایگانی ماه</button>
      <button class="pill ${view === "years" ? "active" : ""}" data-action="archive-view" data-view="years">بایگانی سال</button>
      <button class="pill ${view === "credits" ? "active" : ""}" data-action="archive-view" data-view="credits">سابقه طلب</button>
      <button class="pill ${view === "debts" ? "active" : ""}" data-action="archive-view" data-view="debts">سابقه بدهی</button>
    </div>`;
  let body = "";
  if (view === "credits") {
    const items = state.credits.filter((c) => c.received);
    body = items.length === 0 ? `<div class="card">${emptyHTML("هنوز طلبی وصول نشده است.")}</div>` :
      `<div class="card"><div class="month-nums" style="margin-bottom:6px;">جمع طلب‌های وصول‌شده: ${toman(sum(items))}</div>${items.map((x) => rowHTML({
        title: `${x.for || "بدون عنوان"}${x.debtor ? " — " + x.debtor : ""}`,
        subtitle: x.receivedDate ? `وصول‌شده: ${jalaliStr(x.receivedDate)}` : "وصول‌شده",
        amount: x.amount, colorVar: "--credit", date: x.date, dateLabel: "ثبت:",
        deleteAction: "delete-credit", deleteId: x.id,
        actionsHTML: `<button class="link-btn" data-action="restore-credit" data-id="${x.id}">بازگردانی</button>`,
      })).join("")}</div>`;
  } else if (view === "debts") {
    const items = state.debts.filter((d) => d.paid);
    body = items.length === 0 ? `<div class="card">${emptyHTML("هنوز بدهی‌ای پرداخت نشده است.")}</div>` :
      `<div class="card"><div class="month-nums" style="margin-bottom:6px;">جمع بدهی‌های پرداخت‌شده: ${toman(sum(items))}</div>${items.map((x) => rowHTML({
        title: `${x.for || "بدون عنوان"}${x.creditor ? " — " + x.creditor : ""}`,
        subtitle: x.paidDate ? `پرداخت‌شده: ${jalaliStr(x.paidDate)}` : "پرداخت‌شده",
        amount: x.amount, colorVar: "--debt", date: x.date, dateLabel: "ثبت:",
        deleteAction: "delete-debt", deleteId: x.id,
        actionsHTML: `<button class="link-btn" data-action="restore-debt" data-id="${x.id}">بازگردانی</button>`,
      })).join("")}</div>`;
  } else if (view === "years") {
    const curY = todayJalali().jy;
    const years = {};
    state.incomes.forEach((i) => { if (i.date && i.date.jy < curY) { const y = years[i.date.jy] = years[i.date.jy] || { inc: [], exp: [] }; y.inc.push(i); } });
    state.expenses.forEach((i) => { if (i.date && i.date.jy < curY) { const y = years[i.date.jy] = years[i.date.jy] || { inc: [], exp: [] }; y.exp.push(i); } });
    const keys = Object.keys(years).map(Number).sort((a, b) => b - a);
    if (keys.length === 0) {
      body = `<div class="card">${emptyHTML("هنوز سال گذشته‌ای وجود ندارد. با تمام‌شدن هر سال، خلاصه آن سال اینجا نمایش داده می‌شود.")}</div>`;
    } else {
      body = keys.map((y) => {
        const g = years[y];
        const ti = sum(g.inc), te = sum(g.exp), net = ti - te;
        const months = {};
        g.inc.forEach((i) => { const m = months[i.date.jm] = months[i.date.jm] || { i: 0, e: 0 }; m.i += Number(i.amount || 0); });
        g.exp.forEach((i) => { const m = months[i.date.jm] = months[i.date.jm] || { i: 0, e: 0 }; m.e += Number(i.amount || 0); });
        const rows = Object.keys(months).map(Number).sort((a, b) => b - a).map((m) => `
          <div class="month-row">
            <div><div class="month-title">${MONTHS[m - 1]}</div><div class="month-nums">درآمد: ${toman(months[m].i)} — هزینه: ${toman(months[m].e)}</div></div>
            <div class="month-net" style="color:var(${months[m].i - months[m].e >= 0 ? "--income" : "--expense"})">${toman(months[m].i - months[m].e)}</div>
          </div>`).join("");
        return `
          <div class="card">
            <div class="section-title">سال ${y}</div>
            <div class="summary-3" style="margin-bottom:10px;">
              <div class="sbox"><div class="stat-label">درآمد</div><div class="stat-value" style="color:var(--income)">${toman(ti)}</div></div>
              <div class="sbox"><div class="stat-label">هزینه</div><div class="stat-value" style="color:var(--expense)">${toman(te)}</div></div>
              <div class="sbox"><div class="stat-label">مانده</div><div class="stat-value" style="color:${net >= 0 ? "var(--income)" : "var(--expense)"}">${toman(net)}</div></div>
            </div>
            ${rows}
          </div>`;
      }).join("");
    }
  } else {
    const curKey = currentMonthKey();
    const archIncomes = state.incomes.filter((i) => { const k = jalaliMonthKey(i.date); return k && k < curKey; });
    const archExpenses = state.expenses.filter((i) => { const k = jalaliMonthKey(i.date); return k && k < curKey; });
    if (archIncomes.length === 0 && archExpenses.length === 0) {
      body = `<div class="card">${emptyHTML("هنوز ماه گذشته‌ای وجود ندارد. با تمام‌شدن هر ماه، درآمدها و هزینه‌های آن ماه خودکار به اینجا منتقل می‌شوند.")}</div>`;
    } else {
      const map = {};
      archIncomes.forEach((i) => { const k = jalaliMonthKey(i.date); map[k] = map[k] || { incomes: [], expenses: [] }; map[k].incomes.push(i); });
      archExpenses.forEach((i) => { const k = jalaliMonthKey(i.date); map[k] = map[k] || { incomes: [], expenses: [] }; map[k].expenses.push(i); });
      body = Object.keys(map).sort((a, b) => b.localeCompare(a)).map((k) => {
        const [jy, jm] = k.split("-").map(Number);
        const group = map[k];
        const rows = [
          ...group.incomes.map((i) => rowHTML({ title: i.source || "بدون عنوان", amount: i.amount, colorVar: "--income", date: i.date, deleteAction: "delete-income", deleteId: i.id })),
          ...group.expenses.map((i) => rowHTML({
            title: i.for || "بدون عنوان",
            subtitle: [i.category, i.fromDebtId ? "بابت پرداخت بدهی" : null].filter(Boolean).join(" — ") || null,
            amount: i.amount, colorVar: "--expense", date: i.date, deleteAction: "delete-expense", deleteId: i.id,
          })),
        ].join("");
        return `
          <div class="card">
            <div class="section-title">${MONTHS[jm - 1]} ${jy}</div>
            <div class="month-nums" style="margin-bottom:8px;">درآمد: ${toman(sum(group.incomes))} — هزینه: ${toman(sum(group.expenses))}</div>
            ${rows}
          </div>`;
      }).join("");
    }
  }
  return `<div class="stack">${pills}${body}</div>`;
}

async function shareText(title, text) {
  const cap = window.Capacitor;
  const P = cap && cap.Plugins;
  if (cap && cap.isNativePlatform && cap.isNativePlatform() && P && P.Share) {
    try { await P.Share.share({ title, text, dialogTitle: "اشتراک‌گذاری" }); return; }
    catch (e) { if (String((e && e.message) || e).toLowerCase().includes("cancel")) return; }
  }
  if (navigator.share) { try { await navigator.share({ title, text }); } catch (e) { /* cancelled */ } return; }
  try { await navigator.clipboard.writeText(text); showMessage("متن گزارش کپی شد."); }
  catch (e) { showMessage(text); }
}
/* ---- share menu: apps / copy / PDF ---- */
let pendingShare = null;
function openShareMenu(title, text, doc) {
  pendingShare = { title, text, doc };
  modalYes = null;
  document.getElementById("modal-root").innerHTML = `
    <div class="modal-back"><div class="modal">
      <div class="modal-msg">اشتراک‌گذاری</div>
      <div class="share-list">
        <button class="btn" data-share="app">${ico("share", 20)} اشتراک‌گذاری (انتخاب برنامه)</button>
        <button class="btn btn-copy" data-share="copy">${ico("copy", 20)} کپی متن</button>
        <button class="btn btn-pdf" data-share="pdf">${ico("pdf", 20)} تبدیل به PDF</button>
        <button class="btn btn-light" data-modal="no">بستن</button>
      </div>
    </div></div>`;
}
function nativeShareAvailable() {
  const cap = window.Capacitor, P = cap && cap.Plugins;
  return !!(cap && cap.isNativePlatform && cap.isNativePlatform() && P && P.Share);
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); showMessage("متن کپی شد."); return; } catch (e) { /* fallback */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.focus(); ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    showMessage(ok ? "متن کپی شد." : "کپی انجام نشد.");
  } catch (e) { showMessage("کپی انجام نشد."); }
}
async function shareViaApps(title, text) {
  if (nativeShareAvailable()) {
    try { await window.Capacitor.Plugins.Share.share({ title, text, dialogTitle: "اشتراک‌گذاری" }); return; }
    catch (e) { if (String((e && e.message) || e).toLowerCase().includes("cancel")) return; }
  }
  if (navigator.share) { try { await navigator.share({ title, text }); } catch (e) { /* cancelled */ } return; }
  showMessage("اشتراک‌گذاری مستقیم در این دستگاه پشتیبانی نمی‌شود. از گزینه «کپی متن» استفاده کنید.");
}

/* ---- PDF (text rendered to canvas pages -> JPEG -> minimal PDF) ---- */
async function buildPdfBytes(title, items) {
  const W = 1240, H = 1754, M = 80;
  const family = getComputedStyle(document.body).fontFamily;
  try { await document.fonts.ready; } catch (e) { /* ignore */ }
  const pages = [];
  let canvas, ctx, y;
  const newPage = () => {
    canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
    ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#4f46e5"; ctx.fillRect(0, 0, W, 14);
    pages.push(canvas); y = M;
  };
  const font = (sz, bold) => { ctx.font = `${bold ? "700" : "400"} ${sz}px ${family}`; };
  const fit = (txt, maxW) => {
    if (ctx.measureText(txt).width <= maxW) return txt;
    let t = txt; while (t.length > 1 && ctx.measureText(t + "…").width > maxW) t = t.slice(0, -1);
    return t + "…";
  };
  newPage();
  ctx.direction = "rtl";
  for (const it of items) {
    const h = it.type === "title" ? 90 : it.type === "gap" ? 26 : it.type === "h" ? 70 : 52;
    if (y + h > H - M) newPage();
    ctx.direction = "rtl";
    if (it.type === "title") {
      font(48, true); ctx.fillStyle = "#1d2140"; ctx.textAlign = "right"; ctx.fillText(it.text, W - M, y + 50);
    } else if (it.type === "sub") {
      font(28, false); ctx.fillStyle = "#6b7194"; ctx.textAlign = "right"; ctx.fillText(it.text, W - M, y + 34);
    } else if (it.type === "kv") {
      font(32, false); ctx.fillStyle = "#1d2140"; ctx.textAlign = "right"; ctx.fillText(it.label, W - M, y + 36);
      font(32, true); ctx.fillStyle = it.color || "#1d2140"; ctx.textAlign = "left"; ctx.fillText(it.value, M, y + 36);
    } else if (it.type === "h") {
      ctx.fillStyle = "#eef0ff"; ctx.fillRect(M, y + 8, W - 2 * M, 52);
      font(32, true); ctx.fillStyle = "#4f46e5"; ctx.textAlign = "right"; ctx.fillText(it.text, W - M - 14, y + 45);
    } else if (it.type === "row") {
      font(29, true); ctx.textAlign = "left"; ctx.fillStyle = it.color || "#1d2140";
      const aw = ctx.measureText(it.left).width;
      ctx.fillText(it.left, M, y + 34);
      font(29, false); ctx.fillStyle = "#1d2140"; ctx.textAlign = "right";
      ctx.fillText(fit(it.right, W - 2 * M - aw - 30), W - M, y + 34);
      ctx.strokeStyle = "#e3e5f3"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(M, y + 46); ctx.lineTo(W - M, y + 46); ctx.stroke();
    }
    y += h;
  }
  const enc = new TextEncoder();
  const chunks = []; let len = 0; const offsets = [];
  const push = (d) => { const u = typeof d === "string" ? enc.encode(d) : d; chunks.push(u); len += u.length; };
  const obj = (n, body) => { offsets[n] = len; push(`${n} 0 obj\n`); push(body); push("\nendobj\n"); };
  push("%PDF-1.4\n");
  const n = pages.length;
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  obj(2, `<< /Type /Pages /Kids [${pages.map((_, i) => `${3 + i * 3} 0 R`).join(" ")}] /Count ${n} >>`);
  pages.forEach((cv, i) => {
    const b64 = cv.toDataURL("image/jpeg", 0.9).split(",")[1];
    const bin = atob(b64); const img = new Uint8Array(bin.length);
    for (let k = 0; k < bin.length; k += 1) img[k] = bin.charCodeAt(k);
    const pg = 3 + i * 3, ct = pg + 1, im = pg + 2;
    obj(pg, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 ${im} 0 R >> >> /Contents ${ct} 0 R >>`);
    const cs = "q 595 0 0 842 0 0 cm /Im0 Do Q";
    obj(ct, `<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`);
    offsets[im] = len; push(`${im} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${W} /Height ${H} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.length} >>\nstream\n`);
    push(img); push("\nendstream\nendobj\n");
  });
  const total = 3 + n * 3;
  const xref = len;
  push(`xref\n0 ${total}\n0000000000 65535 f \n`);
  for (let k = 1; k < total; k += 1) push(String(offsets[k]).padStart(10, "0") + " 00000 n \n");
  push(`trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  const out = new Uint8Array(len); let o = 0;
  chunks.forEach((c) => { out.set(c, o); o += c.length; });
  return out;
}
function bytesToBase64(bytes) {
  let bin = ""; const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + step));
  return btoa(bin);
}
async function exportPdf(title, items) {
  showMessage("در حال ساخت PDF...");
  let bytes;
  try { bytes = await buildPdfBytes(title, items); }
  catch (e) { showMessage("ساخت PDF با خطا مواجه شد."); return; }
  closeModal();
  const t = todayJalali();
  const name = `${title.replace(/[^\w\u0600-\u06FF]+/g, "-")}-${t.jy}-${String(t.jm).padStart(2, "0")}-${String(t.jd).padStart(2, "0")}.pdf`;
  const cap = window.Capacitor, P = cap && cap.Plugins;
  if (nativeShareAvailable() && P.Filesystem) {
    try {
      await P.Filesystem.writeFile({ path: name, data: bytesToBase64(bytes), directory: "CACHE" });
      const r = await P.Filesystem.getUri({ path: name, directory: "CACHE" });
      await P.Share.share({ title, url: r.uri, dialogTitle: "ذخیره یا ارسال PDF" });
      return;
    } catch (e) {
      if (String((e && e.message) || e).toLowerCase().includes("cancel")) return;
    }
  }
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function reportDoc() {
  const r = reportData();
  const it = [
    { type: "title", text: "گزارش مالی" },
    { type: "sub", text: `از ${jalaliStr(reportRange.from)} تا ${jalaliStr(reportRange.to)}` },
    { type: "gap" },
    { type: "kv", label: "جمع درآمد", value: toman(r.ti), color: "#0E9F6E" },
    { type: "kv", label: "جمع هزینه", value: toman(r.te), color: "#E5336A" },
    { type: "kv", label: "مانده", value: toman(r.net), color: r.net >= 0 ? "#0E9F6E" : "#E5336A" },
    { type: "gap" },
    { type: "h", text: `ریز درآمدها (${r.incomes.length} مورد)` },
  ];
  r.incomes.forEach((i) => it.push({ type: "row", right: `${jalaliStr(i.date)} — ${i.source || "بدون عنوان"}`, left: toman(i.amount), color: "#0E9F6E" }));
  it.push({ type: "gap" }, { type: "h", text: `ریز هزینه‌ها (${r.expenses.length} مورد)` });
  r.expenses.forEach((i) => it.push({ type: "row", right: `${jalaliStr(i.date)} — ${i.for || "بدون عنوان"}${i.category ? " (" + i.category + ")" : ""}`, left: toman(i.amount), color: "#E5336A" }));
  return it;
}
function ledgerDoc(led) {
  const it = [
    { type: "title", text: `دفتر موقت: ${led.name}` },
    { type: "sub", text: `تعداد: ${led.items.length} مورد` },
    { type: "gap" },
    { type: "kv", label: "جمع کل هزینه‌ها", value: toman(sum(led.items)), color: "#E5336A" },
    { type: "gap" },
    { type: "h", text: "ریز هزینه‌ها" },
  ];
  [...led.items].sort((a, b) => jalaliRank(a.date) - jalaliRank(b.date))
    .forEach((i) => it.push({ type: "row", right: `${jalaliStr(i.date)} — ${i.for || "بدون عنوان"}`, left: toman(i.amount), color: "#E5336A" }));
  return it;
}

function reportData() {
  if (!reportRange) return null;
  const lo = Math.min(jalaliRank(reportRange.from), jalaliRank(reportRange.to));
  const hi = Math.max(jalaliRank(reportRange.from), jalaliRank(reportRange.to));
  const inRange = (x) => { const r = jalaliRank(x.date); return r >= lo && r <= hi; };
  const byDate = (a, b) => jalaliRank(a.date) - jalaliRank(b.date);
  const incomes = state.incomes.filter(inRange).sort(byDate);
  const expenses = state.expenses.filter(inRange).sort(byDate);
  return { incomes, expenses, ti: sum(incomes), te: sum(expenses), net: sum(incomes) - sum(expenses) };
}
function reportText() {
  const r = reportData();
  if (!r) return "";
  const L = [];
  L.push("📊 گزارش مالی");
  L.push(`از ${jalaliStr(reportRange.from)} تا ${jalaliStr(reportRange.to)}`);
  L.push("");
  L.push(`جمع درآمد: ${toman(r.ti)}`);
  L.push(`جمع هزینه: ${toman(r.te)}`);
  L.push(`مانده: ${toman(r.net)}`);
  L.push("");
  L.push(`ریز درآمدها (${r.incomes.length} مورد):`);
  if (!r.incomes.length) L.push("—");
  r.incomes.forEach((i, n) => L.push(`${n + 1}. ${jalaliStr(i.date)} | ${i.source || "بدون عنوان"} | ${toman(i.amount)}`));
  L.push("");
  L.push(`ریز هزینه‌ها (${r.expenses.length} مورد):`);
  if (!r.expenses.length) L.push("—");
  r.expenses.forEach((i, n) => L.push(`${n + 1}. ${jalaliStr(i.date)} | ${i.for || "بدون عنوان"}${i.category ? " (" + i.category + ")" : ""} | ${toman(i.amount)}`));
  return L.join("\n");
}
function ledgerText(led) {
  const L = [];
  L.push(`📒 دفتر موقت: ${led.name}`);
  L.push(`جمع کل هزینه‌ها: ${toman(sum(led.items))}`);
  L.push(`تعداد: ${led.items.length} مورد`);
  L.push("");
  [...led.items].sort((a, b) => jalaliRank(a.date) - jalaliRank(b.date))
    .forEach((i, n) => L.push(`${n + 1}. ${jalaliStr(i.date)} | ${i.for || "بدون عنوان"} | ${toman(i.amount)}`));
  return L.join("\n");
}

function generateReport() {
  if (!jalaliValid(drafts.report.from) || !jalaliValid(drafts.report.to)) {
    formErrors.report = "لطفاً بازه تاریخی (از تاریخ و تا تاریخ) را کامل انتخاب کنید.";
    render();
    return;
  }
  reportRange = { from: { ...drafts.report.from }, to: { ...drafts.report.to } };
  formErrors.report = "";
  render();
}
function renderReport() {
  const d = drafts.report;
  let body = "";
  if (reportRange) {
    const R = reportData();
    const incomes = R.incomes, expenses = R.expenses, ti = R.ti, te = R.te, net = R.net;
    const cats = {};
    expenses.forEach((e) => { const c = e.category || "بدون دسته‌بندی"; cats[c] = (cats[c] || 0) + Number(e.amount || 0); });
    const catRows = Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([c, v]) => `
      <div class="month-row"><div class="month-title">${esc(c)}</div><div class="month-net" style="color:var(--expense)">${toman(v)}</div></div>`).join("");
    body = `
      <div class="card">
        <div class="section-title">گزارش کلی</div>
        <div class="month-nums" style="margin-bottom:10px;">${jalaliStr(reportRange.from)} تا ${jalaliStr(reportRange.to)}</div>
        <div class="summary-3">
          <div class="sbox"><div class="stat-label">جمع درآمد</div><div class="stat-value" style="color:var(--income)">${toman(ti)}</div></div>
          <div class="sbox"><div class="stat-label">جمع هزینه</div><div class="stat-value" style="color:var(--expense)">${toman(te)}</div></div>
          <div class="sbox"><div class="stat-label">مانده</div><div class="stat-value" style="color:${net >= 0 ? "var(--income)" : "var(--expense)"}">${toman(net)}</div></div>
        </div>
      </div>
      ${catRows ? `<div class="card"><div class="section-title">هزینه به تفکیک دسته‌بندی</div>${catRows}</div>` : ""}
      <div class="card">
        <div class="section-title">ریز درآمدها (${incomes.length} مورد)</div>
        <div class="month-nums" style="margin-bottom:6px;">جمع: ${toman(ti)}</div>
        ${incomes.length === 0 ? emptyHTML("درآمدی در این بازه یافت نشد.") :
          incomes.map((i) => rowHTML({ title: i.source || "بدون عنوان", amount: i.amount, colorVar: "--income", date: i.date })).join("")}
      </div>
      <div class="card">
        <div class="section-title">ریز هزینه‌ها (${expenses.length} مورد)</div>
        <div class="month-nums" style="margin-bottom:6px;">جمع: ${toman(te)}</div>
        ${expenses.length === 0 ? emptyHTML("هزینه‌ای در این بازه یافت نشد.") :
          expenses.map((i) => rowHTML({ title: i.for || "بدون عنوان", subtitle: i.category, amount: i.amount, colorVar: "--expense", date: i.date })).join("")}
      </div>`;
  }
  return `
    <div class="stack">
      <div class="card">
        <div class="field"><span class="field-label">از تاریخ</span>${dateSelectsHTML("report.from", d.from)}</div>
        <div class="field"><span class="field-label">تا تاریخ</span>${dateSelectsHTML("report.to", d.to)}</div>
        <button class="btn" data-action="generate-report">نمایش گزارش مالی</button>
        ${errorHTML("report")}
      </div>
      ${reportRange ? `<button class="btn btn-share" data-action="share-report">${ico("share", 20)} اشتراک‌گذاری گزارش</button>` : ""}
      ${body}
    </div>`;
}

function renderLedger() {
  const led = state.ledgers.find((l) => l.id === drafts.openLedger);
  if (led) {
    const d = drafts.ledgerEntry;
    const total = sum(led.items);
    const items = [...led.items].sort((a, b) => jalaliRank(b.date) - jalaliRank(a.date));
    const list = items.length === 0 ? emptyHTML("هنوز هزینه‌ای در این دفتر ثبت نشده.") :
      items.map((i) => rowHTML({ title: i.for || "بدون عنوان", amount: i.amount, colorVar: "--expense", date: i.date, deleteAction: "delete-ledger-entry", deleteId: i.id })).join("");
    return `
      <div class="stack">
        <button class="back-btn" data-action="close-ledger">${ico("back", 18)} بازگشت به دفترها</button>
        <div class="ledger-total">
          <div><div class="lt-name">${esc(led.name)}</div><div class="lt-label">جمع کل هزینه‌ها (${led.items.length} مورد)</div></div>
          <div class="lt-val">${toman(total)}</div>
        </div>
        <div class="card">
          <div class="field"><span class="field-label">مبلغ (تومان)</span>${amountFieldHTML("ledgerEntry.amount", d.amount)}</div>
          <div class="field"><span class="field-label">تاریخ</span>${dateSelectsHTML("ledgerEntry.date", d.date)}</div>
          <div class="field"><span class="field-label">بابت</span><input class="input" data-bind="ledgerEntry.for" value="${esc(d.for)}" placeholder="مثلاً بنزین، ناهار، هتل..." /></div>
          <button class="btn" data-action="add-ledger-entry">+ ثبت هزینه</button>
          ${errorHTML("ledgerEntry")}
        </div>
        <div class="card">${list}</div>
        <button class="btn btn-share" data-action="share-ledger" data-id="${led.id}">${ico("share", 20)} اشتراک‌گذاری دفتر</button>
        <button class="btn btn-light" data-action="delete-ledger" data-id="${led.id}">حذف این دفتر</button>
      </div>`;
  }
  const list = state.ledgers.length === 0 ? emptyHTML("هنوز دفتری ساخته نشده. مثلاً «سفر شمال» یا «دورهمی».") :
    state.ledgers.map((l) => `
      <div class="ledger-item" data-action="open-ledger" data-id="${l.id}">
        <div style="min-width:0;">
          <div class="row-title">${esc(l.name)}</div>
          <div class="row-subtitle">${l.items.length} هزینه</div>
        </div>
        <span class="row-amount" style="color:var(--expense)">${toman(sum(l.items))}</span>
      </div>`).join("");
  return `
    <div class="stack">
      <div class="card">
        <div class="field"><span class="field-label">نام دفتر جدید</span><input class="input" data-bind="ledgerName" value="${esc(drafts.ledgerName)}" placeholder="مثلاً سفر مشهد" /></div>
        <button class="btn" data-action="add-ledger">+ ساخت دفتر</button>
        ${errorHTML("ledger")}
      </div>
      <div class="hint-text">دفترهای موقت جدا از حساب اصلی هستند و در موجودی، بایگانی و گزارش‌ها حساب نمی‌شوند.</div>
      <div class="card">${list}</div>
    </div>`;
}

function searchResultsHTML(query) {
  const q = (query || "").trim();
  if (!q) return emptyHTML("عبارت یا عددی برای جستجو وارد کنید.");
  const qLower = q.toLowerCase();
  const qDigits = q.replace(/[^\d]/g, "");
  function matchText(...fields) { return fields.some((f) => f && String(f).toLowerCase().includes(qLower)); }
  function matchAmount(amount) { return qDigits.length > 0 && String(Math.trunc(Number(amount) || 0)).includes(qDigits); }
  const incomes = state.incomes.filter((i) => matchText(i.source) || matchAmount(i.amount));
  const expenses = state.expenses.filter((i) => matchText(i.for, i.category) || matchAmount(i.amount));
  const debts = state.debts.filter((i) => matchText(i.for, i.creditor) || matchAmount(i.amount));
  const credits = state.credits.filter((i) => matchText(i.for, i.debtor) || matchAmount(i.amount));
  if (incomes.length + expenses.length + debts.length + credits.length === 0) return emptyHTML("نتیجه‌ای یافت نشد.");
  function section(title, items, renderer) {
    if (items.length === 0) return "";
    return `<div class="card"><div class="section-title">${esc(title)} (${items.length})</div>${items.map(renderer).join("")}</div>`;
  }
  return [
    section("درآمدها", incomes, (i) => rowHTML({ title: i.source || "بدون عنوان", amount: i.amount, colorVar: "--income", date: i.date, deleteAction: "delete-income", deleteId: i.id })),
    section("هزینه‌ها", expenses, (i) => rowHTML({ title: i.for || "بدون عنوان", subtitle: i.category, amount: i.amount, colorVar: "--expense", date: i.date, deleteAction: "delete-expense", deleteId: i.id })),
    section("بدهی‌ها", debts, (x) => rowHTML({ title: `${x.for || "بدون عنوان"}${x.creditor ? " — " + x.creditor : ""}`, subtitle: x.paid ? "پرداخت شد" : "پرداخت‌نشده", amount: x.amount, colorVar: x.paid ? "--muted" : "--debt", date: x.date, deleteAction: "delete-debt", deleteId: x.id })),
    section("طلب‌ها", credits, (x) => rowHTML({ title: `${x.for || "بدون عنوان"}${x.debtor ? " — " + x.debtor : ""}`, subtitle: x.received ? "دریافت شد" : "دریافت‌نشده", amount: x.amount, colorVar: x.received ? "--muted" : "--credit", date: x.date, deleteAction: "delete-credit", deleteId: x.id })),
  ].join("");
}
function renderSearch() {
  return `
    <div class="stack">
      <div class="card">
        <div class="field">
          <span class="field-label">جستجو (متن یا عدد)</span>
          <input class="input" id="search-input" data-live-search="true" value="${esc(drafts.search)}" placeholder="مثلاً: قبض یا 50000" />
        </div>
      </div>
      <div id="search-results">${searchResultsHTML(drafts.search)}</div>
    </div>`;
}

function renderNotes() {
  const notesHTML = state.notes.length === 0 ? emptyHTML("هنوز یادداشتی ثبت نشده.") :
    state.notes.map((n) => `
      <div class="card note-card">
        <div class="note-date">${jalaliStr(n.date)}</div>
        <div class="note-text">${esc(n.text)}</div>
        <button class="icon-btn note-delete" data-action="delete-note" data-id="${n.id}">${ico("x", 16)}</button>
      </div>`).join("");
  return `
    <div class="stack">
      <div class="card">
        <div class="field"><span class="field-label">یادداشت</span><textarea rows="3" data-bind="note" placeholder="نکته‌ای درباره وضعیت مالی خود بنویسید...">${esc(drafts.note)}</textarea></div>
        <button class="btn" data-action="add-note">+ افزودن یادداشت</button>
        ${errorHTML("note")}
      </div>
      ${notesHTML}
    </div>`;
}

const RENDERERS = {
  overview: renderOverview, income: renderIncome, expense: renderExpense,
  debt: renderDebt, credit: renderCredit, future: renderFuture, archive: renderArchive,
  report: renderReport, search: renderSearch, notes: renderNotes,
  ledger: renderLedger, settings: renderSettings,
};

/* ============ navigation (hardware back) ============ */
let navIdx = 0;
function navigate(tab, ledger) {
  const newLedger = ledger === undefined ? null : ledger;
  if (tab === activeTab && newLedger === drafts.openLedger) { render(); return; }
  activeTab = tab;
  drafts.openLedger = newLedger;
  navIdx += 1;
  try { history.pushState({ tab, ledger: newLedger, idx: navIdx }, ""); } catch (e) { /* ignore */ }
  window.scrollTo(0, 0);
  render();
}
function goBack() {
  if (navIdx > 0) history.back();
  else { drafts.openLedger = null; render(); }
}
window.addEventListener("popstate", (e) => {
  if (document.getElementById("modal-root").innerHTML) closeModal();
  const st = e.state;
  if (!st) return;
  activeTab = st.tab;
  drafts.openLedger = st.ledger;
  navIdx = st.idx || 0;
  render();
});
try { history.replaceState({ tab: "overview", ledger: null, idx: 0 }, ""); } catch (e) { /* ignore */ }
(function bindNativeBack() {
  const P = window.Capacitor && window.Capacitor.Plugins;
  if (P && P.App && P.App.addListener) {
    P.App.addListener("backButton", () => {
      if (document.getElementById("modal-root").innerHTML) { closeModal(); return; }
      if (navIdx > 0) history.back();
      else P.App.exitApp();
    });
  }
})();

/* ============ main render + events ============ */
function render() {
  document.getElementById("header-actions").innerHTML = `
    <button class="header-btn ${activeTab === "search" ? "active" : ""}" data-action="set-tab" data-tab="search" title="جستجو">${ico("search", 19)}</button>
    <button class="header-btn ${activeTab === "settings" ? "active" : ""}" data-action="set-tab" data-tab="settings" title="تنظیمات">${ico("sliders", 19)}</button>`;
  document.getElementById("tabs").innerHTML = TOP_TABS.map((tb) =>
    `<button class="tab-btn ${tb.key === activeTab ? "active" : ""}" data-action="set-tab" data-tab="${tb.key}">${ico(tb.icon, 20)}<span>${tb.label}</span></button>`
  ).join("");
  document.getElementById("bottom-nav").innerHTML = BOTTOM_TABS.map((tb) =>
    `<button class="nav-btn ${tb.key === activeTab ? "active" : ""}" data-action="set-tab" data-tab="${tb.key}"><span class="nav-ico" style="--c:${tb.color}">${ico(tb.icon, 24)}</span><span>${tb.label}</span></button>`
  ).join("");
  document.getElementById("content").innerHTML = RENDERERS[activeTab]();
}

function attachEvents() {
  const root = document.getElementById("app");

  document.getElementById("modal-root").addEventListener("click", (e) => {
    const sh = e.target.closest("[data-share]");
    if (sh && pendingShare) {
      const ps = pendingShare;
      const kind = sh.dataset.share;
      if (kind === "app") { closeModal(); shareViaApps(ps.title, ps.text); }
      else if (kind === "copy") { copyText(ps.text); }
      else if (kind === "pdf") { ps.doc(); }
      return;
    }
    const el = e.target.closest("[data-modal]");
    if (!el) return;
    const cb = el.dataset.modal === "yes" ? modalYes : null;
    closeModal();
    if (cb) cb();
  });

  root.addEventListener("input", (e) => {
    const el = e.target;
    if (el.dataset.liveSearch) {
      drafts.search = el.value;
      const resultsEl = document.getElementById("search-results");
      if (resultsEl) resultsEl.innerHTML = searchResultsHTML(drafts.search);
      return;
    }
    const bind = el.dataset.bind;
    if (!bind) return;
    let val = el.value;
    if (el.dataset.num) {
      setByPath(drafts, bind, parseInt(val, 10));
      if (el.dataset.rerender) render();
      return;
    }
    if (el.classList.contains("amount-field")) {
      const digits = val.replace(/[^\d]/g, "");
      const num = digits ? parseInt(digits, 10) : "";
      el.value = num === "" ? "" : num.toLocaleString("en-US");
      setByPath(drafts, bind, num === "" ? "" : String(num));
      return;
    }
    if (el.dataset.datepart) {
      const num = val === "" ? "" : parseInt(val, 10);
      setByPath(drafts, bind, num);
      if (el.dataset.datepart === "jm") {
        const dateObj = getByPath(drafts, el.dataset.prefix);
        if (dateObj && dateObj.jd) {
          const max = jalaliMonthLength(dateObj.jy || todayJalali().jy, dateObj.jm);
          if (dateObj.jd > max) dateObj.jd = max;
        }
        render();
      }
      return;
    }
    setByPath(drafts, bind, val);
    if (el.dataset.rerender) render();
  });

  const del = (msg, fn) => askConfirm(msg || CONFIRM_MSG, fn);

  root.addEventListener("click", (e) => {
    const el = e.target.closest("[data-action]");
    if (!el) return;
    const action = el.dataset.action;
    const id = el.dataset.id;
    const map = {
      "set-tab": () => navigate(el.dataset.tab, null),
      "add-income": addIncome, "add-expense": addExpense, "add-debt": addDebt,
      "add-credit": addCredit, "add-future": addFuture, "add-note": addNote,
      "delete-income": () => del(null, () => { state.incomes = state.incomes.filter((x) => x.id !== id); persist(); render(); }),
      "delete-expense": () => del(null, () => { state.expenses = state.expenses.filter((x) => x.id !== id); persist(); render(); }),
      "delete-debt": () => del(null, () => removeDebt(id)),
      "delete-credit": () => del(null, () => removeCredit(id)),
      "delete-future": () => del(null, () => { state.futureExpenses = state.futureExpenses.filter((x) => x.id !== id); persist(); render(); }),
      "delete-note": () => del(null, () => { state.notes = state.notes.filter((x) => x.id !== id); persist(); render(); }),
      "restore-debt": () => del("این بدهی به لیست بدهی‌ها برگردد و هزینه ثبت‌شده‌اش حذف شود؟", () => restoreDebt(id)),
      "restore-credit": () => del("این طلب به لیست طلب‌ها برگردد و درآمد ثبت‌شده‌اش حذف شود؟", () => restoreCredit(id)),
      "archive-view": () => { drafts.archiveView = el.dataset.view; render(); },
      "generate-report": generateReport,
      "export-backup": exportBackup,
      "trigger-import": () => { const inp = document.getElementById("import-file-input"); if (inp) inp.click(); },
      "add-ledger": addLedger,
      "add-ledger-entry": addLedgerEntry,
      "open-ledger": () => { drafts.ledgerEntry = { amount: "", for: "", date: todayJalali() }; formErrors.ledgerEntry = ""; navigate("ledger", id); },
      "close-ledger": goBack,
      "share-report": () => openShareMenu("گزارش مالی", reportText(), () => exportPdf("گزارش مالی", reportDoc())),
      "share-ledger": () => { const l = state.ledgers.find((x) => x.id === id); if (l) openShareMenu("دفتر موقت: " + l.name, ledgerText(l), () => exportPdf("دفتر " + l.name, ledgerDoc(l))); },
      "delete-ledger-entry": () => del(null, () => {
        const led = state.ledgers.find((l) => l.id === drafts.openLedger);
        if (led) { led.items = led.items.filter((x) => x.id !== id); persist(); render(); }
      }),
      "delete-ledger": () => del("این دفتر و همه هزینه‌های آن حذف شود؟", () => {
        state.ledgers = state.ledgers.filter((l) => l.id !== id);
        persist();
        if (navIdx > 0) history.back(); else { drafts.openLedger = null; render(); }
      }),
    };
    if (map[action]) map[action]();
  });

  root.addEventListener("change", (e) => {
    const el = e.target;
    if (el.id === "import-file-input" && el.files && el.files[0]) {
      importBackupFile(el.files[0]);
      el.value = "";
      return;
    }
    if (el.dataset.action === "toggle-debt") {
      el.checked = false;
      const id = el.dataset.id;
      askConfirm("آیا از پرداخت بدهی مطمئن هستید؟", () => settleDebt(id));
      return;
    }
    if (el.dataset.action === "toggle-credit") {
      el.checked = false;
      const id = el.dataset.id;
      askConfirm("آیا از وصول طلب مطمئن هستید؟", () => settleCredit(id));
      return;
    }
    if (el.dataset.categorySelect && el.value === "__new__") {
      const name = window.prompt("نام دسته‌بندی جدید را وارد کنید:");
      const trimmed = name && name.trim();
      if (trimmed) {
        if (!state.categories.includes(trimmed)) state.categories.push(trimmed);
        setByPath(drafts, el.dataset.bind, trimmed);
        persist();
      } else {
        setByPath(drafts, el.dataset.bind, state.categories[0] || "");
      }
      render();
    }
  });
}

attachEvents();
render();
