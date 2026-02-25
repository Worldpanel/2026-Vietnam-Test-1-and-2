// =============================================
// WORLD PANEL – CLEAN STABLE ENGINE (UI FIXED)
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

  injectOptionStyles(); // inject UI style (NO HTML EDIT)
  initUI();
  injectTopWarningBanner();
});

// =============================================
// OPTION UI STYLE (Injected via JS)
// =============================================

function injectOptionStyles(){

  const style = document.createElement("style");

  style.innerHTML = `
    .option-card{
      display:flex;
      align-items:center;
      gap:14px;
      padding:14px 16px;
      border:2px solid #e3eaf2;
      border-radius:10px;
      background:#fff;
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
      min-width:24px;
    }

    .option-text{
      flex:1;
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

    showScreen("screen-question");
    renderQuestion(0);
    startTimer();
  };

  $("btnNext").onclick = () => {

    const bank = window.QUESTION_BANK;
    const q = bank[currentIndex];

    if (!responses[q.key]) {
      alert("Please select an answer.");
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

  window.addEventListener("beforeunload", (e) => {
    if (examStarted) {
      e.preventDefault();
      e.returnValue = "Refreshing will end your test.";
    }
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
