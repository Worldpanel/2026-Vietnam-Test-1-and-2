// =====================================================
// WORLD PANEL – SECURE TEST ENGINE (STABLE CLEAN)
// =====================================================

// ---------------- CONFIG ----------------
const CFG = window.TEST_APP_CONFIG || {};
const SCRIPT_URL = String(CFG.SCRIPT_URL || "");
const TOTAL_TIME_SECONDS = Number(CFG.TOTAL_TIME_SECONDS || 45 * 60);

// ---------------- STATE ----------------
let timeLeft = TOTAL_TIME_SECONDS;
let currentIndex = 0;
let responses = {};
let email = "";
let timerHandle = null;

// ---------------- HELPERS ----------------
const $ = (id) => document.getElementById(id);

function getQuestionBank() {
  return Array.isArray(window.QUESTION_BANK)
    ? window.QUESTION_BANK
    : [];
}

function showScreen(id) {
  ["screen-start", "screen-question", "screen-end"].forEach(s => {
    const el = document.getElementById(s);
    if (el) el.classList.add("hidden");
  });

  const active = document.getElementById(id);
  if (active) active.classList.remove("hidden");
}

// ---------------- STORAGE KEYS ----------------
const SS = {
  ACTIVE: "TEST_ACTIVE",
  TAB: "ACTIVE_TAB_ID"
};

// =====================================================
// 🔐 SECURITY
// =====================================================
function enableExamSecurity() {

  const TAB_ID = Date.now() + "_" + Math.random().toString(36).slice(2);

  sessionStorage.setItem(SS.ACTIVE, "1");
  sessionStorage.setItem(SS.TAB, TAB_ID);

  // 🔴 Banner
  const banner = document.createElement("div");
  banner.style.position = "fixed";
  banner.style.top = "0";
  banner.style.left = "0";
  banner.style.width = "100%";
  banner.style.background = "#d32f2f";
  banner.style.color = "white";
  banner.style.padding = "10px";
  banner.style.textAlign = "center";
  banner.style.fontSize = "14px";
  banner.style.fontWeight = "bold";
  banner.style.zIndex = "9999";
  banner.innerText =
    "⚠️ WARNING: Refreshing, leaving, or opening a new tab will automatically submit your test.";
  document.body.prepend(banner);
  document.body.style.paddingTop = "50px";

  // 🔒 Block refresh keys
  document.addEventListener("keydown", function (e) {
    if (sessionStorage.getItem(SS.ACTIVE) !== "1") return;

    if (
      e.key === "F5" ||
      (e.ctrlKey && e.key.toLowerCase() === "r") ||
      (e.metaKey && e.key.toLowerCase() === "r")
    ) {
      e.preventDefault();
      alert("Refreshing is blocked during the test.");
    }
  });

  // 🚫 Disable right click
  document.addEventListener("contextmenu", function (e) {
    if (sessionStorage.getItem(SS.ACTIVE) === "1") {
      e.preventDefault();
    }
  });

  // ⛔ Block back button
  history.pushState(null, "", location.href);
  window.addEventListener("popstate", function () {
    if (sessionStorage.getItem(SS.ACTIVE) === "1") {
      history.go(1);
    }
  });

  // ⚠️ Detect tab switch (single tab lock)
  setInterval(() => {
    if (sessionStorage.getItem(SS.ACTIVE) !== "1") return;

    if (sessionStorage.getItem(SS.TAB) !== TAB_ID) {
      document.body.innerHTML = `
        <div style="text-align:center;padding:80px;font-family:sans-serif">
          <h2 style="color:#d32f2f">Test Terminated</h2>
          <p>Multiple tabs detected.</p>
        </div>
      `;
      submitNow(true);
    }
  }, 1000);

  // Warn before unload
  window.addEventListener("beforeunload", function (e) {
    if (sessionStorage.getItem(SS.ACTIVE) === "1") {
      e.preventDefault();
      e.returnValue = "";
    }
  });
}

// =====================================================
// START TEST
// =====================================================
document.addEventListener("DOMContentLoaded", () => {

  $("btnNext").addEventListener("click", () => {

    const bank = getQuestionBank();

    if (!bank.length) return;

    if (!(bank[currentIndex] && responses[bank[currentIndex].key])) {
      alert("Please select an answer before proceeding.");
      return;
    }

    if (currentIndex < bank.length - 1) {
      currentIndex++;
      renderQuestion(currentIndex);
    } else {
      submitNow(false);
    }

  });

});

// =====================================================
// RENDER QUESTION
// =====================================================
function renderQuestion(i) {
  const bank = getQuestionBank();
  currentIndex = i;

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

  (q.options || []).forEach((opt) => {
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
$("btnNext").addEventListener("click", () => {
  const bank = getQuestionBank();

  if (currentIndex < bank.length - 1) {
    currentIndex++;
    renderQuestion(currentIndex);
  } else {
    submitNow(false);
  }
});

// =====================================================
// TIMER
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
// SUBMIT
// =====================================================
async function submitNow(forced = false) {

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
      }).toString()
    });
  } catch (e) {}

  sessionStorage.clear();

  document.body.innerHTML =
    `<div style="text-align:center;padding:80px;font-family:sans-serif">
       <h2>Submission Successful</h2>
     </div>`;
}
