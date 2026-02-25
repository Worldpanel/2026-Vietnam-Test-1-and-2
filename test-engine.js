// ===== Worldpanel Test Engine - Final Secure Version =====

const CFG = window.TEST_APP_CONFIG || {};
const SCRIPT_URL = String(CFG.SCRIPT_URL || "");
let timeLeft = Number(CFG.TOTAL_TIME_SECONDS || 45 * 60);
let tabViolations = 0;
let currentIndex = 0;
let responses = {};
let email = "";
const questionBank = Array.isArray(window.QUESTION_BANK) ? window.QUESTION_BANK : [];

const $ = (id) => document.getElementById(id);

// --- 1. IMMEDIATE LOCKDOWN CHECK ---
// We check this even before the DOM is fully ready to prevent any "cheating"
(function preCheck() {
    if (localStorage.getItem("IS_TESTING") === "true") {
        const savedEmail = localStorage.getItem("TEMP_EMAIL");
        const savedResp = localStorage.getItem("TEMP_RESPONSES");
        
        // Block the UI immediately
        window.stop(); // Stop further loading
        document.documentElement.innerHTML = `
            <body style="font-family:sans-serif; text-align:center; padding-top:100px; background:#f4f4f4;">
                <div style="background:white; display:inline-block; padding:40px; border-radius:10px; shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h1 style="color:#d32f2f;">TEST TERMINATED</h1>
                    <p style="font-size:18px;">A page refresh or navigation was detected.</p>
                    <p>Your progress has been submitted and this session is now locked.</p>
                </div>
            </body>`;
        
        forceSubmit(savedEmail, savedResp);
    }
})();

// --- 2. BROWSER WARNING (The "Are you sure?" Popup) ---
window.addEventListener('beforeunload', (event) => {
    if (localStorage.getItem("IS_TESTING") === "true") {
        // Standard way to trigger the browser's built-in warning
        event.preventDefault();
        event.returnValue = ''; 
    }
});

// --- 3. AUTO-SUBMIT ON RELOAD ---
async function forceSubmit(vEmail, vResp) {
    try {
        await fetch(SCRIPT_URL, {
            method: "POST",
            mode: 'no-cors', 
            body: new URLSearchParams({
                action: "submit",
                email: vEmail || "refresh_user",
                responses: vResp || "{}",
                violations: localStorage.getItem("TEMP_VIOLATIONS") || "0",
                forced: "1"
            })
        });
    } catch (e) {}
    localStorage.removeItem("IS_TESTING");
}

// --- 4. DATA SYNC ---
function sync() {
    if (!email) return;
    localStorage.setItem("TEMP_EMAIL", email);
    localStorage.setItem("TEMP_RESPONSES", JSON.stringify(responses));
    localStorage.setItem("TEMP_VIOLATIONS", String(tabViolations));
}

// --- 5. CORE ENGINE FUNCTIONS ---
$("btnStart").onclick = () => {
    const mailVal = $("email").value.trim();
    if (!mailVal || !mailVal.includes("@")) return alert("Please enter a valid email!");

    email = mailVal;
    localStorage.setItem("IS_TESTING", "true");
    sync();

    showScreen("screen-question");
    renderQuestion(0);
    startTimer();
};

function renderQuestion(i) {
    currentIndex = i;
    const q = questionBank[i];
    if (!q) return;

    // Fixed Description format (from previous step)
    $("qText").innerHTML = `<div style="margin-bottom:8px; opacity:.7; font-weight:bold;">Question ${i+1}</div><div>${q.text}</div>`;
    $("qExtra").innerHTML = q.extraHTML || "";

    const wrap = $("qOptions"); 
    wrap.innerHTML = "";
    (q.options || []).forEach(opt => {
        const id = `opt_${q.key}_${opt.value}`;
        const lbl = document.createElement("label");
        lbl.className = "option";
        lbl.innerHTML = `<input type="radio" id="${id}" name="${q.key}" value="${opt.value}" ${responses[q.key]===opt.value?'checked':''}/> ${opt.label}`;
        
        lbl.onclick = () => {
            responses[q.key] = opt.value;
            sync(); // Save immediately on click
        };
        wrap.appendChild(lbl);
    });

    $("btnNext").textContent = (i === questionBank.length - 1) ? "Submit Test" : "Next";
    updateHUD();
}

function startTimer() {
    const timerInterval = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            $("timer").textContent = Math.floor(timeLeft/60) + ":" + (timeLeft%60).toString().padStart(2,'0');
        } else {
            clearInterval(timerInterval);
            submitNow();
        }
    }, 1000);
}

$("btnNext").onclick = () => {
    if (currentIndex < questionBank.length - 1) {
        currentIndex++;
        renderQuestion(currentIndex);
        window.scrollTo(0,0);
    } else {
        submitNow();
    }
};

async function submitNow() {
    localStorage.removeItem("IS_TESTING"); // Normal exit
    showScreen("screen-end");
    
    const payload = new URLSearchParams({
        action: "submit",
        email: email,
        responses: JSON.stringify(responses),
        violations: String(tabViolations)
    });

    try {
        await fetch(SCRIPT_URL, { method: "POST", body: payload });
        localStorage.clear();
        alert("Test submitted successfully!");
        location.reload();
    } catch (e) {
        alert("Submission failed. Check your internet.");
        showScreen("screen-question");
    }
}

function showScreen(id){
    ["screen-start","screen-question","screen-end"].forEach(s => $(s).classList.toggle("hidden", s !== id));
}

function updateHUD(){
    $("qIndex").textContent = currentIndex + 1;
    $("qTotal").textContent = questionBank.length;
    $("violations").textContent = tabViolations;
}

// Tab/Window Blur detection
window.onblur = () => {
    if(localStorage.getItem("IS_TESTING") === "true"){
        tabViolations++;
        sync();
        updateHUD();
    }
};
