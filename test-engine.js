// ===== Test Engine (Worldpanel – Blue Theme) =====

// --- Config
const CFG = window.TEST_APP_CONFIG || {};
const TOTAL_TIME_SECONDS = Number(CFG.TOTAL_TIME_SECONDS || 45 * 60);
const SCRIPT_URL = String(CFG.SCRIPT_URL || "");
const ENABLE_GRAPH_PLACEHOLDERS = !!CFG.ENABLE_GRAPH_PLACEHOLDERS;

// --- State
let timeLeft = TOTAL_TIME_SECONDS;
let tabViolations = 0;
let currentIndex = 0;
// --- Detect hard reloads and auto-submit if a test is active
(function detectReloadAndForceSubmit(){
  try {
    const isActive = localStorage.getItem("TEST_ACTIVE") === "1";
    if (!isActive) return;

    // Navigation Timing API v2 (modern)
    const navEntry = performance.getEntriesByType?.("navigation")?.[0];
    const isReloadV2 = navEntry && navEntry.type === "reload";

    // Fallback (older browsers)
    const isReloadV1 = typeof performance.navigation !== "undefined"
      && performance.navigation.type === 1;

    if (isReloadV2 || isReloadV1) {
      // Clear any stale pending flag to avoid loops and force submit now
      localStorage.removeItem("PENDING_FORCED_SUBMIT");
      submitNow(true); // forced refresh-submit
    }
  } catch (_) {
    // No-op: if anything fails, we prefer not to block the candidate
  }
})();
// Nếu user confirm leaving thì sẽ auto-submit,
// auto-submit immediately on the next load.
if (localStorage.getItem("TEST_ACTIVE") === "1" &&
    localStorage.getItem("PENDING_FORCED_SUBMIT") === "1") {
  localStorage.removeItem("PENDING_FORCED_SUBMIT"); // avoid loops
  submitNow(true); // forced refresh-submit
}
const responses = {};   // skipped => key undefined
let email = "";
const questionBank = (Array.isArray(window.QUESTION_BANK) ? window.QUESTION_BANK : []);

// --- Helpers
const $ = (id) => document.getElementById(id);
function fmtTime(s){ const m=Math.floor(s/60), t=s%60; return `${m}:${t<10?'0':''}${t}`; }
function showScreen(idToShow){
  ["screen-start","screen-question","screen-end"].forEach(id => $(id).classList.toggle("hidden", id !== idToShow));
}
function updateHUD(){
  const total = questionBank.length;
  const humanIndex = Math.min(currentIndex + 1, total);
  const pct = Math.round((humanIndex - 1) / total * 100);
  $("qIndex").textContent = humanIndex;
  $("qTotal").textContent = total;
  $("qPercent").textContent = `${pct}%`;
  $("progressBar").style.width = `${pct}%`;
  $("violations").textContent = tabViolations;
}
function renderQuestion(i){
  const q = questionBank[i];
$("qText").innerHTML = `<div style="margin-bottom:8px; opacity:.7;">Question ${i+1}</div><div>${q.text}</div>`;  $("qExtra").innerHTML = q.extraHTML || "";
  const wrap = $("qOptions"); wrap.innerHTML = "";
  (q.options || []).forEach(opt=>{
    const id = `opt_${q.key}_${opt.value}`;
    const lbl = document.createElement("label");
    lbl.className = "option";
    lbl.htmlFor = id;
    lbl.innerHTML = `<input type="radio" id="${id}" name="${q.key}" value="${opt.value}" ${responses[q.key]===opt.value?'checked':''}/> ${opt.label}`;
    wrap.appendChild(lbl);
  });
  $("btnNext").textContent = (i === questionBank.length - 1) ? "Submit Test" : "Next";
  updateHUD();
}
// --- Refresh Guard: warn before leaving; mark a flag if they actually leave.
function enableRefreshGuard() {
  // 1) Show the standard browser warning when the test is active
  const beforeUnloadHandler = (e) => {
    if (localStorage.getItem("TEST_ACTIVE") === "1") {
      e.preventDefault();
      // Most browsers ignore custom strings, but this line is still required
      e.returnValue = "Warning: The test will auto-submit if you reload or close this tab.";
      return e.returnValue;
    }
  };
  window.addEventListener("beforeunload", beforeUnloadHandler);

  // 2) When the page is actually being hidden/unloaded (user confirmed leave),
  // mark a flag so we auto-submit on the next load.
  window.addEventListener("pagehide", () => {
    if (localStorage.getItem("TEST_ACTIVE") === "1") {
      localStorage.setItem("PENDING_FORCED_SUBMIT", "1");
    }
  });
}
// --- Timer
let timerHandle = null;
function startTimer(){
  $("timer").textContent = fmtTime(timeLeft);
  timerHandle = setInterval(()=>{
    $("timer").textContent = fmtTime(timeLeft);
    if (timeLeft <= 0) { clearInterval(timerHandle); autoSubmit(); }
    timeLeft--;
  }, 1000);
}

