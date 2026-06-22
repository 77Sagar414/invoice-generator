// ── State ──
let items = [
  { desc: "Web design", qty: 1, price: 1500 },
  { desc: "SEO setup", qty: 3, price: 200 },
];

// ── Init ──
window.addEventListener("DOMContentLoaded", () => {
  const today = new Date();
  const due = new Date(today);
  due.setDate(due.getDate() + 30);
  document.getElementById("f-issue").value = fmt8601(today);
  document.getElementById("f-due").value = fmt8601(due);
  document.getElementById("f-invnum").value = "INV-001";
  document.getElementById("f-notes").value =
    "Payment due within 30 days. Bank transfer preferred.\nThank you for your business!";
  renderItems();
  update();
});

function fmt8601(d) {
  return d.toISOString().split("T")[0];
}

function fmtDate(str) {
  if (!str) return "—";
  const d = new Date(str + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function currency() {
  return document.getElementById("f-currency").value || "$";
}

function fmtMoney(n) {
  const sym = currency();
  if (sym === "¥") return sym + Math.round(n).toLocaleString();
  return sym + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// ── Item management ──
function addItem() {
  items.push({ desc: "", qty: 1, price: 0 });
  renderItems();
  update();
}

function removeItem(i) {
  if (items.length === 1) return;
  items.splice(i, 1);
  renderItems();
  update();
}

function renderItems() {
  const container = document.getElementById("items-container");
  container.innerHTML = `
    <div class="item-row-header">
      <span>Description</span><span>Qty</span><span>Price</span><span></span>
    </div>`;
  items.forEach((it, i) => {
    const row = document.createElement("div");
    row.className = "item-row";
    row.innerHTML = `
      <input type="text" placeholder="Service or product" value="${escHtml(it.desc)}"
        oninput="items[${i}].desc=this.value;update()">
      <input type="number" min="0" step="1" value="${it.qty}"
        oninput="items[${i}].qty=parseFloat(this.value)||0;update()">
      <input type="number" min="0" step="0.01" value="${it.price}"
        oninput="items[${i}].price=parseFloat(this.value)||0;update()">
      <button class="item-del" onclick="removeItem(${i})" title="Remove">×</button>`;
    container.appendChild(row);
  });
}

function escHtml(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// ── Live update ──
function update() {
  const g = id => document.getElementById(id);

  // From / company
  const company = g("f-company").value || "Your Company";
  g("p-company").textContent = company;
  g("p-myemail").textContent = g("f-myemail").value;
  g("p-address").textContent = g("f-address").value;

  // Invoice meta
  g("p-invnum").textContent = g("f-invnum").value || "INV-001";
  g("p-issue").textContent = fmtDate(g("f-issue").value);
  g("p-due").textContent = fmtDate(g("f-due").value);

  // Bill to
  g("p-client").textContent = g("f-client").value || "—";
  g("p-email").textContent = g("f-email").value;

  // Line items table
  const tbody = g("p-items");
  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty-msg">No items yet</td></tr>`;
  } else {
    tbody.innerHTML = items.map(it => {
      const total = (it.qty || 0) * (it.price || 0);
      return `<tr>
        <td>${escHtml(it.desc) || "<em style=\"color:#9ca3af\">Unnamed item</em>"}</td>
        <td>${it.qty}</td>
        <td>${fmtMoney(it.price)}</td>
        <td>${fmtMoney(total)}</td>
      </tr>`;
    }).join("");
  }

  // Totals
  const subtotal = items.reduce((s, it) => s + (it.qty||0)*(it.price||0), 0);
  const taxPct = parseFloat(g("f-tax").value) || 0;
  const tax = subtotal * taxPct / 100;
  const grand = subtotal + tax;

  g("p-subtotal").textContent = fmtMoney(subtotal);
  g("p-taxlabel").textContent = `Tax (${taxPct}%)`;
  g("p-tax").textContent = fmtMoney(tax);
  g("p-grand").textContent = fmtMoney(grand);

  // Notes
  g("p-notes").textContent = g("f-notes").value;

  // Payment
  updatePayment();
}

// ── PDF ──
function downloadPDF() {
  const el = document.getElementById("invoice-preview");
  const invNum = document.getElementById("f-invnum").value || "invoice";
  const opts = {
    margin: 10,
    filename: `${invNum}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
  };
  html2pdf().set(opts).from(el).save();
}

// ── Payment toggle ──
function togglePayFields() {
  const type = document.getElementById("f-paytype").value;
  document.querySelectorAll(".pay-fields").forEach(el => el.style.display = "none");
  if (type) {
    const el = document.getElementById("pay-" + type);
    if (el) el.style.display = "contents";
  }
}

// ── Payment preview ──
function updatePayment() {
  const type = document.getElementById("f-paytype").value;
  const panel = document.getElementById("p-payment");
  const body = document.getElementById("p-payment-body");

  if (!type) { panel.style.display = "none"; return; }

  const labels = {
    bank: "Bank Transfer",
    card: "Credit Card",
    paypal: "PayPal",
    paypay: "PayPay",
    applepay: "Apple Pay"
  };

  let html = `<span class="pay-badge">${labels[type]}</span>`;

  if (type === "bank") {
    const bank = document.getElementById("f-bankname").value;
    const acc = document.getElementById("f-accountnum").value;
    const branch = document.getElementById("f-branchcode").value;
    const name = document.getElementById("f-accountname").value;
    if (bank) html += `<div class="pay-row"><span>Bank</span><span>${bank}</span></div>`;
    if (acc) html += `<div class="pay-row"><span>Account No.</span><span>${acc}</span></div>`;
    if (branch) html += `<div class="pay-row"><span>Branch</span><span>${branch}</span></div>`;
    if (name) html += `<div class="pay-row"><span>Account Name</span><span>${name}</span></div>`;
  } else if (type === "card") {
    const cards = document.getElementById("f-cards").value;
    const link = document.getElementById("f-cardlink").value;
    if (cards) html += `<div class="pay-row"><span>Accepted</span><span>${cards}</span></div>`;
    if (link) html += `<div class="pay-row"><span>Pay at</span><span>${link}</span></div>`;
  } else if (type === "paypal") {
    const email = document.getElementById("f-paypalemail").value;
    if (email) html += `<div class="pay-row"><span>PayPal</span><span>${email}</span></div>`;
  } else if (type === "paypay") {
    const id = document.getElementById("f-paypayid").value;
    if (id) html += `<div class="pay-row"><span>PayPay ID</span><span>${id}</span></div>`;
  } else if (type === "applepay") {
    const link = document.getElementById("f-applepaylink").value;
    if (link) html += `<div class="pay-row"><span>Apple Pay</span><span>${link}</span></div>`;
  }

  body.innerHTML = html;
  panel.style.display = "block";
}


function clearAll() {
  if (!confirm("Clear all fields and start fresh?")) return;
  ["f-company","f-myemail","f-address","f-client","f-email"].forEach(id => {
    document.getElementById(id).value = "";
  });
  document.getElementById("f-invnum").value = "INV-001";
  document.getElementById("f-tax").value = "10";
  document.getElementById("f-notes").value = "";
  const today = new Date();
  const due = new Date(today); due.setDate(due.getDate()+30);
  document.getElementById("f-issue").value = fmt8601(today);
  document.getElementById("f-due").value = fmt8601(due);
  items = [{ desc: "", qty: 1, price: 0 }];
  renderItems();
  update();
}