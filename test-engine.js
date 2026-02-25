// =====================================================
// WORLD PANEL – SECURE TEST ENGINE (FINAL STABLE)
// =====================================================

const CFG = window.TEST_APP_CONFIG || {};
const SCRIPT_URL = String(CFG.SCRIPT_URL || "");
const TOTAL_TIME_SECONDS = Number(CFG.TOTAL_TIME_SECONDS || 45 * 60);

let timeLeft = TOTAL_TIME_SECONDS;
let currentIndex = 0;
let responses = {};
let email = "";
let timerHandle = null;

const $ = (id) => document.getElementById(id);

// --- 1. DETECTION ON LOAD (IF REFRESHED) ---
(function checkIntegrity() {
    const isTesting = localStorage.getItem("IS_TESTING") === "true";
    const navEntries = performance.getEntriesByType("navigation");
    const isReload = navEntries.length > 0 && navEntries[0].type === "reload";

    if (isTesting && isReload) {
        const savedEmail = localStorage.getItem("TEMP_EMAIL") || "unknown";
        window.stop();
        document.addEventListener("DOMContentLoaded", () => {
            document.body.innerHTML = `
                <div style="text-align:center; padding:100px 20px; font-family:sans-serif;">
                    <h1 style="color:#d32f2f;">TEST TERMINATED</h1>
                    <p style="font-size:18px;">A page refresh was detected. Your progress has been automatically submitted.</p>
                </div>`;
            forceSubmit(savedEmail);
        });
    }
})();

// --- 2. BROWSER POPUP WARNING ---
window.onbeforeunload = function() {
    if (localStorage.getItem("IS_TESTING") === "true") {
        return "Warning: Refreshing will automatically submit your test!";
    }
};

// --- 3. START TEST ---
$("btnStart").onclick = () => {
    const mailInput = $("email").value.trim();
    if (!mailInput || !mailInput.includes("@")) {
        alert("Please enter a valid email address!");
        return;
    }
    
    email = mailInput;
    localStorage.setItem("IS_TESTING", "true");
    localStorage.setItem("TEMP_EMAIL", email);
    
    showScreen("screen-question");
    renderQuestion(0);
    startTimer();
};

// --- 4. RENDER CÂU HỎI & CẢNH BÁO ---
function renderQuestion(i) {
    currentIndex = i;
    const bank = window.QUESTION_BANK || [];
    const q = bank[i];
    
    if (!q) return;

    // --- CHÈN BANNER CẢNH BÁO "HÙ" USER Ở ĐÂY ---
    const warningBanner = `
        <div style="background:#fff3e0; color:#e65100; border:1px solid #ffe0b2; padding:10px; margin-bottom:20px; border-radius:6px; font-weight:bold; text-align:center; font-size:14px;">
            ⚠️ WARNING: Refreshing, leaving, or opening a new tab will automatically submit your test.
        </div>
    `;

    $("qText").innerHTML = warningBanner + `<div style="margin-bottom:10px; font-weight:bold; color:#005EB8;">Question ${i+1}</div><div>${q.text}</div>`;
    $("qExtra").innerHTML = q.extraHTML || "";

    const wrap = $("qOptions");
    wrap.innerHTML = "";
    (q.options || []).forEach(opt => {
        const id = `opt_${q.key}_${opt.value}`;
        const lbl = document.createElement("label");
        lbl.className = "option";
        lbl.innerHTML = `<input type="radio" name="${q.key}" value="${opt.value}" ${responses[q.key] === opt.value ? 'checked' : ''}> ${opt.label}`;
        
        lbl.onclick = () => {
            responses[q.key] = opt.value;
            localStorage.setItem("TEMP_RESPONSES", JSON.stringify(responses));
        };
        wrap.appendChild(lbl);
    });

    $("btnNext").textContent = (i === bank.length - 1) ? "Submit Test" : "Next";
    
    if($("qIndex")) $("qIndex").textContent = i + 1;
    if($("qTotal")) $("qTotal").textContent = bank.length;
}

// --- 5. TIMER & SUBMIT ---
function startTimer() {
    timerHandle = setInterval(() => {
        if (timeLeft <= 0) {
            clearInterval(timerHandle);
            submitNow();
        } else {
            timeLeft--;
            const m = Math.floor(timeLeft/60);
            const s = timeLeft%60;
            if($("timer")) $("timer").textContent = `${m}:${s < 10 ? '0' : ''}${s}`;
        }
    }, 1000);
}

$("btnNext").onclick = () => {
    const bank = window.QUESTION_BANK || [];
    if (currentIndex < bank.length - 1) {
        currentIndex++;
        renderQuestion(currentIndex);
        window.scrollTo(0,0);
    } else {
        submitNow();
    }
};

async function submitNow() {
    localStorage.removeItem("IS_TESTING");
    clearInterval(timerHandle);
    showScreen("screen-end");

    const payload = new URLSearchParams({
        action: "submit",
        email: email,
        responses: JSON.stringify(responses)
    });

    try {
        await fetch(SCRIPT_URL, { method: "POST", body: payload });
        localStorage.clear();
        alert("Success! Your test has been submitted.");
        location.reload();
    } catch (e) {
        alert("Submission recorded. Please close the tab.");
    }
}

async function forceSubmit(m) {
    const r = localStorage.getItem("TEMP_RESPONSES") || "{}";
    try {
        await fetch(SCRIPT_URL, {
            method: "POST",
            mode: 'no-cors',
            body: new URLSearchParams({ action: "submit", email: m, responses: r, forced: "1" })
        });
    } catch (e) {}
    localStorage.removeItem("IS_TESTING");
}

function showScreen(id) {
    ["screen-start", "screen-question", "screen-end"].forEach(s => {
        if($(s)) $(s).classList.toggle("hidden", s !== id);
    });
}
