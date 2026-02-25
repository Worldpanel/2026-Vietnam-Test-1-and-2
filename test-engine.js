// =====================================================
// WORLD PANEL – SECURE TEST ENGINE (PRODUCTION READY)
// =====================================================
(function detectRefreshViaFlag() {
  const isActive = localStorage.getItem("TEST_ACTIVE") === "1";
  const wasLeaving = localStorage.getItem("PAGE_LEAVING") === "1";

  if (isActive && wasLeaving) {
    const savedEmail = localStorage.getItem("SAVED_EMAIL");
    const savedResponses = localStorage.getItem("SAVED_RESPONSES");
    const savedViolations = localStorage.getItem("SAVED_VIOLATIONS");

    document.addEventListener("DOMContentLoaded", async () => {
      document.body.innerHTML = `
        <div style="text-align:center;padding:80px;font-family:sans-serif">
          <h2 style="color:#d32f2f">Test Auto-Submitted</h2>
          <p>A refresh was detected.</p>
          <p>Your test is being submitted automatically.</p>
        </div>
      `;

      try {
        await fetch(SCRIPT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: new URLSearchParams({
            action: "submit",
            email: savedEmail || "refresh_user",
            responses: savedResponses || "{}",
            violations: savedViolations || "0",
            forced: "1"
          }).toString()
        });
      } catch (e) {}

      localStorage.clear();
    });
  }

  // clear flag
  localStorage.removeItem("PAGE_LEAVING");
})();
// ---------------- CONFIG ----------------
const CFG = window.TEST_APP_CONFIG || {};
const SCRIPT_URL = String(CFG.SCRIPT_URL || "");
const TOTAL_TIME_SECONDS = Number(CFG.TOTAL_TIME_SECONDS || 45 * 60);

// ---------------- STATE ----------------
let timeLeft = TOTAL_TIME_SECONDS;
let tabViolations = 0;
let currentIndex = 0;
let responses = {};
let email = "";
let timerHandle = null;

const questionBank = Array.isArray(window.QUESTION_BANK)
  ? window.QUESTION_BANK
  : [];

const $ = (id) => document.getElementById(id);

// ---------------- SESSION KEYS ----------------
const LS_KEYS = {
  ACTIVE: "TEST_ACTIVE",
  EMAIL: "SAVED_EMAIL",
  RESPONSES: "SAVED_RESPONSES",
  VIOLATIONS: "SAVED_VIOLATIONS",
  START_TIME: "SESSION_START"
};

// =====================================================
// 1️⃣ RELOAD DETECTION – AUTO SUBMIT
// =====================================================
(function detectReloadAndAutoSubmit() {
  const isActive = localStorage.getItem(LS_KEYS.ACTIVE) === "1";
  if (!isActive) return;

  const nav = performance.getEntriesByType("navigation")[0];
  if (nav && nav.type === "reload") {
    const savedEmail = localStorage.getItem(LS_KEYS.EMAIL);
    const savedResponses = localStorage.getItem(LS_KEYS.RESPONSES);
    const savedViolations = localStorage.getItem(LS_KEYS.VIOLATIONS);

    document.addEventListener("DOMContentLoaded", async () => {
      document.body.innerHTML = `
        <div style="text-align:center;padding:80px;font-family:sans-serif">
          <h2 style="color:#d32f2f">Test Auto-Submitted</h2>
          <p>A page refresh was detected.</p>
          <p>Your test has been submitted automatically.</p>
        </div>
      `;

      try {
        await fetch(SCRIPT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: new URLSearchParams({
            action: "submit",
            email: savedEmail || "refresh_user",
            responses: savedResponses || "{}",
            violations: savedViolations || "0",
            forced: "1"
          }).toString()
        });
      } catch (e) {}

      localStorage.clear();
    });
  }
})();

// =====================================================
// 2️⃣ BEFORE UNLOAD WARNING
// =====================================================
window.addEventListener("beforeunload", function (e) {
  if (localStorage.getItem("TEST_ACTIVE") === "1") {
    localStorage.setItem("PAGE_LEAVING", "1");

    e.preventDefault();
    e.returnValue =
      "Refreshing or leaving this page will auto-submit your test.";
  }
});

