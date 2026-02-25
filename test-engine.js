// =====================================================
// WORLD PANEL – STRICT SECURE TEST ENGINE (2026)
// Banner + Refresh Block + Single Tab Lock
// =====================================================

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

// ---------------- STORAGE KEYS ----------------
const LS = {
  ACTIVE: "TEST_ACTIVE",
  TAB: "ACTIVE_TAB_ID",
  LEAVING: "PAGE_LEAVING",
  EMAIL: "SAVED_EMAIL",
  RESP: "SAVED_RESPONSES",
  VIOL: "SAVED_VIOLATIONS"
};

// =====================================================
// 🔥 RELOAD DETECTION (AUTO SUBMIT)
// =====================================================
(function detectReload() {
  const active = localStorage.getItem(LS.ACTIVE) === "1";
  const leaving = localStorage.getItem(LS.LEAVING) === "1";

  if (active && leaving) {
    document.addEventListener("DOMContentLoaded", async () => {
      document.body.innerHTML = `
        <div style="text-align:center;padding:80px;font-family:sans-serif">
          <h2 style="color:#d32f2f">Test Auto-Submitted</h2>
          <p>A refresh or navigation was detected.</p>
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
            email: localStorage.getItem(LS.EMAIL) || "refresh_user",
            responses: localStorage.getItem(LS.RESP) || "{}",
            violations: localStorage.getItem(LS.VIOL) || "0",
            forced: "1"
          }).toString()
        });
      } catch (e) {}

      localStorage.clear();
    });
  }

  localStorage.removeItem(LS.LEAVING);
})();

// =====================================================
// 🔐 ENABLE STRICT SECURITY
// =====================================================
function enableExamSecurity() {

  const TAB_ID = Date.now() + "_" + Math.random().toString(36).slice(2);

  localStorage.setItem(LS.ACTIVE, "1");
  localStorage.setItem(LS.TAB, TAB_ID);

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
    if (localStorage.getItem(LS.ACTIVE) !== "1") return;

    if (
      e.key === "F5" ||
      (e.ctrlKey && e.key.toLowerCase() === "r") ||
      (e.metaKey && e.key.toLowerCase() === "r")
    ) {
      e.preventDefault();
      alert("Refreshing is blocked. Your test will be auto-submitted.");
    }
  });

  // 🚫 Disable right click
  document.addEventListener("contextmenu", function (e) {
    if (localStorage.getItem(LS.ACTIVE) === "1") {
      e.preventDefault();
    }
  });

  // ⛔ Block back button
  history.pushState(null, "", location.href);
  window.addEventListener("popstate", function () {
    if (localStorage.getItem(LS.ACTIVE) === "1") {
      history.go(1);
    }
  });

  // 📱 Disable pull-to-refresh
  document.body.style.overscrollBehavior = "none";

  // ⚠️ Before unload warning
  window.addEventListener("beforeunload", function (e) {
    if (localStorage.getItem(LS.ACTIVE) === "1") {
      localStorage.setItem(LS.LEAVING, "1");
      e.preventDefault();
      e.returnValue = "";
    }
  });

  // 🔐 Single Tab Lock
  setInterval(() => {
    if (localStorage.getItem(LS.ACTIVE) !== "1") return;

    const activeTab = localStorage.getItem(LS.TAB);

    if (activeTab !== TAB_ID) {
      document.body.innerHTML = `
        <div style="text-align:center;padding:80px;font-family:sans-serif">
          <h2 style="color:#d32f2f">Test Terminated</h2>
          <p>Multiple tabs detected.</p>
        </div>
      `;

      submitNow(true);
      localStorage.clear();
    }
  }, 1000);
}

// =====================================================
// SESSION SAVE
// =====================================================
function persistSession() {
  if (!email) return;
  localStorage.setItem(LS.EMAIL, email);
  localStorage.setItem(LS.RESP, JSON.stringify(responses));
  localStorage.setItem(LS.VIOL, String(tabViolations));
}

// =====================================================
// START TEST
// =====================================================
$("btnStart").addEventListener("click", () => {
  const val = $("email").value.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(val)) {
    alert("Please enter a valid email.");
    return;
  }

  email = val;
  enableExamSecurity();   // 🔥 activate security
  persistSession();

  showScreen("screen-question");
  renderQuestion(0);
  startTimer();
});

// =====================================================
function renderQuestion(i) {
  currentIndex = i;
  const q = questionBank[i];
  if (!q) return;

  $("qText").innerHTML =
    `<div style="opacity:.7;margin-bottom:6px">Question ${i + 1}</div>
     <div>${q.text}</div>`;

  $("qExtra").innerHTML = q.extraHTML || "";
  const wrap = $("qOptions");
  wrap.innerHTML = "";

  (q.options || []).forEach((opt) => {
    const lbl = document.createElement("label");
    lbl.className = "option";
    lbl.innerHTML = `
      <input type="radio" name="${q.key}" value="${opt.value}">
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
}

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

$("btnNext").addEventListener("click", () => {
  if (currentIndex < questionBank.length - 1) {
    currentIndex++;
    renderQuestion(currentIndex);
  } else {
    submitNow(false);
  }
});

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
        violations: String(tabViolations),
        forced: forced ? "1" : "0"
      }).toString()
    });

    document.body.innerHTML = `
      <div style="text-align:center;padding:80px;font-family:sans-serif">
        <h2>Submission Successful</h2>
        <p>This session has ended.</p>
      </div>
    `;
  } catch (e) {
    alert("Network error during submission.");
  } finally {
    localStorage.clear();
  }
}
