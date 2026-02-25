// =====================================================
// WORLD PANEL – FINAL STABLE TEST ENGINE (ENGLISH)
// =====================================================

// --- Config
const CFG = window.TEST_APP_CONFIG || {};
const TOTAL_TIME_SECONDS = Number(CFG.TOTAL_TIME_SECONDS || 45 * 60);
const SCRIPT_URL = String(CFG.SCRIPT_URL || "");

// --- State
let timeLeft = TOTAL_TIME_SECONDS;
let currentIndex = 0;
let responses = {};
let email = "";
let timerHandle = null;
let examStarted = false;

// Helpers
const $ = (id) => document.getElementById(id);

// =====================================================
// REFRESH PROTECTION
// =====================================================

// 1) If test was active AND the user refreshed → auto-submit immediately
(function detectHardReload() {
  const active = localStorage.getItem("TEST_ACTIVE") === "1";
  const pending = localStorage.getItem("PENDING_FORCED_SUBMIT") === "1";

  if (active && pending) {
    // The user confirmed refresh → forced auto-submit
    localStorage.removeItem("PENDING_FORCED_SUBMIT");
    forceSubmit(localStorage.getItem("TEMP_EMAIL") || "unknown");
    document.body.innerHTML = `
      <h2 style="color:red; text-align:center; margin-top:40px;">
        VIOLATION DETECTED: PAGE REFRESH
      </h2>
      <p style="text-align:center;">Your test is being automatically submitted...</p>
    `;
  }
})();

// 2) Warn before refreshing
window.addEventListener("beforeunload", (e) => {
  if (localStorage.getItem("TEST_ACTIVE") === "1") {
    localStorage.setItem("PENDING_FORCED_SUBMIT", "1");
    e.preventDefault();
    e.returnValue =
      "Warning: The test will auto-submit if you refresh or close this page.";
    return e.returnValue;
  }
});

// =====================================================
// START TEST
// =====================================================

document.addEventListener("DOMContentLoaded", () => {
  $("btnStart").onclick = () => {
    if (!window.QUESTION_BANK || !window.QUESTION_BANK.length) {
      alert("Question bank not loaded.");
      return;
    }

    const val = $("email").value.trim();
    if (!val || !val.includes("@")) {
      alert("Please enter a valid email address.");
      return;
    }

    email = val;
    localStorage.setItem("TEMP_EMAIL", email);

    // Lock the session
    localStorage.setItem("TEST_ACTIVE", "1");
    localStorage.removeItem("PENDING_FORCED_SUBMIT");

    examStarted = true;
    showScreen("screen-question");
    renderQuestion(0);
    startTimer();
  };

  $("btnNext").onclick = () => {
    if (!examStarted) return;

    const bank = window.QUESTION_BANK;
    const q = bank[currentIndex];

    if (!responses[q.key]) {
      alert("Please select an answer before continuing.");
      return;
    }

    if (currentIndex < bank.length - 1) {
      currentIndex++;
      renderQuestion(currentIndex);
      window.scrollTo(0, 0);
    } else {
      submitNow();
    }
  };
});

// =====================================================
// RENDER QUESTION
// =====================================================

function renderQuestion(i) {
  const bank = window.QUESTION_BANK;
  const q = bank[i];
  if (!q) return;

  currentIndex = i;

  $("qIndex").textContent = i + 1;
  $("qTotal").textContent = bank.length;

  const percent = Math.round(((i + 1) / bank.length) * 100);
  $("qPercent").textContent = percent + "%";
  $("progressBar").style.width = percent + "%";

  // Warning Banner
  const warningBanner = `
    <div style="
      background:#ffe4e4;
      padding:12px;
      border-left:6px solid red;
      margin-bottom:10px;
      border-radius:4px;
      font-weight:600;
    ">
      ⚠️ WARNING: Refreshing, leaving this page, or opening a new tab will automatically submit your test.
    </div>
  `;

  $("qText").innerHTML =
    warningBanner +
    `
      <div style="margin-bottom:6px; opacity:.7;">Question ${i + 1}</div>
      <div>${q.text.replace(/\n/g, "<br>")}</div>
    `;

  $("qExtra").innerHTML = q.extraHTML || "";

  const wrap = $("qOptions");
  wrap.innerHTML = "";

  q.options.forEach((opt) => {
    const lbl = document.createElement("label");
    lbl.className = "option";

    lbl.onclick = () => {
      responses[q.key] = opt.value;
    };

    lbl.innerHTML = `
      <span>${opt.label}</span>
    `;

    wrap.appendChild(lbl);
  });

  $("btnNext").textContent =
    i === bank.length - 1 ? "Submit Test" : "Next";
}

// =====================================================
// TIMER
// =====================================================

function startTimer() {
  $("timer").textContent = formatTime(timeLeft);

  timerHandle = setInterval(() => {
    $("timer").textContent = formatTime(timeLeft);
    timeLeft--;

    if (timeLeft <= 0) {
      clearInterval(timerHandle);
      submitNow();
    }
  }, 1000);
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec < 10 ? "0" : ""}${sec}`;
}

// =====================================================
// SUBMIT FUNCTIONS
// =====================================================

async function submitNow() {
  clearInterval(timerHandle);
  showScreen("screen-end");

  try {
    await fetch(SCRIPT_URL, {
      method: "POST",
      body: new URLSearchParams({
        action: "submit",
        email: email,
        responses: JSON.stringify(responses),
      }),
    });
  } catch (e) {}

  setTimeout(() => {
    document.body.innerHTML = `
      <h2 style="text-align:center;">Submission Successful</h2>
      <p style="text-align:center;">Thank you. You may now close this tab.</p>
    `;
  }, 800);

  localStorage.removeItem("TEST_ACTIVE");
  localStorage.removeItem("PENDING_FORCED_SUBMIT");
}

async function forceSubmit(email) {
  try {
    await fetch(SCRIPT_URL, {
      method: "POST",
      body: new URLSearchParams({
        action: "submit",
        email: email,
        forced: "1",
      }),
    });
  } catch (e) {}

  localStorage.removeItem("TEST_ACTIVE");
  localStorage.removeItem("PENDING_FORCED_SUBMIT");
}

// =====================================================
// SCREEN SWITCH
// =====================================================

function showScreen(id) {
  ["screen-start", "screen-question", "screen-end"].forEach((s) => {
    $(s).classList.toggle("hidden", s !== id);
  });
}
