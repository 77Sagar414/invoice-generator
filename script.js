// ── State ──
let items = [
  { desc: "Webデザイン", qty: 1, price: 150000 },
  { desc: "SEOコンサルティング", qty: 2, price: 30000 },
];

// ── Init ──
window.addEventListener("DOMContentLoaded", () => {
  const today = new Date();
  const due = new Date(today);
  due.setDate(due.getDate() + 30);
  document.getElementById("f-issue").value = fmt8601(today);
  document.getElementById("f-due").value = fmt8601(due);
  document.getElementById("f-invnum").value = "INV-001";
  document.getElementById("f-notes").value = "お支払いは30日以内にお願いいたします。\nご不明な点はお気軽にお問い合わせください。";
  renderItems();
  update();
});

function fmt8601(d) {
  return d.toISOString().split("T")[0];
}

function fmtDate(str) {
  if (!str) return "—";
  const d = new Date(str + "T00:00:00");
  return d.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });
}

function currency() {
  return document.getElementById("f-currency").value || "¥";
}

function fmtMoney(n) {
  const sym = currency();
  if (sym === "¥") return sym + Math.round(n).toLocaleString("ja-JP") + "円";
  return sym + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// ── Item management ──
function addItem() {
  items.push({ desc: "", qty: 1, price: 0 });
  renderItems();
  update();
}

function removeItem(i) {
  if (items.length === 1) {
    showDialog("warning", "削除できません", "明細は最低1行必要です。", [
      { label: "閉じる", style: "primary", action: closeDialog }
    ]);
    return;
  }
  items.splice(i, 1);
  renderItems();
  update();
}

function renderItems() {
  const container = document.getElementById("items-container");
  container.innerHTML = `
    <div class="item-row-header">
      <span>内容</span><span>数量</span><span>単価</span><span></span>
    </div>`;
  items.forEach((it, i) => {
    const row = document.createElement("div");
    row.className = "item-row";
    row.innerHTML = `
      <input type="text" placeholder="サービス・商品名" value="${escHtml(it.desc)}"
        oninput="items[${i}].desc=this.value;update()">
      <input type="number" min="0" step="1" value="${it.qty}"
        oninput="items[${i}].qty=parseFloat(this.value)||0;update()">
      <input type="number" min="0" step="1" value="${it.price}"
        oninput="items[${i}].price=parseFloat(this.value)||0;update()">
      <button class="item-del" onclick="removeItem(${i})" title="削除">×</button>`;
    container.appendChild(row);
  });
}

function escHtml(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// ── Live update ──
function update() {
  const g = id => document.getElementById(id);

  g("p-company").textContent = g("f-company").value || "会社名";
  g("p-myemail").textContent = g("f-myemail").value;
  g("p-address").textContent = g("f-address").value;
  g("p-invnum").textContent = g("f-invnum").value || "INV-001";
  g("p-issue").textContent = fmtDate(g("f-issue").value);
  g("p-due").textContent = fmtDate(g("f-due").value);
  g("p-client").textContent = g("f-client").value || "—";
  g("p-email").textContent = g("f-email").value;

  const tbody = g("p-items");
  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty-msg">明細がありません</td></tr>`;
  } else {
    tbody.innerHTML = items.map(it => {
      const total = (it.qty || 0) * (it.price || 0);
      return `<tr>
        <td>${escHtml(it.desc) || "<em style=\"color:#9198c0\">未入力</em>"}</td>
        <td>${it.qty}</td>
        <td>${fmtMoney(it.price)}</td>
        <td>${fmtMoney(total)}</td>
      </tr>`;
    }).join("");
  }

  const subtotal = items.reduce((s, it) => s + (it.qty||0)*(it.price||0), 0);
  const taxPct = parseFloat(g("f-tax").value) || 0;
  const tax = subtotal * taxPct / 100;
  const grand = subtotal + tax;

  g("p-subtotal").textContent = fmtMoney(subtotal);
  g("p-taxlabel").textContent = `消費税（${taxPct}%）`;
  g("p-tax").textContent = fmtMoney(tax);
  g("p-grand").textContent = fmtMoney(grand);
  g("p-notes").textContent = g("f-notes").value;

  updatePayment();
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

  const labels = { bank: "銀行振込", card: "クレジットカード", paypay: "PayPay" };
  let html = `<span class="pay-badge">${labels[type]}</span>`;

  if (type === "bank") {
    const bank = document.getElementById("f-bankname").value;
    const acc = document.getElementById("f-accountnum").value;
    const branch = document.getElementById("f-branchcode").value;
    const name = document.getElementById("f-accountname").value;
    if (bank) html += `<div class="pay-row"><span>銀行名</span><span>${bank}</span></div>`;
    if (acc) html += `<div class="pay-row"><span>口座番号</span><span>${acc}</span></div>`;
    if (branch) html += `<div class="pay-row"><span>支店コード</span><span>${branch}</span></div>`;
    if (name) html += `<div class="pay-row"><span>口座名義</span><span>${name}</span></div>`;
  } else if (type === "card") {
    const cards = document.getElementById("f-cards").value;
    const contact = document.getElementById("f-cardcontact").value;
    if (cards) html += `<div class="pay-row"><span>対応カード</span><span>${cards}</span></div>`;
    if (contact) html += `<div class="pay-row"><span>お問い合わせ</span><span>${contact}</span></div>`;
  } else if (type === "paypay") {
    const id = document.getElementById("f-paypayid").value;
    if (id) html += `<div class="pay-row"><span>PayPay ID</span><span>${id}</span></div>`;
  }

  body.innerHTML = html;
  panel.style.display = "block";
}

// ── Custom Dialog ──
function showDialog(type, title, msg, buttons) {
  const icons = {
    success: "✅",
    warning: "⚠️",
    confirm: "🗑️",
    download: "📄"
  };
  document.getElementById("dialog-icon").textContent = icons[type] || "ℹ️";
  document.getElementById("dialog-title").textContent = title;
  document.getElementById("dialog-msg").textContent = msg;
  const btns = document.getElementById("dialog-btns");
  btns.innerHTML = "";
  buttons.forEach(b => {
    const btn = document.createElement("button");
    btn.textContent = b.label;
    btn.className = b.style === "primary" ? "dialog-btn-primary" : "dialog-btn-ghost";
    btn.onclick = b.action;
    btns.appendChild(btn);
  });
  document.getElementById("dialog-overlay").style.display = "flex";
}

function closeDialog() {
  document.getElementById("dialog-overlay").style.display = "none";
}

// ── PDF Download ──
function handleDownload() {
  showDialog("download", "PDFを作成中...", "請求書のPDFを生成しています。しばらくお待ちください。", []);
  setTimeout(() => {
    const el = document.getElementById("invoice-preview");
    const invNum = document.getElementById("f-invnum").value || "invoice";
    const opts = {
      margin: 10,
      filename: `${invNum}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
    };
    html2pdf().set(opts).from(el).save().then(() => {
      closeDialog();
      setTimeout(() => {
        showDialog("success", "ダウンロード完了！", `「${invNum}.pdf」として保存されました。`, [
          { label: "閉じる", style: "primary", action: closeDialog }
        ]);
      }, 300);
    });
  }, 500);
}

// ── Clear All ──
function confirmClear() {
  showDialog("confirm", "入力内容をクリア", "すべての入力内容がリセットされます。よろしいですか？", [
    { label: "キャンセル", style: "ghost", action: closeDialog },
    { label: "クリアする", style: "primary", action: clearAll }
  ]);
}

function clearAll() {
  closeDialog();
  ["f-company","f-myemail","f-address","f-client","f-email"].forEach(id => {
    document.getElementById(id).value = "";
  });
  document.getElementById("f-invnum").value = "INV-001";
  document.getElementById("f-tax").value = "10";
  document.getElementById("f-notes").value = "";
  document.getElementById("f-paytype").value = "";
  document.querySelectorAll(".pay-fields").forEach(el => el.style.display = "none");
  const today = new Date();
  const due = new Date(today); due.setDate(due.getDate() + 30);
  document.getElementById("f-issue").value = fmt8601(today);
  document.getElementById("f-due").value = fmt8601(due);
  items = [{ desc: "", qty: 1, price: 0 }];
  renderItems();
  update();
  setTimeout(() => {
    showDialog("success", "クリア完了", "すべての入力内容をリセットしました。", [
      { label: "閉じる", style: "primary", action: closeDialog }
    ]);
  }, 200);
}
