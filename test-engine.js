// =====================================================
// WORLD PANEL – STABLE ENGINE V3 (RACE SAFE)
// =====================================================

const CFG = window.TEST_APP_CONFIG || {};
const SCRIPT_URL = String(CFG.SCRIPT_URL || "");
const TOTAL_TIME_SECONDS = Number(CFG.TOTAL_TIME_SECONDS || 45 * 60);

let timeLeft = TOTAL_TIME_SECONDS;
let currentIndex = 0;
let responses = {};
let email = "";
let timerHandle = null;
let examStarted = false;

const $ = (id) => document.getElementById(id);

// -----------------------------------------------------
// SAFE QUESTION ACCESS
// -----------------------------------------------------
function getQuestionBankSafe() {
  if (!window.QUESTION_BANK) return null;
  if (!Array.isArray(window.QUESTION_BANK)) return null;
  if (!window.QUESTION_BANK.length) return null;
  return window.QUESTION_BANK;
}

// -----------------------------------------------------
function showScreen(id) {
  ["screen-start", "screen-question", "screen-end"].forEach(s => {
    const el = $(s);
    if (el) el.classList.add("hidden");
  });
  const active = $(id);
  if (active) active.classList.remove("hidden");
}

// =====================================================
// SECURITY
// =====================================================
function enableSecurity() {

  const TAB_ID = Date.now() + "_" + Math.random();

  sessionStorage.setItem("ACTIVE_TAB", TAB_ID);

  const banner = document.createElement("div");
  banner.style.cssText = `
    position:fixed;
    top:0;
    left:0;
    width:100%;
    background:#c62828;
    color:#fff;
    padding:10px;
    text-align:center;
    font-weight:bold;
    z-index:9999;
  `;
  banner.innerText =
    "⚠️ WARNING: Refreshing or opening new tabs will terminate your test.";
  document.body.prepend(banner);
  document.body.style.paddingTop = "50px";

  document.addEventListener("keydown", function (e) {
    if (!examStarted) return;
    if (
      e.key === "F5" ||
      (e.ctrlKey && e.key.toLowerCase() === "r") ||
      (e.metaKey && e.key.toLowerCase() === "r")
    ) {
      e.preventDefault();
      alert("Refreshing is disabled during the test.");
    }
  });

  window.addEventListener("beforeunload", function (e) {
    if (examStarted) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
}

// =====================================================
// START
// =====================================================
document.addEventListener("DOMContentLoaded", () => {

  $("btnStart").addEventListener("click", async () => {

    const val = $("email").value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(val)) {
      alert("Please enter valid email.");
      return;
    }

    email = val;

    // 🔥 WAIT UNTIL QUESTION_BANK READY (max 2s)
    let retries = 0;
    let bank = getQuestionBankSafe();

    while (!bank && retries < 20) {
      await new Promise(r => setTimeout(r, 100));
      bank = getQuestionBankSafe();
      retries++;
    }

    if (!bank) {
      alert("Question bank failed to load. Please refresh.");
      return;
    }

    examStarted = true;

    enableSecurity();
    showScreen("screen-question");
    renderQuestion(0, bank);
    startTimer();
  });

  $("btnNext").addEventListener("click", () => {
    if (!examStarted) return;

    const bank = getQuestionBankSafe();
    if (!bank) return;

    const q = bank[currentIndex];
    if (!responses[q.key]) {
      alert("Please select an answer before continuing.");
      return;
    }

    if (currentIndex < bank.length - 1) {
      currentIndex++;
      renderQuestion(currentIndex, bank);
    } else {
      submitNow(false);
    }
  });

});

// =====================================================
function renderQuestion(i, bank) {

  const q = bank[i];
  if (!q) return;

  $("qIndex").textContent = i + 1;
  $("qTotal").textContent = bank.length;

  const percent = Math.round(((i + 1) / bank.length) * 100);
  $("qPercent").textContent = percent + "%";
  $("progressBar").style.width = percent + "%";

  $("qText").innerHTML =
    `<div style="opacity:.7;margin-bottom:6px">Question ${i + 1}</div>
     <div>${q.text}</div>`;

  $("qExtra").innerHTML = q.extraHTML || "";

  const wrap = $("qOptions");
  wrap.innerHTML = "";

  q.options.forEach((opt) => {
    const lbl = document.createElement("label");
    lbl.className = "option";
    lbl.innerHTML =
      `<input type="radio" name="${q.key}" value="${opt.value}">
       ${opt.label}`;

    lbl.onclick = () => {
      responses[q.key] = opt.value;
    };

    wrap.appendChild(lbl);
  });

  $("btnNext").textContent =
    i === bank.length - 1 ? "Submit Test" : "Next";
}

// =====================================================
function startTimer() {
  $("timer").textContent = formatTime(timeLeft);

  timerHandle = setInterval(() => {
    timeLeft--;
    $("timer").textContent = formatTime(timeLeft);

    if (timeLeft <= 0) {
      clearInterval(timerHandle);
      submitNow(false);
    }
  }, 1000);
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec < 10 ? "0" : ""}${sec}`;
}

// =====================================================
async function submitNow(forced) {

  clearInterval(timerHandle);
  showScreen("screen-end");

  try {
    await fetch(SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        action: "submit",
        email,
        responses: JSON.stringify(responses),
        forced: forced ? "1" : "0"
      })
    });
  } catch (e) {}

  document.body.innerHTML =
    `<div style="text-align:center;padding:80px;font-family:sans-serif">
       <h2>Submission Successful</h2>
     </div>`;
}
