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

// ── Clear ──
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