// =====================================================
// 3️⃣ SESSION PERSIST
// =====================================================
function persistSession() {
  if (!email) return;

  localStorage.setItem(LS_KEYS.ACTIVE, "1");
  localStorage.setItem(LS_KEYS.EMAIL, email);
  localStorage.setItem(LS_KEYS.RESPONSES, JSON.stringify(responses));
  localStorage.setItem(LS_KEYS.VIOLATIONS, String(tabViolations));
}

// Backup every 5 seconds
setInterval(() => {
  if (localStorage.getItem(LS_KEYS.ACTIVE) === "1") {
    persistSession();
  }
}, 5000);

// =====================================================
// 4️⃣ UI HELPERS
// =====================================================
function showScreen(id) {
  ["screen-start", "screen-question", "screen-end"].forEach((s) =>
    $(s).classList.toggle("hidden", s !== id)
  );
}

function updateHUD() {
  $("qIndex").textContent = currentIndex + 1;
  $("qTotal").textContent = questionBank.length;
  $("violations").textContent = tabViolations;
}

function fmtTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec < 10 ? "0" : ""}${sec}`;
}

// =====================================================
// 5️⃣ START TEST
// =====================================================
$("btnStart").addEventListener("click", () => {
  const val = $("email").value.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(val)) {
    alert("Please enter a valid email.");
    return;
  }

  if (!SCRIPT_URL) {
    alert("SCRIPT_URL missing in config.");
    return;
  }

  email = val;
  timeLeft = TOTAL_TIME_SECONDS;

  persistSession();

  showScreen("screen-question");
  renderQuestion(0);
  startTimer();
});

// =====================================================
// 6️⃣ RENDER QUESTION
// =====================================================
function renderQuestion(i) {
  currentIndex = i;
  const q = questionBank[i];
  if (!q) return;

  $("qText").innerHTML = `
    <div style="opacity:.7;margin-bottom:6px">Question ${i + 1}</div>
    <div>${q.text}</div>
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
    lbl.onclick = () => {
      responses[q.key] = opt.value;
      persistSession();
    };
    wrap.appendChild(lbl);
  });

  $("btnNext").textContent =
    i === questionBank.length - 1 ? "Submit Test" : "Next";

  updateHUD();
}

// =====================================================
// 7️⃣ TIMER
// =====================================================
function startTimer() {
  $("timer").textContent = fmtTime(timeLeft);

  timerHandle = setInterval(() => {
    timeLeft--;
    $("timer").textContent = fmtTime(timeLeft);

    if (timeLeft <= 0) {
      clearInterval(timerHandle);
      submitNow(false);
    }
  }, 1000);
}

// =====================================================
// 8️⃣ NEXT BUTTON
// =====================================================
$("btnNext").addEventListener("click", () => {
  if (currentIndex < questionBank.length - 1) {
    currentIndex++;
    renderQuestion(currentIndex);
    window.scrollTo(0, 0);
  } else {
    submitNow(false);
  }
});

// =====================================================
// 9️⃣ TAB SWITCH DETECTION
// =====================================================
document.addEventListener("visibilitychange", () => {
  if (document.hidden &&
      localStorage.getItem(LS_KEYS.ACTIVE) === "1") {
    tabViolations++;
    persistSession();
    updateHUD();
    alert(
      "Warning: Leaving the test tab is recorded.\nViolation count: " +
        tabViolations
    );
  }
});

// =====================================================
// 🔟 SUBMIT FUNCTION
// =====================================================
async function submitNow(forced = false) {
  clearInterval(timerHandle);
  showScreen("screen-end");

  try {
    const payload = new URLSearchParams({
      action: "submit",
      email,
      responses: JSON.stringify(responses),
      violations: String(tabViolations),
      forced: forced ? "1" : "0"
    });

    const res = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: payload.toString()
    });

    const data = await res.json().catch(() => null);

    if (!data || data.ok !== true) {
      alert("Submission error. Please contact administrator.");
      showScreen("screen-question");
      return;
    }

    document.body.innerHTML = `
      <div style="text-align:center;padding:80px;font-family:sans-serif">
        <h2>Submission Successful</h2>
        <p>This session has ended.</p>
      </div>
    `;
  } catch (e) {
    alert("Network error during submission.");
    showScreen("screen-question");
  } finally {
    localStorage.clear();
  }
}

// =====================================================
// INIT HUD
// =====================================================
$("qTotal").textContent = questionBank.length || 0;
updateHUD();
