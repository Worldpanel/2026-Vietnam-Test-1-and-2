// =====================================================
// WORLD PANEL – STABLE ENGINE (SOFT MONITORING VERSION)
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

// Tab monitoring
let tabSwitchCount = 0;
const MAX_TAB_SWITCH = 5;

// Helper
const $ = (id) => document.getElementById(id);

// =====================================================
// INIT
// =====================================================

document.addEventListener("DOMContentLoaded", () => {

  const active = localStorage.getItem("TEST_ACTIVE") === "1";
  const navEntries = performance.getEntriesByType("navigation");
  const isReload = navEntries.length && navEntries[0].type === "reload";

  if (active && isReload) {
    handleForcedSubmit("Page refresh detected");
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

  // Soft tab monitoring
  document.addEventListener("visibilitychange", () => {

    if (!examStarted) return;

    if (document.hidden) {

      tabSwitchCount++;
      updateViolationUI();

      showSoftWarning(
        `Tab switched (${tabSwitchCount}/${MAX_TAB_SWITCH})`
      );

      if (tabSwitchCount >= MAX_TAB_SWITCH) {
        handleForcedSubmit("Too many tab switches");
      }
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
    <div class="question-label">Question ${i + 1}</div>
    <div class="question-main">${q.text.replace(/\n/g, "<br>")}</div>
  `;

  $("qExtra").innerHTML = q.extraHTML || "";

  const wrap = $("qOptions");
  wrap.innerHTML = "";
  wrap.className = "options-grid";

  q.options.forEach((opt) => {

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "option-card";
    btn.dataset.value = opt.value;

    btn.innerHTML = `
      <div class="option-letter">${opt.value}</div>
      <div class="option-text">
        ${opt.label.replace(opt.value + ". ", "")}
      </div>
    `;

    if (responses[q.key] === opt.value) {
      btn.classList.add("selected");
    }

    btn.addEventListener("click", () => {

      responses[q.key] = opt.value;

      wrap.querySelectorAll(".option-card")
          .forEach(b => b.classList.remove("selected"));

      btn.classList.add("selected");
    });

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
        violations: tabSwitchCount
      }),
    });
  } catch (e) {}

  localStorage.removeItem("TEST_ACTIVE");
  localStorage.removeItem("TEMP_EMAIL");

  setTimeout(() => {
    document.body.innerHTML = `
      <h2 style="text-align:center;">Submission Successful</h2>
      <p style="text-align:center;">
        Thank you. You may now close this tab.
      </p>
    `;
  }, 800);
}

// =====================================================
// FORCED SUBMIT
// =====================================================

async function handleForcedSubmit(reason = "Violation") {

  const email = localStorage.getItem("TEMP_EMAIL") || "unknown";

  try {
    await fetch(SCRIPT_URL, {
      method: "POST",
      body: new URLSearchParams({
        action: "submit",
        email: email,
        forced: "1",
        reason: reason,
        violations: tabSwitchCount
      }),
    });
  } catch (e) {}

  localStorage.clear();

  document.body.innerHTML = `
    <h2 style="color:red;text-align:center;margin-top:40px;">
      Test Ended
    </h2>
    <p style="text-align:center;">
      ${reason}
    </p>
  `;
}

// =====================================================
// UI HELPERS
// =====================================================

function showScreen(id) {
  ["screen-start", "screen-question", "screen-end"]
    .forEach(s => $(s).classList.toggle("hidden", s !== id));
}

function updateViolationUI() {
  const v = $("violations");
  if (v) v.textContent = tabSwitchCount;
}

function showSoftWarning(message) {

  let banner = document.getElementById("softWarning");

  if (!banner) {
    banner = document.createElement("div");
    banner.id = "softWarning";
    banner.style.position = "fixed";
    banner.style.bottom = "20px";
    banner.style.left = "50%";
    banner.style.transform = "translateX(-50%)";
    banner.style.background = "#ff9800";
    banner.style.color = "#fff";
    banner.style.padding = "10px 18px";
    banner.style.borderRadius = "8px";
    banner.style.fontSize = "14px";
    banner.style.boxShadow = "0 4px 12px rgba(0,0,0,.2)";
    banner.style.zIndex = "9999";
    document.body.appendChild(banner);
  }

  banner.textContent = message;
  banner.style.display = "block";

  setTimeout(() => {
    banner.style.display = "none";
  }, 2000);
}