// --- Anti-cheat
['copy','paste','cut','contextmenu','selectstart'].forEach(evt =>
  document.addEventListener(evt, e => e.preventDefault())
);
document.addEventListener("visibilitychange", ()=>{
  if (document.hidden) {
    tabViolations++;
    alert("⚠️ Warning: Leaving the test tab is recorded. Violation: " + tabViolations);
    $("violations").textContent = tabViolations;
  }
});
history.pushState(null,"",location.href);
window.onpopstate = ()=>history.go(1);
window.addEventListener("beforeprint",(e)=>{
  $("print-blocker").classList.remove("hidden");
  alert("Printing is disabled for this assessment.");
  e.preventDefault?.();
});
document.addEventListener("keydown",(e)=>{
  if ((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='p'){ e.preventDefault(); alert("Printing is disabled for this assessment."); }
  if (e.key === "PrintScreen"){
    e.preventDefault?.();
    navigator.clipboard?.writeText && navigator.clipboard.writeText("Screenshots are disabled by assessment policy.");
    alert("Screenshot attempts are not allowed.");
  }
});

// --- Start (Skip enabled)
$("btnStart").addEventListener("click", ()=>{
  const val = $("email").value.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(val)) { $("startMsg").innerHTML = `<span class="danger">Enter a valid email to continue.</span>`; return; }
  if (!SCRIPT_URL || !/^https?:\/\/script\.google\.com\//.test(SCRIPT_URL)) {
    $("startMsg").innerHTML = `<span class="danger">SCRIPT_URL is missing or invalid. Set it in index.html.</span>`;
    return;
  }
  email = val;
  // +++ Session lock: mark test as active
  localStorage.setItem("TEST_ACTIVE", "1");
  localStorage.setItem("SESSION_START", String(Date.now()));
  localStorage.removeItem("PENDING_FORCED_SUBMIT"); // clear if any
  // +++ Enable browser refresh/leave warning
  enableRefreshGuard();
  timeLeft = TOTAL_TIME_SECONDS;
  startTimer();
  showScreen("screen-question");
  renderQuestion(currentIndex);
});

// --- Next / Submit (skip allowed)
$("btnNext").addEventListener("click", ()=>{
  const q = questionBank[currentIndex];
  const chosen = document.querySelector(`input[name="${q.key}"]:checked`);
  if (chosen) { responses[q.key] = chosen.value; } // if skipped, leave undefined
  if (currentIndex < questionBank.length - 1) {
    currentIndex++;
    renderQuestion(currentIndex);
    window.scrollTo({top:0,behavior:"smooth"});
  } else {
    submitNow();
  }
});

// --- Submit function (supports forced auto-submit on refresh)
async function submitNow(forceSubmit = false){
  showScreen("screen-end");
  try{
    const payload = new URLSearchParams({
      action: "submit",
      email,
      violations: String(tabViolations),
      timeRemainingSec: String(Math.max(0, timeLeft)),
      responses: JSON.stringify(responses),
      forced: forceSubmit ? "1" : "0"   // tell backend it's a refresh-forced submission
    });

    const res = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: {"Content-Type":"application/x-www-form-urlencoded;charset=UTF-8"},
      body: payload.toString()
    });

    const data = await res.json().catch(()=>({ok:false,error:"Invalid JSON from server"}));
    if (!data || data.ok !== true) {
      alert("Submission error: " + (data && data.error ? data.error : "Unknown"));
      showScreen("screen-question");
      return;
    }

    alert(`Submission successful. Attempt #${data.attempt || 1}`);
    document.body.innerHTML = `
### Submitted

This session has ended. You may now close this tab.
`;
  }catch(e){
    alert("Error submitting. Please verify your Google Apps Script deployment.");
    showScreen("screen-question");
  } finally {
    // --- Clear session state no matter what
    localStorage.removeItem("TEST_ACTIVE");
    localStorage.removeItem("SESSION_START");
    localStorage.removeItem("PENDING_FORCED_SUBMIT");
  }
}
function autoSubmit(){ submitNow(); }

// --- Bootstrap totals
$("qTotal").textContent = questionBank.length || 0;
updateHUD();
