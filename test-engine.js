// ===== Test Engine – CHẶN REFRESH TUYỆT ĐỐI =====

const CFG = window.TEST_APP_CONFIG || {};
const SCRIPT_URL = String(CFG.SCRIPT_URL || "");

let timeLeft = Number(CFG.TOTAL_TIME_SECONDS || 45 * 60);
let tabViolations = 0;
let currentIndex = 0;
let responses = {};
let email = "";
const questionBank = Array.isArray(window.QUESTION_BANK) ? window.QUESTION_BANK : [];

const $ = (id) => document.getElementById(id);

// --- 1. KIỂM TRA NGAY KHI VỪA MỞ TRANG ---
(function checkIntegrity() {
    const isActive = localStorage.getItem("IS_TESTING");
    if (isActive === "true") {
        // Nếu thấy cờ này, nghĩa là họ vừa refresh. Ép nộp bài ngay!
        window.addEventListener('load', () => {
            alert("PHÁT HIỆN REFRESH: Hệ thống sẽ tự động nộp bài thi của bạn ngay bây giờ!");
            autoSubmitOnViolation();
        });
    }
})();

// --- 2. HÀM TỰ ĐỘNG NỘP KHI VI PHẠM ---
async function autoSubmitOnViolation() {
    // Lấy dữ liệu cuối cùng đã lưu trong máy
    const savedEmail = localStorage.getItem("TEMP_EMAIL") || "unknown_refresh";
    const savedResponses = localStorage.getItem("TEMP_RESPONSES") || "{}";
    const savedViolations = localStorage.getItem("TEMP_VIOLATIONS") || "0";

    showScreen("screen-end");
    localStorage.removeItem("IS_TESTING"); // Xóa cờ để không bị lặp vô tận

    try {
        await fetch(SCRIPT_URL, {
            method: "POST",
            mode: 'no-cors', // Dùng no-cors để đảm bảo gửi đi nhanh nhất
            body: new URLSearchParams({
                action: "submit",
                email: savedEmail,
                responses: savedResponses,
                violations: savedViolations,
                forced: "1"
            })
        });
        alert("Đã tự động nộp bài do Refresh trang.");
    } catch (e) { console.error(e); }
    
    // Sau khi nộp xong, xóa sạch và khóa luôn
    localStorage.clear();
    document.body.innerHTML = "<h2 style='padding:50px; text-align:center;'>Bài thi đã kết thúc do bạn vi phạm quy định (Refresh trang).</h2>";
}

// --- 3. LƯU DỮ LIỆU LIÊN TỤC (SYNC) ---
function syncData() {
    if (!email) return;
    localStorage.setItem("TEMP_EMAIL", email);
    localStorage.setItem("TEMP_RESPONSES", JSON.stringify(responses));
    localStorage.setItem("TEMP_VIOLATIONS", String(tabViolations));
}

// --- Các hàm logic cũ (giữ lại và thêm syncData) ---
function renderQuestion(i){
    const q = questionBank[i];
    if(!q) return;
    $("qText").innerHTML = `<div style="margin-bottom:8px; opacity:.7;">Question ${i+1}</div><div>${q.text}</div>`;
    $("qExtra").innerHTML = q.extraHTML || "";
    
    const wrap = $("qOptions"); wrap.innerHTML = "";
    (q.options || []).forEach(opt => {
        const lbl = document.createElement("label");
        lbl.className = "option";
        lbl.innerHTML = `<input type="radio" name="${q.key}" value="${opt.value}" ${responses[q.key]===opt.value?'checked':''}/> ${opt.label}`;
        lbl.onclick = () => { 
            responses[q.key] = opt.value; 
            syncData(); // Lưu đáp án ngay khi vừa tích
        };
        wrap.appendChild(lbl);
    });
    updateHUD();
}

$("btnStart").onclick = () => {
    const val = $("email").value.trim();
    if(!val || !val.includes("@")) return alert("Nhập email đúng định dạng!");
    email = val;
    
    // BẮT ĐẦU TÍNH LÀ ĐANG LÀM BÀI
    localStorage.setItem("IS_TESTING", "true");
    syncData();
    
    showScreen("screen-question");
    renderQuestion(0);
    startTimer();
};

function startTimer(){
    setInterval(() => {
        if(timeLeft > 0) {
            timeLeft--;
            $("timer").textContent = Math.floor(timeLeft/60) + ":" + (timeLeft%60).toString().padStart(2,'0');
        } else {
            submitNow();
        }
    }, 1000);
}

// Submit bình thường (người dùng chủ động)
async function submitNow() {
    localStorage.removeItem("IS_TESTING");
    showScreen("screen-end");
    // Code gửi fetch giống như cũ ở đây...
    localStorage.clear();
    alert("Nộp bài thành công!");
    location.reload();
}

function updateHUD(){
    $("qIndex").textContent = currentIndex + 1;
    $("qTotal").textContent = questionBank.length;
    $("violations").textContent = tabViolations;
}

$("btnNext").onclick = () => {
    if (currentIndex < questionBank.length - 1) {
        currentIndex++;
        renderQuestion(currentIndex);
    } else {
        submitNow();
    }
};

// Chặn Tab
window.onblur = () => {
    if(localStorage.getItem("IS_TESTING") === "true"){
        tabViolations++;
        syncData();
        updateHUD();
    }
};
