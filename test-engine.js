// =============================================
// WORLD PANEL – ENGINE (REFRESH FIX + SKIP OK)
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

let tabSwitchCount = 0;
const MAX_TAB_SWITCH = 5;

const $ = (id) => document.getElementById(id);

// =============================================
// INIT
// =============================================

document.addEventListener("DOMContentLoaded", () => {

  injectOptionStyles();
  initUI();
  injectTopWarningBanner();

  detectRefreshAutoSubmit();
});

// =============================================
// REFRESH AUTO SUBMIT (FIXED)
// =============================================

function detectRefreshAutoSubmit() {

  const navEntries = performance.getEntriesByType("navigation");
  if (!navEntries.length) return;

  if (navEntries[0].type === "reload") {

    if (localStorage.getItem("exam_active") === "1") {

      const savedEmail = localStorage.getItem("exam_email") || "unknown";

      navigator.sendBeacon(
        SCRIPT_URL,
        new URLSearchParams({
          email: savedEmail,
          responses: localStorage.getItem("exam_responses") || "{}",
          violations: tabSwitchCount,
          reason: "Page refreshed"
        })
      );

      document.body.innerHTML = `
        <h2 style="color:#d32f2f;text-align:center;margin-top:40px;">
          Test Automatically Submitted
        </h2>
        <p style="text-align:center;">You refreshed the page.</p>
      `;
    }
  }
}

// =============================================
// OPTION UI STYLE
// =============================================

function injectOptionStyles(){

  const style = document.createElement("style");

  style.innerHTML = `
    .options{
      display:flex !important;
      flex-direction:column;
      gap:12px;
    }

    .option-card{
      all: unset;
      box-sizing: border-box;
      display:flex;
      align-items:center;
      gap:14px;
      padding:14px 16px;
      border:2px solid #d6e0ea;
      border-radius:10px;
      background:#ffffff;
      cursor:pointer;
      transition:all .2s ease;
      font-size:15px;
      text-align:left;
      width:100%;
    }

    .option-card:hover{
      border-color:#005EB8;
      background:#f0f7ff;
    }

    .option-card.selected{
      border-color:#005EB8;
      background:#e3f2fd;
      box-shadow:0 0 0 2px rgba(0,94,184,.15);
    }

    .option-letter{
      font-weight:700;
      color:#005EB8;
      min-width:28px;
    }

    .option-text{
      flex:1;
    }
    #qExtra {
  margin-bottom: 16px;
}

/* ===== Question spacing fix – ULTRA COMPACT ===== */

#screen-question.card{
  padding:14px 16px !important;
}

.qtext{
  margin-bottom:4px !important;
  line-height:1.25 !important;
}

.question-label{
  font-size:14px;
  font-weight:600;
  color:#003D73;
  margin-bottom:2px !important;
}

.question-main{
  line-height:1.3 !important;
  margin-bottom:2px !important;
}

.question-main br{
  line-height:1.1 !important;
}

#qExtra{
  margin:2px 0 6px 0 !important;
  line-height:1.3 !important;

}

#qExtra br{
  line-height:1 !important;
}

#qExtra div{
  margin:3px 0 !important;
}

.options{
  margin-top:4px !important;
  gap:6px !important;
}
`;

  document.head.appendChild(style);
}

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

    localStorage.setItem("exam_active", "1");
    localStorage.setItem("exam_email", email);

    showScreen("screen-question");
    renderQuestion(0);
    startTimer();
  };

  $("btnNext").onclick = () => {

    const bank = window.QUESTION_BANK;

    // ❌ Removed validation → now skip allowed

    if (currentIndex < bank.length - 1) {
      currentIndex++;
      renderQuestion(currentIndex);
      window.scrollTo(0, 0);
    } else {
      submitNow();
    }
  };

  window.addEventListener("beforeunload", () => {

    if (!examStarted) return;

    localStorage.setItem("exam_responses", JSON.stringify(responses));
  });

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
// RENDER QUESTION
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

    if (responses[q.key] === opt.value) {
      btn.classList.add("selected");
    }

    btn.onclick = () => {

      responses[q.key] = opt.value;

      wrap.querySelectorAll(".option-card")
          .forEach(el => el.classList.remove("selected"));

      btn.classList.add("selected");

      localStorage.setItem("exam_responses", JSON.stringify(responses));
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

    timeLeft--;
    $("timer").textContent = formatTime(timeLeft);

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
 localStorage.removeItem("exam_active");
  localStorage.removeItem("exam_email");
  localStorage.removeItem("exam_responses");
 try {
  const response = await fetch(SCRIPT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      email,
      responses: JSON.stringify(responses),
      violations: tabSwitchCount,
      timeRemainingSec: timeLeft
    })
  });

  if (!response.ok) {
    throw new Error("Server error: " + response.status);
  }

  const result = await response.json();

  if (!result.ok) {
    throw new Error(result.message || "Submission failed");
  }

  // ✅ SUCCESS
   document.body.innerHTML = `
    <h2 style="text-align:center; color:green;">Submission Successful</h2>
    <p style="text-align:center;">Thank you.</p>
  `;

} catch (e) {
  console.error("Submit failed:", e);

  // ❌ ERROR
  document.body.innerHTML = `
    <h2 style="text-align:center; color:red;">Submission Failed</h2>
    <p style="text-align:center;">
      There was a problem submitting your test.<br>
      Please check your internet connection and try again.
    </p>
  `;
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

function injectTopWarningBanner() {

  const banner = document.createElement("div");

  banner.style.background = "#fff8e1";
  banner.style.color = "#8d6e63";
  banner.style.textAlign = "center";
  banner.style.padding = "8px";
  banner.style.fontSize = "13px";
  banner.style.borderBottom = "1px solid #ffe0b2";

  banner.innerHTML =
    "⚠️ WARNING: Refreshing, leaving, or opening a new tab may end your test.";

  const hud = document.querySelector(".hud");
  hud.parentNode.insertBefore(banner, hud);
}
