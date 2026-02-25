// =====================================================
// WORLD PANEL – STABLE ENGINE (ENHANCED UX + TAB LOCK)
// =====================================================

// ---------------- CONFIG ----------------
const CFG = window.TEST_APP_CONFIG || {};
const TOTAL_TIME_SECONDS = Number(CFG.TOTAL_TIME_SECONDS || 45 * 60);
const SCRIPT_URL = String(CFG.SCRIPT_URL || "");

// ---------------- STATE ----------------
let timeLeft = TOTAL_TIME_SECONDS;
let currentIndex = 0;
let responses = {};
let email = "";
let timerHandle = null;
let examStarted = false;
let TAB_ID = crypto.randomUUID();

// Helper
const $ = (id) => document.getElementById(id);

// =====================================================
// TAB LOCK (PREVENT DUPLICATE TAB CHEAT)
// =====================================================

function lockToSingleTab() {
  const existing = localStorage.getItem("ACTIVE_TAB_ID");

  if (!existing) {
    localStorage.setItem("ACTIVE_TAB_ID", TAB_ID);
  } else if (existing !== TAB_ID) {
    document.body.innerHTML = `
      <h2 style="color:red;text-align:center;margin-top:40px;">
        Multiple Tabs Detected
      </h2>
      <p style="text-align:center;">
        This test can only run in one tab. Please close other tabs.
      </p>
    `;
    throw new Error("Duplicate tab blocked");
  }

  window.addEventListener("storage", (e) => {
    if (e.key === "ACTIVE_TAB_ID" && e.newValue !== TAB_ID) {
      location.reload();
    }
  });
}

// =====================================================
// RELOAD DETECTION
// =====================================================

document.addEventListener("DOMContentLoaded", () => {

  lockToSingleTab();

  const active = localStorage.getItem("TEST_ACTIVE") === "1";
  const navEntries = performance.getEntriesByType("navigation");
  const isReload = navEntries.length && navEntries[0].type === "reload";

  if (active && isReload) {
    handleForcedSubmit();
    return;
  }

  initUI();
});

// =====================================================
// INIT UI
// =====================================================

function initUI() {

  $("btnStart").onclick = () => {

    if (!window.QUESTION_BANK?.length) {
      alert("Question bank not loaded.");
      return;
    }

    const val = $("email").value.trim();
    if (!val || !val.includes("@")) {
      alert("Please enter a valid email address.");
      return;
    }

    email = val;

    localStorage.setItem("TEST_ACTIVE", "1");
    localStorage.setItem("TEMP_EMAIL", email);

    examStarted = true;
    showScreen("screen-question");
    renderQuestion(0);
    startTimer();
  };

  $("btnNext").onclick = () => {

    if (!examStarted) return;

    const bank = window.QUESTION_BANK;

    if (currentIndex < bank.length - 1) {
      currentIndex++;
      renderQuestion(currentIndex);
      window.scrollTo(0, 0);
    } else {
      submitNow();
    }
  };

  // Warn before leaving
  window.addEventListener("beforeunload", (e) => {
    if (localStorage.getItem("TEST_ACTIVE") === "1") {
      e.preventDefault();
      e.returnValue =
        "Leaving or refreshing will auto-submit your test.";
    }
  });
}

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

  $("qText").innerHTML = `
      <div style="margin-bottom:6px; opacity:.6;">
        Question ${i + 1}
      </div>
      <div>${q.text.replace(/\n/g, "<br>")}</div>
  `;

  $("qExtra").innerHTML = q.extraHTML || "";

  const wrap = $("qOptions");
  wrap.innerHTML = "";

  q.options.forEach((opt) => {

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "option-btn";
    btn.innerHTML = opt.label;

    if (responses[q.key] === opt.value) {
      btn.classList.add("selected");
    }

    btn.onclick = () => {
      responses[q.key] = opt.value;

      document.querySelectorAll(".option-btn")
        .forEach(b => b.classList.remove("selected"));

      btn.classList.add("selected");
    };

    wrap.appendChild(btn);
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
// SUBMIT
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

  localStorage.clear();

  setTimeout(() => {
    document.body.innerHTML = `
      <h2 style="text-align:center;">Submission Successful</h2>
      <p style="text-align:center;">Thank you. You may now close this tab.</p>
    `;
  }, 800);
}

// =====================================================
// FORCED SUBMIT
// =====================================================

async function handleForcedSubmit() {

  const email = localStorage.getItem("TEMP_EMAIL") || "unknown";

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

  localStorage.clear();

  document.body.innerHTML = `
    <h2 style="color:red;text-align:center;margin-top:40px;">
      Test Ended
    </h2>
    <p style="text-align:center;">
      Page refresh detected. Your test has been submitted.
    </p>
  `;
}

// =====================================================
// SCREEN SWITCH
// =====================================================

function showScreen(id) {
  ["screen-start", "screen-question", "screen-end"]
    .forEach(s => $(s).classList.toggle("hidden", s !== id));
}
