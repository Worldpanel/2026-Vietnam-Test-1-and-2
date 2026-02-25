// =====================================================
// WORLD PANEL – SIMPLE STABLE ENGINE
// (Uses global `questions` variable directly)
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

// =====================================================
// START TEST
// =====================================================
document.addEventListener("DOMContentLoaded", () => {
    const isTesting = localStorage.getItem("IS_TESTING") === "true";
    const navEntries = performance.getEntriesByType("navigation");
    const isReload = navEntries.length > 0 && navEntries[0].type === "reload";

    if (isTesting && isReload) {
        forceSubmit(localStorage.getItem("TEMP_EMAIL") || "unknown");
        document.body.innerHTML = `
            <div style="text-align:center;padding:100px;font-family:sans-serif">
                <h1 style="color:#d32f2f">TEST TERMINATED</h1>
                <p>Refresh detected. Submission sent.</p>
            </div>
        `;
    }
});
  $("btnStart").onclick = () => {

    if (typeof questions === "undefined" || !questions.length) {
      alert("Question bank not loaded.");
      return;
    }

    const val = $("email").value.trim();
    if (!val || !val.includes("@")) {
      alert("Please enter a valid email.");
      return;
    }

    email = val;
    examStarted = true;

    showScreen("screen-question");
    renderQuestion(0);
    startTimer();
  };

  $("btnNext").onclick = () => {

    if (!examStarted) return;

    const bank = questions;

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

  const bank = questions;
  const q = bank[i];
  if (!q) return;

  currentIndex = i;

  $("qIndex").textContent = i + 1;
  $("qTotal").textContent = bank.length;

  const percent = Math.round(((i + 1) / bank.length) * 100);
  $("qPercent").textContent = percent + "%";
  $("progressBar").style.width = percent + "%";

  const warningBanner = `
    <div style="background:#fff3e0;color:#e65100;border:1px solid #ffe0b2;
    padding:10px;margin-bottom:20px;border-radius:6px;font-weight:bold;text-align:center;">
      ⚠️ WARNING: Refreshing, leaving, or opening a new tab will automatically submit your test.
    </div>
  `;

  $("qText").innerHTML =
    warningBanner +
    `<div style="margin-bottom:10px;font-weight:bold;color:#005EB8;">
      Question ${i + 1}
     </div>
     <div>${q.text}</div>`;

  $("qExtra").innerHTML = q.extraHTML || "";

  const wrap = $("qOptions");
  wrap.innerHTML = "";

  q.options.forEach(opt => {

    const lbl = document.createElement("label");
    lbl.className = "option";

    lbl.innerHTML =
      `<input type="radio" name="${q.key}" value="${opt.value}"
        ${responses[q.key] === opt.value ? "checked" : ""}>
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
// TIMER
// =====================================================
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
        responses: JSON.stringify(responses)
      })
    });
  } catch (e) {}

  setTimeout(() => {
    document.body.innerHTML =
      `<div style="text-align:center;padding:80px;font-family:sans-serif">
         <h2>Submission Successful</h2>
       </div>`;
  }, 1000);
}

// =====================================================
// SCREEN SWITCH
// =====================================================
function showScreen(id) {
  ["screen-start", "screen-question", "screen-end"].forEach(s => {
    if ($(s)) $(s).classList.toggle("hidden", s !== id);
  });
}
