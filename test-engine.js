// ===== Test Engine – CHẶN REFRESH & LƯU TIẾN TRÌNH TUYỆT ĐỐI =====

const CFG = window.TEST_APP_CONFIG || {};
const SCRIPT_URL = String(CFG.SCRIPT_URL || "");
let timeLeft = Number(CFG.TOTAL_TIME_SECONDS || 45 * 60);
let tabViolations = 0;
let currentIndex = 0;
let responses = {};
let email = "";
const questionBank = Array.isArray(window.QUESTION_BANK) ? window.QUESTION_BANK : [];

const $ = (id) => document.getElementById(id);

// --- 1. CHẶN NGAY TỪ CỬA NGÕ (VỪA LOAD TRANG) ---
(function checkViolationOnLoad() {
    const isTesting = localStorage.getItem("IS_TESTING");
    if (isTesting === "true") {
        // Nếu refresh, email và đáp án vẫn còn trong LocalStorage
        const savedEmail = localStorage.getItem("TEMP_EMAIL");
        const savedResp = localStorage.getItem("TEMP_RESPONSES");
        
        // Hiện thông báo và khóa màn hình luôn
        document.addEventListener("DOMContentLoaded", () => {
            document.body.innerHTML = `
                <div style="text-align:center; padding:50px; font-family:sans-serif;">
                    <h2 style="color:red;">PHÁT HIỆN VI PHẠM: REFRESH TRANG</h2>
                    <p>Hệ thống đang tự động nộp bài làm của bạn...</p>
                </div>`;
            
            // Ép nộp dữ liệu cũ lên Google Sheets
            forceSubmit(savedEmail, savedResp);
        });
    }
})();

// --- 2. HÀM ÉP NỘP BÀI KHI REFRESH ---
async function forceSubmit(vEmail, vResp) {
    try {
        await fetch(SCRIPT_URL, {
            method: "POST",
            mode: 'no-cors', // Dùng no-cors để đi xuyên qua mọi lỗi mạng/cors lúc này
            body: new URLSearchParams({
                action: "submit",
                email: vEmail || "unknown_refresh",
                responses: vResp || "{}",
                violations: localStorage.getItem("TEMP_VIOLATIONS") || "0",
                forced: "1"
            })
        });
    } catch (e) {}
    localStorage.clear(); // Xóa sạch để không bị lặp
}

// --- 3. ĐỒNG BỘ DỮ LIỆU LIÊN TỤC ---
function sync() {
    if (!email) return;
    localStorage.setItem("TEMP_EMAIL", email);
    localStorage.setItem("TEMP_RESPONSES", JSON.stringify(responses));
    localStorage.setItem("TEMP_VIOLATIONS", String(tabViolations));
}

// --- 4. LOGIC START TEST ---
$("btnStart").onclick = () => {
    const mailVal = $("email").value.trim();
    if (!mailVal || !mailVal.includes("@")) return alert("Vui lòng nhập Email chính xác!");
    
    email = mailVal;
    localStorage.setItem("IS_TESTING", "true"); // Cắm cờ bắt đầu
    sync();
    
    showScreen("screen-question");
    renderQuestion(0);
    startTimer();
};

// --- 5. RENDER CÂU HỎI (CÓ LƯU ĐÁP ÁN NGAY) ---
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
        
        // Khi chọn đáp án là lưu ngay vào LocalStorage
        lbl.onclick = () => {
            responses[q.key] = opt.value;
            sync();
        };
        wrap.appendChild(lbl);
    });
    
    $("btnNext").textContent = (i === questionBank.length - 1) ? "Submit Test" : "Next";
    updateHUD();
}

// --- 6. CÁC HÀM CÒN LẠI ---
function startTimer() {
    setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            $("timer").textContent = Math.floor(timeLeft/60) + ":" + (timeLeft%60).toString().padStart(2,'0');
        } else {
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
    localStorage.removeItem("IS_TESTING"); // Gỡ cờ vi phạm vì nộp tự nguyện
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
        alert("Nộp bài thành công!");
        location.reload();
    } catch (e) {
        alert("Lỗi kết nối, vui lòng thử lại!");
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

// Chặn chuyển tab
window.onblur = () => {
    if(localStorage.getItem("IS_TESTING") === "true"){
        tabViolations++;
        sync();
        updateHUD();
    }
};
