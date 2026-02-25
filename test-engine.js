// ===== Test Engine – REFRESH PROTECTION WITH WARNING =====

const CFG = window.TEST_APP_CONFIG || {};
const SCRIPT_URL = String(CFG.SCRIPT_URL || "");
let timeLeft = Number(CFG.TOTAL_TIME_SECONDS || 45 * 60);
let tabViolations = 0;
let currentIndex = 0;
let responses = {};
let email = "";
const questionBank = Array.isArray(window.QUESTION_BANK) ? window.QUESTION_BANK : [];

const $ = (id) => document.getElementById(id);

// --- 1. DETECTION ON PAGE LOAD ---
(function checkIntegrity() {
    const isTesting = localStorage.getItem("IS_TESTING");
    if (isTesting === "true") {
        const savedEmail = localStorage.getItem("TEMP_EMAIL");
        const savedResp = localStorage.getItem("TEMP_RESPONSES");
        
        document.addEventListener("DOMContentLoaded", () => {
            document.body.innerHTML = `
                <div style="text-align:center; padding:50px; font-family:sans-serif;">
                    <h2 style="color:#c62828;">TEST TERMINATED</h2>
                    <p>A page refresh was detected. Your progress has been automatically submitted.</p>
                    <p>You cannot restart this test session.</p>
                </div>`;
            forceSubmit(savedEmail, savedResp);
        });
    }
})();

// --- 2. BROWSER REFRESH WARNING ---
// This triggers the "Leave site? Changes you made may not be saved" popup
window.onbeforeunload = function() {
    if (localStorage.getItem("IS_TESTING") === "true") {
        return "Warning: Refreshing the page will automatically submit your test and you won't be able to continue!";
    }
};

async function forceSubmit(vEmail, vResp) {
    try {
        await fetch(SCRIPT_URL, {
            method: "POST",
            mode: 'no-cors', 
            body: new URLSearchParams({
                action: "submit",
                email: vEmail || "unknown_refresh",
                responses: vResp || "{}",
                violations: localStorage.getItem("TEMP_VIOLATIONS") || "0",
                forced: "1"
            })
        });
    } catch (e) {}
    localStorage.removeItem("IS_TESTING"); 
}

function sync() {
    if (!email) return;
    localStorage.setItem("TEMP_EMAIL", email);
    localStorage.setItem("TEMP_RESPONSES", JSON.stringify(responses));
    localStorage.setItem("TEMP_VIOLATIONS", String(tabViolations));
}

// --- 3. START TEST ---
$("btnStart").onclick = () => {
    const mailVal = $("email").value.trim();
    if (!mailVal || !mailVal.includes("@")) return alert("Please enter a valid email address!");
    
    email = mailVal;
    localStorage.setItem("IS_TESTING", "true");
    sync();
    
    showScreen("screen-question");
    renderQuestion(0);
    startTimer();
};

// --- 4. RENDER QUESTION ---
function renderQuestion(i) {
    currentIndex = i;
    const q = questionBank[i];
    if (!q) return;

    $("qText").innerHTML = `<div style="margin-bottom:8px; opacity:.7;">Question ${i+1}</div><div>${q.text}</div>`;
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
            sync(); // Save choice immediately
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
    localStorage.removeItem("IS_TESTING"); 
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
        alert("Connection error. Please try again.");
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

// Tab Switching detection
window.onblur = () => {
    if(localStorage.getItem("IS_TESTING") === "true"){
        tabViolations++;
        sync();
        updateHUD();
    }
};
