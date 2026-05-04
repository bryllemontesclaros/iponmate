/* global */

(() => {
  const currencyPhp = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
  const currencyUsd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function toNumber(input) {
    const cleaned = String(input ?? "").replace(/[,\s]/g, "").replace(/[^0-9.+-]/g, "").trim();
    if (!cleaned) return NaN;
    return Number(cleaned);
  }

  function openDialog(dialogEl) {
    if (!dialogEl) return;
    if (typeof dialogEl.showModal === "function") dialogEl.showModal();
    else dialogEl.setAttribute("open", "open");
  }

  function closeDialog(dialogEl) {
    if (!dialogEl) return;
    if (typeof dialogEl.close === "function") dialogEl.close();
    else dialogEl.removeAttribute("open");
  }

  function ensureDialog() {
    let dialogEl = document.getElementById("calculatorDialog");
    if (dialogEl) return dialogEl;

    dialogEl = document.createElement("dialog");
    dialogEl.id = "calculatorDialog";
    dialogEl.className = "dialog";

    dialogEl.innerHTML = `
      <div class="dialog__panel" id="calculatorPanel">
        <div class="dialog__head">
          <div>
            <h3>Calculator</h3>
            <p class="muted tiny" id="calcLabel">Choose a mode, then enter values.</p>
          </div>
          <button id="closeCalcBtn" class="iconBtn" aria-label="Close" type="button">✕</button>
        </div>

        <div class="segmented" role="group" aria-label="Calculator mode">
          <button class="segmented__btn" type="button" aria-pressed="true" data-mode="interest">Interest / Yield</button>
          <button class="segmented__btn" type="button" aria-pressed="false" data-mode="price">Price (Buy/Sell)</button>
        </div>

        <div class="dialog__body">
          <form id="interestForm" class="grid" autocomplete="off" aria-label="Interest calculator">
            <label class="field">
              <span>Amount (PHP)</span>
              <input id="principalInput" class="input" type="text" inputmode="decimal" placeholder="e.g. 10000" />
            </label>

            <label class="field">
              <span>Annual rate (%)</span>
              <input id="rateInput" class="input" type="text" inputmode="decimal" placeholder="e.g. 2.5" />
            </label>

            <label class="field">
              <span>Time</span>
              <div class="field__row">
                <input id="timeValueInput" class="input" type="text" inputmode="decimal" placeholder="e.g. 12" />
                <select id="timeUnitSelect" class="select" aria-label="Time unit">
                  <option value="months">Months</option>
                  <option value="years">Years</option>
                  <option value="days">Days</option>
                </select>
              </div>
            </label>

            <label class="field">
              <span>Compounding</span>
              <select id="compoundSelect" class="select">
                <option value="monthly">Monthly (typical)</option>
                <option value="daily">Daily</option>
                <option value="quarterly">Quarterly</option>
                <option value="annually">Annually</option>
                <option value="simple">Simple interest (no compounding)</option>
              </select>
            </label>

            <label class="field field--checkbox">
              <input id="taxCheckbox" type="checkbox" checked />
              <span>Apply 20% withholding tax on interest (typical PH bank deposits)</span>
            </label>

            <div class="actions">
              <button class="btn btn--primary" type="submit">Calculate</button>
              <button class="btn" type="button" id="interestReset">Reset</button>
            </div>
          </form>

          <form id="priceForm" class="grid isHidden" autocomplete="off" aria-label="Price calculator">
            <label class="field">
              <span>Quantity</span>
              <input id="qtyInput" class="input" type="text" inputmode="decimal" placeholder="e.g. 1" />
            </label>

            <label class="field">
              <span>Currency</span>
              <select id="priceCurrencySelect" class="select">
                <option value="USD">USD</option>
                <option value="PHP">PHP</option>
              </select>
            </label>

            <label class="field">
              <span>Buy price (per unit)</span>
              <input id="buyInput" class="input" type="text" inputmode="decimal" placeholder="e.g. 4710.80" />
            </label>

            <label class="field">
              <span>Sell price (per unit)</span>
              <input id="sellInput" class="input" type="text" inputmode="decimal" placeholder="e.g. 4708.80" />
            </label>

            <label class="field">
              <span>Fees / spread (optional)</span>
              <input id="feesInput" class="input" type="text" inputmode="decimal" placeholder="e.g. 10" />
            </label>

            <div class="actions">
              <button class="btn btn--primary" type="submit">Calculate</button>
              <button class="btn" type="button" id="priceReset">Reset</button>
            </div>
          </form>

          <div class="results" id="calcResults" aria-live="polite"></div>

          <p class="muted tiny" id="calcDisclaimer">
            Disclaimer: estimator only (not financial advice). Real outcomes can differ.
          </p>
        </div>
      </div>
    `;

    document.body.appendChild(dialogEl);
    return dialogEl;
  }

  function selectMode(mode, { focus = true } = {}) {
    const interestForm = document.getElementById("interestForm");
    const priceForm = document.getElementById("priceForm");
    const buttons = Array.from(document.querySelectorAll(".segmented__btn"));

    for (const b of buttons) {
      const isActive = b.getAttribute("data-mode") === mode;
      b.setAttribute("aria-pressed", isActive ? "true" : "false");
      b.classList.toggle("segmented__btn--active", isActive);
    }

    if (mode === "price") {
      interestForm?.classList.add("isHidden");
      priceForm?.classList.remove("isHidden");
      if (focus) document.getElementById("qtyInput")?.focus();
    } else {
      priceForm?.classList.add("isHidden");
      interestForm?.classList.remove("isHidden");
      if (focus) document.getElementById("principalInput")?.focus();
    }

    try {
      if (location.hash !== "#calculator") history.replaceState(null, "", `${location.pathname}${location.search}#calculator`);
    } catch {
      // ignore
    }
  }

  function renderMessage(message) {
    const el = document.getElementById("calcResults");
    if (el) el.innerHTML = `<span class="muted">${escapeHtml(message)}</span>`;
  }

  function fmtMoney(value, currency) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "—";
    return currency === "USD" ? currencyUsd.format(n) : currencyPhp.format(n);
  }

  function calculateInterest({ principal, ratePercent, timeValue, timeUnit, compounding, applyTax }) {
    const P = principal;
    const r = ratePercent / 100;

    let tYears;
    if (timeUnit === "years") tYears = timeValue;
    else if (timeUnit === "months") tYears = timeValue / 12;
    else tYears = timeValue / 365;

    let nPerYear = 12;
    if (compounding === "daily") nPerYear = 365;
    if (compounding === "quarterly") nPerYear = 4;
    if (compounding === "annually") nPerYear = 1;

    let ending;
    if (compounding === "simple") ending = P * (1 + r * tYears);
    else ending = P * Math.pow(1 + r / nPerYear, nPerYear * tYears);

    const grossInterest = ending - P;
    const taxRate = applyTax ? 0.2 : 0;
    const tax = grossInterest * taxRate;
    const netInterest = grossInterest - tax;
    const endingNet = P + netInterest;

    const eayNet = tYears > 0 && P > 0 ? Math.pow(endingNet / P, 1 / tYears) - 1 : 0;

    return { tYears, grossInterest, tax, netInterest, endingNet, eayNet };
  }

  function renderInterestResults(r) {
    const tLabel = `${r.tYears.toFixed(4)} years`;
    const eay = `${(r.eayNet * 100).toFixed(3)}%`;

    const el = document.getElementById("calcResults");
    if (!el) return;
    el.innerHTML = `
      <div class="results__grid">
        <div class="kpi">
          <div class="kpi__label">Gross gain</div>
          <div class="kpi__value">${fmtMoney(r.grossInterest, "PHP")}</div>
          <div class="kpi__sub">Before tax</div>
        </div>
        <div class="kpi">
          <div class="kpi__label">Withholding tax</div>
          <div class="kpi__value">${fmtMoney(r.tax, "PHP")}</div>
          <div class="kpi__sub">Assumed 20% if enabled</div>
        </div>
        <div class="kpi">
          <div class="kpi__label">Net gain</div>
          <div class="kpi__value">${fmtMoney(r.netInterest, "PHP")}</div>
          <div class="kpi__sub">After tax</div>
        </div>
        <div class="kpi">
          <div class="kpi__label">Ending value (net)</div>
          <div class="kpi__value">${fmtMoney(r.endingNet, "PHP")}</div>
          <div class="kpi__sub">Over ${escapeHtml(tLabel)} · Net EAY: ${escapeHtml(eay)}</div>
        </div>
      </div>
    `;
  }

  function calculatePrice({ qty, buy, sell, fees }) {
    const cost = qty * buy;
    const proceeds = qty * sell;
    const profit = proceeds - cost - fees;
    const roi = cost > 0 ? profit / cost : 0;
    return { cost, proceeds, profit, roi };
  }

  function renderPriceResults(r, currency) {
    const el = document.getElementById("calcResults");
    if (!el) return;
    el.innerHTML = `
      <div class="results__grid">
        <div class="kpi">
          <div class="kpi__label">Cost</div>
          <div class="kpi__value">${fmtMoney(r.cost, currency)}</div>
          <div class="kpi__sub">Buy price × quantity</div>
        </div>
        <div class="kpi">
          <div class="kpi__label">Proceeds</div>
          <div class="kpi__value">${fmtMoney(r.proceeds, currency)}</div>
          <div class="kpi__sub">Sell price × quantity</div>
        </div>
        <div class="kpi">
          <div class="kpi__label">Profit / Loss</div>
          <div class="kpi__value">${fmtMoney(r.profit, currency)}</div>
          <div class="kpi__sub">After fees/spread (if provided)</div>
        </div>
        <div class="kpi">
          <div class="kpi__label">ROI</div>
          <div class="kpi__value">${(r.roi * 100).toFixed(2)}%</div>
          <div class="kpi__sub">Not guaranteed</div>
        </div>
      </div>
    `;
  }

  function setLabel(text) {
    const el = document.getElementById("calcLabel");
    if (el) el.textContent = text || "Choose a mode, then enter values.";
  }

  function openCalculator(opts = {}) {
    const dialogEl = ensureDialog();
    openDialog(dialogEl);

    const mode = opts.mode === "price" ? "price" : "interest";
    selectMode(mode, { focus: false });

    const disclaimer = document.getElementById("calcDisclaimer");
    if (disclaimer) {
      disclaimer.textContent =
        opts.disclaimer ||
        "Disclaimer: estimator only (not financial advice). Real outcomes can differ.";
    }

    setLabel(opts.label || "");

    const shouldAutoFocus = !window.matchMedia?.("(pointer: coarse)")?.matches;

    if (mode === "price") {
      const qtyInput = document.getElementById("qtyInput");
      const buyInput = document.getElementById("buyInput");
      const sellInput = document.getElementById("sellInput");
      const feesInput = document.getElementById("feesInput");
      const currencySelect = document.getElementById("priceCurrencySelect");

      if (currencySelect && (opts.currency === "PHP" || opts.currency === "USD")) currencySelect.value = opts.currency;
      if (qtyInput && opts.qty != null) qtyInput.value = String(opts.qty);
      if (buyInput && opts.buy != null) buyInput.value = String(opts.buy);
      if (sellInput && opts.sell != null) sellInput.value = String(opts.sell);
      if (feesInput && opts.fees != null) feesInput.value = String(opts.fees);

      if (shouldAutoFocus) (qtyInput || buyInput || sellInput)?.focus?.();
    } else {
      const principalInput = document.getElementById("principalInput");
      const rateInput = document.getElementById("rateInput");
      const timeValueInput = document.getElementById("timeValueInput");
      const timeUnitSelect = document.getElementById("timeUnitSelect");
      const compoundSelect = document.getElementById("compoundSelect");
      const taxCheckbox = document.getElementById("taxCheckbox");

      if (rateInput && opts.ratePercent != null) rateInput.value = String(opts.ratePercent);
      if (timeValueInput && opts.timeValue != null) timeValueInput.value = String(opts.timeValue);
      if (timeUnitSelect && opts.timeUnit) timeUnitSelect.value = opts.timeUnit;
      if (compoundSelect && opts.compounding) compoundSelect.value = opts.compounding;
      if (taxCheckbox && typeof opts.applyTax === "boolean") taxCheckbox.checked = opts.applyTax;
      if (principalInput && opts.principal != null) principalInput.value = String(opts.principal);

      if (shouldAutoFocus) (principalInput || timeValueInput || rateInput)?.focus?.();
    }

    renderMessage("Fill the form and click Calculate.");
  }

  function bindEvents() {
    const dialogEl = ensureDialog();

    document.getElementById("closeCalcBtn")?.addEventListener("click", () => closeDialog(dialogEl));
    dialogEl.addEventListener("click", (e) => {
      if (e.target === dialogEl) closeDialog(dialogEl);
    });
    dialogEl.addEventListener("close", () => {
      try {
        if (location.hash === "#calculator") history.replaceState(null, "", `${location.pathname}${location.search}`);
      } catch {
        // ignore
      }
    });

    document.querySelectorAll(".segmented__btn").forEach((b) => {
      b.addEventListener("click", () => selectMode(b.getAttribute("data-mode") || "interest"));
    });

    document.getElementById("interestForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const principal = toNumber(document.getElementById("principalInput")?.value);
      const ratePercent = toNumber(document.getElementById("rateInput")?.value);
      const timeValue = toNumber(document.getElementById("timeValueInput")?.value);
      const timeUnit = document.getElementById("timeUnitSelect")?.value || "months";
      const compounding = document.getElementById("compoundSelect")?.value || "monthly";
      const applyTax = Boolean(document.getElementById("taxCheckbox")?.checked);

      if (!Number.isFinite(principal) || principal <= 0) return renderMessage("Enter a valid amount.");
      if (!Number.isFinite(ratePercent) || ratePercent < 0) return renderMessage("Enter a valid annual rate (%).");
      if (!Number.isFinite(timeValue) || timeValue <= 0) return renderMessage("Enter a valid time value.");

      const res = calculateInterest({ principal, ratePercent, timeValue, timeUnit, compounding, applyTax });
      renderInterestResults(res);
    });

    document.getElementById("interestReset")?.addEventListener("click", () => {
      const principalInput = document.getElementById("principalInput");
      const rateInput = document.getElementById("rateInput");
      const timeValueInput = document.getElementById("timeValueInput");
      const timeUnitSelect = document.getElementById("timeUnitSelect");
      const compoundSelect = document.getElementById("compoundSelect");
      const taxCheckbox = document.getElementById("taxCheckbox");

      if (principalInput) principalInput.value = "";
      if (rateInput) rateInput.value = "";
      if (timeValueInput) timeValueInput.value = "";
      if (timeUnitSelect) timeUnitSelect.value = "months";
      if (compoundSelect) compoundSelect.value = "monthly";
      if (taxCheckbox) taxCheckbox.checked = true;
      renderMessage("Fill the form and click Calculate.");
    });

    document.getElementById("priceForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const qty = toNumber(document.getElementById("qtyInput")?.value);
      const buy = toNumber(document.getElementById("buyInput")?.value);
      const sell = toNumber(document.getElementById("sellInput")?.value);
      const fees = toNumber(document.getElementById("feesInput")?.value);
      const currency = document.getElementById("priceCurrencySelect")?.value || "USD";

      if (!Number.isFinite(qty) || qty <= 0) return renderMessage("Enter a valid quantity.");
      if (!Number.isFinite(buy) || buy <= 0) return renderMessage("Enter a valid buy price.");
      if (!Number.isFinite(sell) || sell <= 0) return renderMessage("Enter a valid sell price.");

      const res = calculatePrice({ qty, buy, sell, fees: Number.isFinite(fees) ? fees : 0 });
      renderPriceResults(res, currency);
    });

    document.getElementById("priceReset")?.addEventListener("click", () => {
      const qtyInput = document.getElementById("qtyInput");
      const buyInput = document.getElementById("buyInput");
      const sellInput = document.getElementById("sellInput");
      const feesInput = document.getElementById("feesInput");
      const currencySelect = document.getElementById("priceCurrencySelect");

      if (qtyInput) qtyInput.value = "";
      if (buyInput) buyInput.value = "";
      if (sellInput) sellInput.value = "";
      if (feesInput) feesInput.value = "";
      if (currencySelect) currencySelect.value = "USD";
      renderMessage("Fill the form and click Calculate.");
    });

    document.addEventListener("click", (e) => {
      const trigger = e.target?.closest?.("[data-open-calc]");
      if (!trigger) return;

      const mode = trigger.getAttribute("data-open-calc");
      const label = trigger.getAttribute("data-label") || "";
      const disclaimer = trigger.getAttribute("data-disclaimer") || "";

      if (mode === "price") {
        openCalculator({
          mode: "price",
          label,
          disclaimer,
          currency: trigger.getAttribute("data-currency") || "USD",
          qty: trigger.getAttribute("data-qty"),
          buy: trigger.getAttribute("data-buy"),
          sell: trigger.getAttribute("data-sell"),
          fees: trigger.getAttribute("data-fees"),
        });
      } else {
        const applyTaxAttr = trigger.getAttribute("data-tax");
        openCalculator({
          mode: "interest",
          label,
          disclaimer,
          ratePercent: trigger.getAttribute("data-rate"),
          timeValue: trigger.getAttribute("data-time"),
          timeUnit: trigger.getAttribute("data-unit") || "months",
          compounding: trigger.getAttribute("data-comp") || "monthly",
          applyTax: applyTaxAttr == null ? true : applyTaxAttr === "1" || applyTaxAttr === "true",
        });
      }
    });

    if (location.hash === "#calculator") openCalculator({ mode: "interest" });
    window.addEventListener("hashchange", () => {
      if (location.hash === "#calculator") openCalculator({ mode: "interest" });
    });
  }

  // Public API for the deposits page.
  window.IponMateCalc = {
    open: openCalculator,
  };

  bindEvents();
})();
