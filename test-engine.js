// ===== Test Engine (Worldpanel – Sửa lỗi Refresh) =====

const CFG = window.TEST_APP_CONFIG || {};
const TOTAL_TIME_SECONDS = Number(CFG.TOTAL_TIME_SECONDS || 45 * 60);
const SCRIPT_URL = String(CFG.SCRIPT_URL || "");

// --- State
let timeLeft = TOTAL_TIME_SECONDS;
let tabViolations = 0;
let currentIndex = 0;
let responses = {};
let email = "";
const questionBank = Array.isArray(window.QUESTION_BANK) ? window.QUESTION_BANK : [];

const $ = (id) => document.getElementById(id);

// --- 1. LOGIC CHẶN REFRESH (SỬA LỖI CỦA COPILOT) ---
(function handleReload() {
  const savedActive = localStorage.getItem("TEST_ACTIVE");
  if (savedActive === "1") {
    // Nếu thấy cờ TEST_ACTIVE, lấy dữ liệu cũ ra để nộp bài ngay
    email = localStorage.getItem("SAVED_EMAIL") || "unknown";
    responses = JSON.parse(localStorage.getItem("SAVED_RESPONSES") || "{}");
    tabViolations = parseInt(localStorage.getItem("SAVED_VIOLATIONS") || "0");
    
    // Đợi trang load xong rồi nộp bài luôn
    window.addEventListener('load', () => {
      alert("Cảnh báo: Bạn đã tải lại trang. Hệ thống sẽ tự động nộp bài thi hiện tại!");
      submitNow(true);
    });
  }
})();

// --- 2. HÀM LƯU DỮ LIỆU TẠM THỜI ---
function syncToStorage() {
  if (!email) return;
  localStorage.setItem("SAVED_EMAIL", email);
  localStorage.setItem("SAVED_RESPONSES", JSON.stringify(responses));
  localStorage.setItem("SAVED_VIOLATIONS", String(tabViolations));
}

// --- Các hàm hỗ trợ giao diện ---
function fmtTime(s){ const m=Math.floor(s/60), t=s%60; return `${m}:${t<10?'0':''}${t}`; }
function showScreen(idToShow){
  ["screen-start","screen-question","screen-end"].forEach(id => $(id).classList.toggle("hidden", id !== idToShow));
}

function updateHUD(){
  $("qIndex").textContent = currentIndex + 1;
  $("qTotal").textContent = questionBank.length;
  $("timer").textContent = fmtTime(timeLeft);
  $("violations").textContent = tabViolations;
}

function renderQuestion(i){
  const q = questionBank[i];
  if(!q) return;
  // Phần hiển thị câu hỏi (đã sửa cho xuống dòng đẹp)
  $("qText").innerHTML = `<div style="margin-bottom:8px; opacity:.7;">Question ${i+1}</div><div>${q.text}</div>`;
  $("qExtra").innerHTML = q.extraHTML || "";
  
  const wrap = $("qOptions"); wrap.innerHTML = "";
  (q.options || []).forEach(opt => {
    const id = `opt_${q.key}_${opt.value}`;
    const lbl = document.createElement("label");
    lbl.className = "option";
    lbl.innerHTML = `<input type="radio" name="${q.key}" value="${opt.value}" ${responses[q.key]===opt.value?'checked':''}/> ${opt.label}`;
    lbl.onclick = () => { responses[q.key] = opt.value; syncToStorage(); };
    wrap.appendChild(lbl);
  });
  
  $("btnNext").textContent = (i === questionBank.length - 1) ? "Submit Test" : "Next";
  updateHUD();
}

// --- Start Test ---
$("btnStart").onclick = () => {
  const val = $("email").value.trim();
  if(!val || !val.includes("@")) return alert("Please enter a valid email");
  email = val;
  
  // BẬT CỜ ĐANG LÀM BÀI
  localStorage.setItem("TEST_ACTIVE", "1");
  syncToStorage();
  
  showScreen("screen-question");
  renderQuestion(0);
  startTimer();
};

function startTimer(){
  const interval = setInterval(() => {
    if(timeLeft <= 0) {
      clearInterval(interval);
      submitNow(true);
    } else {
      timeLeft--;
      $("timer").textContent = fmtTime(timeLeft);
    }
  }, 1000);
}

// --- Next/Submit Button ---
$("btnNext").onclick = () => {
  if (currentIndex < questionBank.length - 1) {
    currentIndex++;
    renderQuestion(currentIndex);
    window.scrollTo(0,0);
  } else {
    submitNow(false);
  }
};

// --- Submit Function ---
async function submitNow(isForced = false){
  showScreen("screen-end");
  // Xóa cờ để không bị lặp lại vòng lặp nộp bài
  localStorage.removeItem("TEST_ACTIVE");

  try {
    const payload = new URLSearchParams({
      action: "submit",
      email: email,
      responses: JSON.stringify(responses),
      violations: String(tabViolations),
      forced: isForced ? "1" : "0"
    });

    await fetch(SCRIPT_URL, {
      method: "POST",
      body: payload.toString(),
      headers: {"Content-Type":"application/x-www-form-urlencoded"}
    });

    alert(isForced ? "Bài thi đã được tự động nộp do vi phạm (Refresh)!" : "Nộp bài thành công!");
    location.reload(); // Reset lại trang về trạng thái ban đầu
  } catch(e) {
    alert("Lỗi nộp bài, vui lòng kiểm tra kết nối!");
  }
}

// Theo dõi chuyển Tab (Violations)
window.onblur = () => {
  if(localStorage.getItem("TEST_ACTIVE") === "1"){
    tabViolations++;
    syncToStorage();
    updateHUD();
  }
};
