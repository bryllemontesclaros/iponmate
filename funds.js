const currency = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

const els = {
  form: document.getElementById("rangeForm"),
  principal: document.getElementById("rangePrincipal"),
  years: document.getElementById("rangeYears"),
  min: document.getElementById("rangeMin"),
  max: document.getElementById("rangeMax"),
  fees: document.getElementById("rangeFees"),
  reset: document.getElementById("rangeReset"),
  results: document.getElementById("rangeResults"),
};

function toNumber(input) {
  const cleaned = String(input ?? "").replace(/[,\s]/g, "").trim();
  if (!cleaned) return NaN;
  return Number(cleaned);
}

function fmtMoney(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return currency.format(n);
}

function clampOrder(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return [a, b];
  return a <= b ? [a, b] : [b, a];
}

function estimateRange({ principal, years, minReturn, maxReturn, annualFees }) {
  const fees = Number.isFinite(annualFees) ? annualFees : 0;
  const [minR, maxR] = clampOrder(minReturn - fees, maxReturn - fees);

  const minFactor = Math.pow(1 + minR / 100, years);
  const maxFactor = Math.pow(1 + maxR / 100, years);
  const endingMin = principal * minFactor;
  const endingMax = principal * maxFactor;

  return {
    minR,
    maxR,
    endingMin,
    endingMax,
    gainMin: endingMin - principal,
    gainMax: endingMax - principal,
  };
}

function renderMessage(message) {
  els.results.innerHTML = `<span class="muted">${message}</span>`;
}

function renderRange(r) {
  els.results.innerHTML = `
    <div class="results__grid">
      <div class="kpi">
        <div class="kpi__label">Net return range (p.a.)</div>
        <div class="kpi__value">${r.minR.toFixed(2)}% → ${r.maxR.toFixed(2)}%</div>
        <div class="kpi__sub">After fees (if provided)</div>
      </div>
      <div class="kpi">
        <div class="kpi__label">Ending value range</div>
        <div class="kpi__value">${fmtMoney(r.endingMin)} → ${fmtMoney(r.endingMax)}</div>
        <div class="kpi__sub">Compounded annually</div>
      </div>
      <div class="kpi">
        <div class="kpi__label">Total gain range</div>
        <div class="kpi__value">${fmtMoney(r.gainMin)} → ${fmtMoney(r.gainMax)}</div>
        <div class="kpi__sub">Can be negative in worst cases</div>
      </div>
      <div class="kpi">
        <div class="kpi__label">Reminder</div>
        <div class="kpi__value">Not guaranteed</div>
        <div class="kpi__sub">Use official fund fact sheets</div>
      </div>
    </div>
  `;
}

els.form?.addEventListener("submit", (e) => {
  e.preventDefault();

  const principal = toNumber(els.principal.value);
  const years = toNumber(els.years.value);
  const minReturn = toNumber(els.min.value);
  const maxReturn = toNumber(els.max.value);
  const annualFees = toNumber(els.fees.value);

  if (!Number.isFinite(principal) || principal <= 0) return renderMessage("Enter a valid starting amount.");
  if (!Number.isFinite(years) || years <= 0) return renderMessage("Enter a valid time (years).");
  if (!Number.isFinite(minReturn) || !Number.isFinite(maxReturn)) return renderMessage("Enter min and max returns.");

  const res = estimateRange({ principal, years, minReturn, maxReturn, annualFees });
  renderRange(res);
});

els.reset?.addEventListener("click", () => {
  els.principal.value = "";
  els.years.value = "";
  els.min.value = "";
  els.max.value = "";
  els.fees.value = "";
  renderMessage("Fill the form and click Estimate range.");
});

renderMessage("Fill the form and click Estimate range.");

