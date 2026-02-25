// ===== Test Engine (Worldpanel – English Version) =====

// --- Config
const CFG = window.TEST_APP_CONFIG || {};
const TOTAL_TIME_SECONDS = Number(CFG.TOTAL_TIME_SECONDS || 45 * 60);
const SCRIPT_URL = String(CFG.SCRIPT_URL || "");

// --- Refresh Lock: If test is active and the page reloads, auto-submit immediately.
(function autoSubmitOnReload() {
  const active = localStorage.getItem("TEST_ACTIVE") === "1";
  const pending = localStorage.getItem("PENDING_FORCED_SUBMIT") === "1";

  if (active && pending) {
    localStorage.removeItem("PENDING_FORCED_SUBMIT");
    submitNow(true); // forced submit due to refresh
  }
})();

// --- State
let timeLeft = TOTAL_TIME_SECONDS;
let tabViolations = 0;
let currentIndex = 0;
const responses = {};
let email = "";

const questionBank = Array.isArray(window.QUESTION_BANK)
  ? window.QUESTION_BANK
  : [];

// --- Helpers
const $ = (id) => document.getElementById(id);

function fmtTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

function showScreen(idToShow) {
  ["screen-start", "screen-question", "screen-end"].forEach((id) => {
    $(id).classList.toggle("hidden", id !== idToShow);
  });
}

function updateHUD() {
  const total = questionBank.length;
  const humanIndex = Math.min(currentIndex + 1, total);
  const pct = Math.round(((humanIndex - 1) / total) * 100);

  $("qIndex").textContent = humanIndex;
  $("qTotal").textContent = total;
  $("qPercent").textContent = `${pct}%`;
  $("progressBar").style.width = `${pct}%`;
  $("violations").textContent = tabViolations;
}

function renderQuestion(i) {
  const q = questionBank[i];

  $("qText").innerHTML = `
    <div style="margin-bottom:6px; opacity:.7;">Question ${i + 1}</div>
    <div>${q.text.replace(/\n/g, "<br>")}</div>
  `;

  $("qExtra").innerHTML = q.extraHTML || "";

  const wrap = $("qOptions");
  wrap.innerHTML = "";

  (q.options || []).forEach((opt) => {
    const id = `opt_${q.key}_${opt.value}`;
    const lbl = document.createElement("label");
    lbl.className = "option";
    lbl.innerHTML = `
      <input type="radio" id="${id}" name="${q.key}" value="${opt.value}"
        ${responses[q.key] === opt.value ? "checked" : ""}>
      ${opt.label}
    `;
    wrap.appendChild(lbl);
  });

  $("btnNext").textContent =
    i === questionBank.length - 1 ? "Submit Test" : "Next";

  updateHUD();
}

// --- Timer
let timerHandle = null;

function startTimer() {
  $("timer").textContent = fmtTime(timeLeft);

  timerHandle = setInterval(() => {
    $("timer").textContent = fmtTime(timeLeft);

    if (timeLeft <= 0) {
      clearInterval(timerHandle);
      autoSubmit();
    }

    timeLeft--;
  }, 1000);
}

// --- Anti-cheat
["copy", "paste", "cut", "contextmenu", "selectstart"].forEach((evt) =>
  document.addEventListener(evt, (e) => e.preventDefault())
);

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    tabViolations++;
    alert(
      "⚠️ Warning: Switching away from the test tab has been recorded. Violations: " +
        tabViolations
    );
    $("violations").textContent = tabViolations;
  }
});

history.pushState(null, "", location.href);
window.onpopstate = () => history.go(1);

// Print / Screenshot guard
window.addEventListener("beforeprint", (e) => {
  $("print-blocker").classList.remove("hidden");
  alert("Printing is disabled.");
  e.preventDefault?.();
});

document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
    e.preventDefault();
    alert("Printing is disabled.");
  }
  if (e.key === "PrintScreen") {
    e.preventDefault?.();
    navigator.clipboard?.writeText &&
      navigator.clipboard.writeText("Screenshots are disabled.");
    alert("Screenshot attempts are not allowed.");
  }
});

// --- Refresh Warning (must run BEFORE refresh detection)
window.addEventListener("beforeunload", (e) => {
  if (localStorage.getItem("TEST_ACTIVE") === "1") {
    localStorage.setItem("PENDING_FORCED_SUBMIT", "1");
    e.preventDefault();
    e.returnValue =
      "If you refresh this page, the test will be automatically submitted.";
    return e.returnValue;
  }
});

// --- Start Test
$("btnStart").addEventListener("click", () => {
  const val = $("email").value.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(val)) {
    $("startMsg").innerHTML = `Please enter a valid email address.`;
    return;
  }

  if (!SCRIPT_URL || !/^https?:\/\/script\.google\.com\//.test(SCRIPT_URL)) {
    $("startMsg").innerHTML = `SCRIPT_URL is not configured correctly.`;
    return;
  }

  email = val;

  // Lock the session
  localStorage.setItem("TEST_ACTIVE", "1");
  localStorage.removeItem("PENDING_FORCED_SUBMIT");

  timeLeft = TOTAL_TIME_SECONDS;
  startTimer();
  showScreen("screen-question");
  renderQuestion(currentIndex);
});

// --- Next / Submit
$("btnNext").addEventListener("click", () => {
  const q = questionBank[currentIndex];
  const chosen = document.querySelector(
    `input[name="${q.key}"]:checked`
  );

  if (chosen) responses[q.key] = chosen.value;

  if (currentIndex < questionBank.length - 1) {
    currentIndex++;
    renderQuestion(currentIndex);
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    submitNow(false);
  }
});

// --- Submit
async function submitNow(forceSubmit = false) {
  showScreen("screen-end");

  try {
    const payload = new URLSearchParams({
      action: "submit",
      email,
      violations: String(tabViolations),
      timeRemainingSec: String(Math.max(0, timeLeft)),
      responses: JSON.stringify(responses),
      forced: forceSubmit ? "1" : "0",
    });

    await fetch(SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body: payload.toString(),
    });

    if (forceSubmit) {
      document.body.innerHTML = `
        <h2 style="color:red; text-align:center;">VIOLATION DETECTED: PAGE REFRESH</h2>
        <p style="text-align:center;">Your test is being automatically submitted...</p>
      `;
    } else {
      document.body.innerHTML = `
        <h2 style="text-align:center;">Submitted</h2>
        <p style="text-align:center;">You may now close this tab.</p>
      `;
    }
  } finally {
    localStorage.removeItem("TEST_ACTIVE");
    localStorage.removeItem("PENDING_FORCED_SUBMIT");
  }
}

function autoSubmit() {
  submitNow(false);
}

// --- Init
$("qTotal").textContent = questionBank.length || 0;
updateHUD();
