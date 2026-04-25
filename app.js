/* global DEFAULT_RATES, DATA_AS_OF */

const currency = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

const els = {
  ratesTbody: document.getElementById("ratesTbody"),
  ratesMeta: document.getElementById("ratesMeta"),
  asOfBadge: document.getElementById("asOfBadge"),
  searchInput: document.getElementById("searchInput"),
  sortSelect: document.getElementById("sortSelect"),
  typeFilterSelect: document.getElementById("typeFilterSelect"),
};

function toNumber(input) {
  const cleaned = String(input ?? "").replace(/[,\s]/g, "").trim();
  if (!cleaned) return NaN;
  return Number(cleaned);
}

function normalizeRateRecord(record) {
  const now = new Date();
  const id =
    record.id ||
    `${String(record.bank || "bank").toLowerCase().replace(/\s+/g, "_")}_${String(record.product || "product")
      .toLowerCase()
      .replace(/\s+/g, "_")}_${Math.random().toString(16).slice(2)}`;

  const ratePa = typeof record.ratePa === "number" ? record.ratePa : toNumber(record.ratePa);
  const minDepositPhp =
    typeof record.minDepositPhp === "number" ? record.minDepositPhp : toNumber(record.minDepositPhp ?? 0);

  const updated =
    typeof record.updated === "string" && record.updated.trim()
      ? record.updated.trim()
      : now.toISOString().slice(0, 10);

  const categoryRaw = String(record.category || record.type || "savings").trim().toLowerCase();
  const category = categoryRaw === "time_deposit" || categoryRaw === "td" ? "time_deposit" : "savings";

  return {
    id,
    category,
    bank: String(record.bank || "").trim(),
    product: String(record.product || "").trim(),
    ratePa,
    minDepositPhp: Number.isFinite(minDepositPhp) ? minDepositPhp : 0,
    updated,
    sourceUrl: String(record.sourceUrl || "").trim(),
    notes: String(record.notes || "").trim(),
    _user: Boolean(record._user),
  };
}

function allRates() {
  const builtIn = Array.isArray(DEFAULT_RATES) ? DEFAULT_RATES : [];
  const normalizedBuiltIn = builtIn.map((r) => normalizeRateRecord({ ...r, _user: false }));

  // Deduplicate by id (later entries override earlier ones).
  const map = new Map();
  for (const r of normalizedBuiltIn) map.set(r.id, r);
  return Array.from(map.values());
}

function compareStrings(a, b) {
  return String(a || "").localeCompare(String(b || ""), undefined, { sensitivity: "base" });
}

function parseIsoDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d : null;
}

function sortRates(rates, mode) {
  const items = [...rates];
  const by = {
    bank_asc: (a, b) => compareStrings(a.bank, b.bank) || compareStrings(a.product, b.product),
    bank_desc: (a, b) => compareStrings(b.bank, a.bank) || compareStrings(b.product, a.product),
    rate_desc: (a, b) => (b.ratePa ?? -Infinity) - (a.ratePa ?? -Infinity),
    rate_asc: (a, b) => (a.ratePa ?? Infinity) - (b.ratePa ?? Infinity),
    updated_desc: (a, b) => (parseIsoDate(b.updated)?.getTime() ?? 0) - (parseIsoDate(a.updated)?.getTime() ?? 0),
    updated_asc: (a, b) => (parseIsoDate(a.updated)?.getTime() ?? 0) - (parseIsoDate(b.updated)?.getTime() ?? 0),
  }[mode];
  return by ? items.sort(by) : items;
}

function filterRates(rates, query) {
  const q = String(query || "").trim().toLowerCase();
  return rates.filter((r) => {
    const typeFilter = els.typeFilterSelect?.value || "all";
    const typeOk = typeFilter === "all" ? true : r.category === typeFilter;
    if (!typeOk) return false;
    if (!q) return true;
    const hay = `${r.bank} ${r.product} ${r.notes}`.toLowerCase();
    return hay.includes(q);
  });
}

function fmtRatePa(ratePa) {
  const r = Number(ratePa);
  if (!Number.isFinite(r)) return "—";
  return `${r.toFixed(r >= 1 ? 2 : 3)}%`;
}

function fmtMoney(amount) {
  const v = Number(amount);
  if (!Number.isFinite(v)) return "—";
  return currency.format(v);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderRatesTable(rates) {
  els.ratesTbody.innerHTML = rates
    .map((r) => {
      const typeBadge =
        r.category === "time_deposit"
          ? `<span class="badge badge--td">Time deposit</span>`
          : `<span class="badge badge--sav">Savings</span>`;
      const sourceCell = r.sourceUrl
        ? `<a class="link" href="${escapeHtml(r.sourceUrl)}" target="_blank" rel="noreferrer">link</a>`
        : `<span class="muted tiny">—</span>`;

      const notes = r.notes ? `<div class="muted tiny">${escapeHtml(r.notes)}</div>` : "";

      const defaultComp = r.category === "time_deposit" ? "simple" : "monthly";
      const pickBtn = `
        <button
          class="btn rowBtn"
          type="button"
          data-open-calc="interest"
          data-rate="${escapeHtml(String(r.ratePa ?? ""))}"
          data-comp="${escapeHtml(defaultComp)}"
          data-tax="1"
          data-label="${escapeHtml(`${r.bank} — ${r.product}`)}"
          data-disclaimer="Disclaimer: estimator only (not financial advice). Actual credited interest depends on bank rules, tiers/promos, fees, rounding, and posting schedules."
        >Calculate</button>
      `;

      return `
        <tr data-rate-row="${escapeHtml(r.id)}">
          <td data-label="Bank">${escapeHtml(r.bank)}</td>
          <td data-label="Product">${escapeHtml(r.product)}${notes}</td>
          <td data-label="Type">${typeBadge}</td>
          <td data-label="Rate (p.a.)" class="num"><strong>${escapeHtml(fmtRatePa(r.ratePa))}</strong></td>
          <td data-label="" class="action">${pickBtn}</td>
          <td data-label="Min deposit" class="num">${escapeHtml(fmtMoney(r.minDepositPhp))}</td>
          <td data-label="Updated">${escapeHtml(r.updated || "—")}</td>
          <td data-label="Source">${sourceCell}</td>
        </tr>
      `;
    })
    .join("");
}

function refresh() {
  const all = allRates();
  const filtered = filterRates(all, els.searchInput.value);
  const sorted = sortRates(filtered, els.sortSelect.value);

  renderRatesTable(sorted);
  const asOf = typeof DATA_AS_OF === "string" && DATA_AS_OF.trim() ? DATA_AS_OF.trim() : "—";
  els.ratesMeta.textContent = `Showing ${sorted.length} of ${all.length} rate(s). As of ${asOf} (from linked public sources; may change).`;
  if (els.asOfBadge) {
    els.asOfBadge.textContent = `As of ${asOf}`;
    els.asOfBadge.title = "Rates change often. Always verify in the official app/site.";
  }
}

// Events
els.searchInput.addEventListener("input", refresh);
els.sortSelect.addEventListener("change", refresh);
els.typeFilterSelect?.addEventListener("change", refresh);

// Init
refresh();
