// =============================================
// WORLD PANEL – CLEAN STABLE ENGINE (FINAL FIX)
// =============================================

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

// Soft monitoring only
let tabSwitchCount = 0;
const MAX_TAB_SWITCH = 5;

const $ = (id) => document.getElementById(id);

// =============================================
// INIT
// =============================================

document.addEventListener("DOMContentLoaded", () => {

  initUI();
  injectTopWarningBanner();
});

// =============================================
// UI INIT
// =============================================

function initUI() {

  $("btnStart").onclick = () => {

    if (!window.QUESTION_BANK?.length) {
      alert("Question bank not loaded.");
      return;
    }

    const val = $("email").value.trim();
    if (!val || !val.includes("@")) {
      alert("Please enter valid email.");
      return;
    }

    email = val;
    examStarted = true;

    showScreen("screen-question");
    renderQuestion(0);
    startTimer();
  };

  $("btnNext").onclick = () => {

    const bank = window.QUESTION_BANK;

    if (currentIndex < bank.length - 1) {
      currentIndex++;
      renderQuestion(currentIndex);
      window.scrollTo(0, 0);
    } else {
      submitNow();
    }
  };

  // Warning before refresh (no locking, no auto submit)
  window.addEventListener("beforeunload", (e) => {
    if (examStarted) {
      e.preventDefault();
      e.returnValue =
        "Refreshing will end your test.";
    }
  });

  // SOFT tab switch monitor (NO LOCK)
  document.addEventListener("visibilitychange", () => {

    if (!examStarted) return;

    if (document.hidden) {

      tabSwitchCount++;
      updateViolationUI();

      showSoftWarning(
        `You switched tab (${tabSwitchCount}/${MAX_TAB_SWITCH})`
      );

      if (tabSwitchCount >= MAX_TAB_SWITCH) {
        handleForcedSubmit("Too many tab switches");
      }
    }
  });
}

// =============================================
// RENDER QUESTION (100% highlight working)
// =============================================

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
  wrap.style.display = "flex";
  wrap.style.flexDirection = "column";
  wrap.style.gap = "12px";

  q.options.forEach((opt) => {

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "option-card";

    btn.innerHTML = `
      <span class="option-letter">${opt.value}</span>
      <span class="option-text">
        ${opt.label.replace(opt.value + ". ", "")}
      </span>
    `;

    // restore previous answer
    if (responses[q.key] === opt.value) {
      btn.classList.add("selected");
    }

    btn.onclick = () => {

      responses[q.key] = opt.value;

      // remove highlight only inside current question
      wrap.querySelectorAll(".option-card")
          .forEach(el => el.classList.remove("selected"));

      btn.classList.add("selected");
    };

    wrap.appendChild(btn);
  });

  $("btnNext").textContent =
    i === bank.length - 1 ? "Submit Test" : "Next";
}

// =============================================
// TIMER
// =============================================

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

// =============================================
// SUBMIT
// =============================================

async function submitNow() {

  clearInterval(timerHandle);
  showScreen("screen-end");

  try {
    await fetch(SCRIPT_URL, {
      method: "POST",
      body: new URLSearchParams({
        email,
        responses: JSON.stringify(responses),
        violations: tabSwitchCount
      }),
    });
  } catch (e) {}

  setTimeout(() => {
    document.body.innerHTML = `
      <h2 style="text-align:center;">Submission Successful</h2>
      <p style="text-align:center;">Thank you.</p>
    `;
  }, 800);
}

// =============================================
// FORCED SUBMIT
// =============================================

function handleForcedSubmit(reason) {

  clearInterval(timerHandle);

  document.body.innerHTML = `
    <h2 style="color:#d32f2f;text-align:center;margin-top:40px;">
      Test Ended
    </h2>
    <p style="text-align:center;">${reason}</p>
  `;
}

// =============================================
// WARNING BANNER
// =============================================

function injectTopWarningBanner() {

  const banner = document.createElement("div");

  banner.style.position = "fixed";
  banner.style.top = "0";
  banner.style.left = "0";
  banner.style.width = "100%";
  banner.style.background = "#fff8e1";
  banner.style.color = "#8d6e63";
  banner.style.textAlign = "center";
  banner.style.padding = "8px";
  banner.style.fontSize = "13px";
  banner.style.borderBottom = "1px solid #ffe0b2";
  banner.style.zIndex = "9999";

  banner.innerHTML =
    "⚠️ WARNING: Refreshing, leaving, or opening a new tab will automatically end your test.";

  document.body.appendChild(banner);
}

// =============================================
// HELPERS
// =============================================

function showScreen(id) {
  ["screen-start", "screen-question", "screen-end"]
    .forEach(s => $(s).classList.toggle("hidden", s !== id));
}

function updateViolationUI() {
  const v = $("violations");
  if (v) v.textContent = tabSwitchCount;
}

function showSoftWarning(msg) {

  const warn = document.createElement("div");

  warn.style.position = "fixed";
  warn.style.bottom = "20px";
  warn.style.left = "50%";
  warn.style.transform = "translateX(-50%)";
  warn.style.background = "#ff9800";
  warn.style.color = "#fff";
  warn.style.padding = "10px 18px";
  warn.style.borderRadius = "8px";
  warn.style.fontSize = "14px";
  warn.style.boxShadow = "0 4px 12px rgba(0,0,0,.2)";
  warn.style.zIndex = "9999";

  warn.innerText = msg;

  document.body.appendChild(warn);

  setTimeout(() => warn.remove(), 2000);
}
