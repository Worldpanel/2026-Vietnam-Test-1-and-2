// =====================================================
// WORLD PANEL – STABLE TEST ENGINE (SAFE VERSION)
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

// Helper
const $ = (id) => document.getElementById(id);

// =====================================================
// SAFE RELOAD DETECTION (NO FALSE TRIGGER)
// =====================================================

document.addEventListener("DOMContentLoaded", () => {

  const active = localStorage.getItem("TEST_ACTIVE") === "1";

  const navEntries = performance.getEntriesByType("navigation");
  const isReload =
    navEntries.length && navEntries[0].type === "reload";

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

  // Warning before leaving
  window.addEventListener("beforeunload", (e) => {
    if (localStorage.getItem("TEST_ACTIVE") === "1") {
      e.preventDefault();
      e.returnValue =
        "Warning: The test will auto-submit if you refresh or close this page.";
      return e.returnValue;
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

  const warningBanner = `
    <div style="
      background:#ffe4e4;
      padding:12px;
      border-left:6px solid red;
      margin-bottom:10px;
      border-radius:4px;
      font-weight:600;">
      ⚠️ Refreshing or leaving this page will auto-submit your test.
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

    lbl.innerHTML = `<span>${opt.label}</span>`;

    lbl.onclick = () => {
      responses[q.key] = opt.value;

      document.querySelectorAll(".option")
        .forEach(o => o.classList.remove("selected"));

      lbl.classList.add("selected");
    };

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

  localStorage.removeItem("TEST_ACTIVE");
  localStorage.removeItem("TEMP_EMAIL");

  setTimeout(() => {
    document.body.innerHTML = `
      <h2 style="text-align:center;">Submission Successful</h2>
      <p style="text-align:center;">Thank you. You may now close this tab.</p>
    `;
  }, 800);
}

// =====================================================
// FORCED SUBMIT (RELOAD DETECTED)
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

  localStorage.removeItem("TEST_ACTIVE");
  localStorage.removeItem("TEMP_EMAIL");

  document.body.innerHTML = `
    <h2 style="color:red; text-align:center; margin-top:40px;">
      VIOLATION DETECTED: PAGE REFRESH
    </h2>
    <p style="text-align:center;">
      Your test has been automatically submitted.
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
