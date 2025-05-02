// 從localStorage加載日記
function loadDiariesFromLocalStorage() {
  try {
    const diaries = localStorage.getItem("diaries");
    return diaries ? JSON.parse(diaries) : [];
  } catch (error) {
    console.error("從localStorage加載日記失敗:", error);
    return [];
  }
}

// 更新日記列表
function updateDiaryList(selectedDate = null) {
  const diaryList = document.getElementById("diary-list");
  if (!diaryList) return;

  // 清空列表
  diaryList.innerHTML = "";

  // 如果沒有選擇日期，顯示提示並返回
  if (!selectedDate) {
    diaryList.innerHTML = '<p class="no-diary">請選擇日期查看日記</p>';
    return;
  }

  // 獲取所有日記
  const diaries = loadDiariesFromLocalStorage();

  // 如果沒有日記，顯示提示
  if (diaries.length === 0) {
    diaryList.innerHTML = '<p class="no-diary">暫無日記記錄</p>';
    return;
  }

  // 過濾特定日期的日記
  const filteredDiaries = diaries.filter(
    (diary) => diary.date === selectedDate
  );

  // 如果該日期沒有日記
  if (filteredDiaries.length === 0) {
    diaryList.innerHTML = `<p class="no-diary">該日期暫無日記記錄</p>`;
    return;
  }

  // 按日期排序（最新的在前面）
  filteredDiaries.sort((a, b) => new Date(b.date) - new Date(a.date));

  // 添加每條日記到列表
  filteredDiaries.forEach((diary) => {
    const diaryItem = document.createElement("div");
    diaryItem.className = "diary-item";

    diaryItem.innerHTML = `
      <div class="diary-content">${diary.content}</div>
      <div class="diary-point">心情指數: ${diary.point}/5</div>
    `;

    diaryList.appendChild(diaryItem);
  });
}

document.addEventListener("DOMContentLoaded", function () {
  // 獲取所有頁面元素
  const mainPage = document.querySelector(".main-page");
  const calendar = document.querySelector(".calendar");
  const addNewDiary = document.querySelector(".add-new-diary");
  const diaryOverlay = document.querySelector(".diary-overlay");
  const emotionPointDashboard = document.querySelector(
    ".emotion-point-dashboard"
  );
  const personalPage = document.querySelector(".personal-page");

  // 獲取所有按鈕元素
  const mainPageBtn = document.querySelector("#main-page-button");
  const calendarBtn = document.querySelector("#calendar-button");
  const addNewDiaryBtn = document.querySelector("#add-new-diary-button");
  const emotionPointDashboardBtn = document.querySelector(
    "#emotion-point-dashboard-button"
  );
  const personalPageBtn = document.querySelector("#personal-page-button");

  // 獲取保存和導出按鈕
  const saveBtn = document.querySelector(".save-btn");
  const exportBtn = document.querySelector("#export-diaries");

  // 默認心情指數
  let selectedMoodPoint = 3;

  // 心情點數選擇
  const moodPoints = document.querySelectorAll(".mood-point");
  if (moodPoints.length > 0) {
    // 默認選中中間的心情（3分）
    moodPoints[2].classList.add("selected");

    // 為每個心情點數添加點擊事件
    moodPoints.forEach((point) => {
      point.addEventListener("click", function () {
        // 移除所有選中狀態
        moodPoints.forEach((p) => p.classList.remove("selected"));

        // 添加當前選中狀態
        this.classList.add("selected");

        // 獲取選中的點數
        selectedMoodPoint = parseInt(this.getAttribute("data-point"));
        console.log("選中的心情指數:", selectedMoodPoint);
      });
    });
  }

  // 將所有頁面放入陣列中
  const pages = [mainPage, calendar, emotionPointDashboard, personalPage];

  // 隱藏所有頁面的函數
  function ShowAllPages(isShow) {
    pages.forEach((page) => {
      page.style.display = isShow ? "block" : "none";
    });
  }

  // 顯示特定頁面的函數
  function showPage(page) {
    ShowAllPages(false);
    page.style.display = "block";

    // 如果不是顯示新增日記頁面，確保日記輸入框和遮罩隱藏
    if (page !== addNewDiary) {
      addNewDiary.classList.remove("show");
      diaryOverlay.classList.remove("show");
    }

    // 如果顯示日曆頁面，初始化提示信息
    if (page === calendar) {
      const diaryList = document.getElementById("diary-list");
      if (diaryList) {
        diaryList.innerHTML = '<p class="no-diary">請選擇日期查看日記</p>';
      }
    }
  }

  // 初始化：顯示主頁面，隱藏其他頁面
  showPage(mainPage);

  // 為每個按鈕添加點擊事件
  mainPageBtn.addEventListener("click", () => showPage(mainPage));
  calendarBtn.addEventListener("click", () => {
    showPage(calendar);

    // 獲取今天的日期
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const day = today.getDate();

    // 格式化為YYYY-MM-DD格式
    const formattedToday = `${year}-${String(month + 1).padStart(
      2,
      "0"
    )}-${String(day).padStart(2, "0")}`;

    // 更新日記列表，顯示今天的日記
    updateDiaryList(formattedToday);
  });

  // 新增日記按鈕顯示日曆並打開日記輸入框
  addNewDiaryBtn.addEventListener("click", () => {
    showPage(calendar);
    addNewDiary.classList.add("show");
    diaryOverlay.classList.add("show");
  });

  emotionPointDashboardBtn.addEventListener("click", () => {
    showPage(emotionPointDashboard);
    // 生成情緒面板的日曆
    const today = new Date();
    generateMoodCalendar(today.getFullYear(), today.getMonth());
    // 繪製曲線圖
    drawMoodChart();
  });

  personalPageBtn.addEventListener("click", () => showPage(personalPage));

  // 保存按鈕點擊事件
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      const textarea = document.querySelector(".add-new-diary textarea");
      if (textarea && textarea.value.trim() !== "") {
        // 獲取當前日期
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");
        const formattedDate = `${year}-${month}-${day}`;

        // 創建新日記對象，使用用戶選擇的心情指數
        const newDiary = {
          date: formattedDate,
          content: textarea.value.trim(),
          point: selectedMoodPoint,
        };

        // 使用本地存儲保存數據
        if (saveDiaryToLocalStorage(newDiary)) {
          alert("日記保存成功！");
          textarea.value = "";
          addNewDiary.classList.remove("show");
          diaryOverlay.classList.remove("show");

          // 更新日記列表
          updateDiaryList();

          // 重置心情選擇為默認值
          moodPoints.forEach((p) => p.classList.remove("selected"));
          moodPoints[2].classList.add("selected");
          selectedMoodPoint = 3;

          // 更新日曆顯示 - 重新生成當前月份的日曆
          generateCalendar(today.getFullYear(), today.getMonth());

          // 如果情感儀表板可見，也更新情感日曆
          if (emotionPointDashboard.style.display === "block") {
            generateMoodCalendar(today.getFullYear(), today.getMonth());
            drawMoodChart();
          }
        } else {
          alert("保存失敗，請重試！");
        }
      } else {
        alert("請輸入日記內容");
      }
    });
  }

  // 導出按鈕點擊事件
  if (exportBtn) {
    exportBtn.addEventListener("click", exportDiariesToJSON);
  }

  // 點擊遮罩時關閉日記輸入框
  diaryOverlay.addEventListener("click", function (e) {
    // 確保點擊的是遮罩本身，而不是日記輸入框
    if (e.target === diaryOverlay) {
      addNewDiary.classList.remove("show");
      diaryOverlay.classList.remove("show");
    }
  });

  // 使用localStorage作為臨時存儲的替代方案
  function saveDiaryToLocalStorage(diaryData) {
    try {
      // 從localStorage獲取現有日記
      let diaries = localStorage.getItem("diaries");
      diaries = diaries ? JSON.parse(diaries) : [];

      // 添加新日記
      diaries.push(diaryData);

      // 保存回localStorage
      localStorage.setItem("diaries", JSON.stringify(diaries));

      console.log("已保存日記到localStorage:", diaryData);
      return true;
    } catch (error) {
      console.error("保存到localStorage失敗:", error);
      return false;
    }
  }

  // 導出日記為JSON文件
  function exportDiariesToJSON() {
    // 獲取所有日記
    const diaries = loadDiariesFromLocalStorage();

    if (diaries.length === 0) {
      alert("暫無日記記錄可導出");
      return;
    }

    // 創建一個Blob對象
    const dataStr = JSON.stringify(diaries, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });

    // 創建下載鏈接
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `diaries_${new Date().toISOString().slice(0, 10)}.json`;

    // 模擬點擊下載
    document.body.appendChild(a);
    a.click();

    // 清理
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  }

  // 初始化時加載日記
  const diaries = loadDiariesFromLocalStorage();
  console.log("已加載日記:", diaries);

  // 為按鈕添加活躍狀態
  const buttons = [
    mainPageBtn,
    calendarBtn,
    addNewDiaryBtn,
    emotionPointDashboardBtn,
    personalPageBtn,
  ];

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      // 移除所有按鈕的活躍狀態
      buttons.forEach((btn) => btn.classList.remove("active"));
      // 添加當前按鈕的活躍狀態
      button.classList.add("active");
    });
  });

  // 為情緒面板生成日曆
  function generateMoodCalendar(year, month) {
    const calendarContainer = document.getElementById("mood-calendar-grid");
    if (!calendarContainer) return;

    calendarContainer.innerHTML = ""; // 清空容器

    const date = new Date(year, month);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = date.getDay(); // 獲取該月的第一天是星期幾

    // 獲取今天的日期
    const currentDate = new Date();
    const isCurrentMonth =
      currentDate.getFullYear() === year && currentDate.getMonth() === month;
    const currentDay = currentDate.getDate();

    const monthHeader = document.getElementById("mood-calendar-month-header");
    if (monthHeader) {
      monthHeader.textContent = `${date
        .toLocaleString("en-US", {
          month: "short",
        })
        .toUpperCase()}. ${year}`;
    }

    // 獲取所有日記，用於檢查日期是否有日記記錄
    const diaries = loadDiariesFromLocalStorage();

    // 建立日期與心情指數的映射
    const dateToMood = {};
    diaries.forEach((diary) => {
      const dateParts = diary.date.split("-");
      const diaryYear = parseInt(dateParts[0]);
      const diaryMonth = parseInt(dateParts[1]) - 1; // JavaScript月份從0開始

      // 只考慮當前顯示的月份的日記
      if (diaryYear === year && diaryMonth === month) {
        const diaryDay = parseInt(dateParts[2]);

        // 如果同一天有多條日記，取平均值或最後一條的心情指數
        dateToMood[diaryDay] = diary.point;
      }
    });

    // 創建空白的格子
    for (let i = 0; i < firstDay; i++) {
      const emptyDay = document.createElement("div");
      emptyDay.className = "day no-data"; // 標記為無數據
      calendarContainer.appendChild(emptyDay);
    }

    // 創建每一天的格子
    for (let day = 1; day <= daysInMonth; day++) {
      const dayElement = document.createElement("div");
      dayElement.className = "day";
      dayElement.textContent = day; // 設置文本為日期

      // 如果該日期有日記記錄，根據心情指數設置背景顏色
      if (dateToMood[day]) {
        const moodPoint = dateToMood[day];
        dayElement.classList.add(`mood-${moodPoint}`); // 添加對應心情指數的類名
      }

      // 如果是今天的日期，添加特殊樣式
      if (isCurrentMonth && day === currentDay) {
        dayElement.classList.add("today-mark");
      }

      calendarContainer.appendChild(dayElement);
    }
  }

  // 繪製心情曲線圖
  function drawMoodChart() {
    const canvas = document.getElementById("mood-chart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    // 清空畫布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 設置畫布大小
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // 獲取當前年月
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    // 獲取所有日記
    const diaries = loadDiariesFromLocalStorage();

    if (diaries.length === 0) {
      // 如果沒有日記記錄，顯示提示文字
      ctx.font = '16px "Noto Sans TC", sans-serif';
      ctx.fillStyle = "#888";
      ctx.textAlign = "center";
      ctx.fillText("暫無日記記錄", canvas.width / 2, canvas.height / 2);
      return;
    }

    // 過濾當月的日記
    const monthlyDiaries = diaries.filter((diary) => {
      const dateParts = diary.date.split("-");
      const diaryYear = parseInt(dateParts[0]);
      const diaryMonth = parseInt(dateParts[1]) - 1; // JavaScript月份從0開始
      return diaryYear === currentYear && diaryMonth === currentMonth;
    });

    if (monthlyDiaries.length === 0) {
      // 如果當月沒有日記記錄，顯示提示文字
      ctx.font = '16px "Noto Sans TC", sans-serif';
      ctx.fillStyle = "#888";
      ctx.textAlign = "center";
      ctx.fillText("本月暫無日記記錄", canvas.width / 2, canvas.height / 2);
      return;
    }

    // 按日期排序
    monthlyDiaries.sort((a, b) => new Date(a.date) - new Date(b.date));

    // 提取日期和心情指數
    const dates = monthlyDiaries.map((diary) => {
      const date = new Date(diary.date);
      return date.getDate(); // 只取日期部分
    });

    const moodPoints = monthlyDiaries.map((diary) => diary.point);

    // 設置坐標軸
    const padding = 40;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;

    // 繪製x軸和y軸
    ctx.beginPath();
    ctx.strokeStyle = "#ddd";
    ctx.lineWidth = 1;

    // x軸
    ctx.moveTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);

    // y軸刻度
    for (let i = 1; i <= 5; i++) {
      const y = canvas.height - padding - (i / 5) * chartHeight;
      ctx.moveTo(padding - 5, y);
      ctx.lineTo(canvas.width - padding, y);

      // 添加y軸刻度標籤
      ctx.font = '12px "Noto Sans TC", sans-serif';
      ctx.fillStyle = "#888";
      ctx.textAlign = "right";
      ctx.fillText(i.toString(), padding - 10, y + 4);
    }

    ctx.stroke();

    // x軸刻度和標籤
    const xStep = chartWidth / (dates.length - 1 || 1);

    ctx.beginPath();
    ctx.strokeStyle = "#ddd";

    // 繪製x軸刻度和標籤
    dates.forEach((date, index) => {
      const x = padding + index * xStep;

      // 每隔一定數量的日期顯示一個刻度
      if (
        index % Math.max(1, Math.floor(dates.length / 10)) === 0 ||
        index === dates.length - 1
      ) {
        ctx.moveTo(x, canvas.height - padding);
        ctx.lineTo(x, canvas.height - padding + 5);

        // 添加x軸刻度標籤
        ctx.font = '12px "Noto Sans TC", sans-serif';
        ctx.fillStyle = "#888";
        ctx.textAlign = "center";
        ctx.fillText(date.toString(), x, canvas.height - padding + 20);
      }
    });

    ctx.stroke();

    // 繪製心情曲線
    ctx.beginPath();
    ctx.strokeStyle = "#4a90e2";
    ctx.lineWidth = 2;

    // 移動到第一個點
    const startX = padding;
    const startY = canvas.height - padding - (moodPoints[0] / 5) * chartHeight;
    ctx.moveTo(startX, startY);

    // 繪製曲線
    for (let i = 1; i < moodPoints.length; i++) {
      const x = padding + i * xStep;
      const y = canvas.height - padding - (moodPoints[i] / 5) * chartHeight;

      // 使用貝塞爾曲線使線條更平滑
      const prevX = padding + (i - 1) * xStep;
      const prevY =
        canvas.height - padding - (moodPoints[i - 1] / 5) * chartHeight;

      const cpX1 = prevX + xStep / 3;
      const cpX2 = x - xStep / 3;

      ctx.bezierCurveTo(cpX1, prevY, cpX2, y, x, y);
    }

    ctx.stroke();

    // 繪製數據點
    moodPoints.forEach((point, index) => {
      const x = padding + index * xStep;
      const y = canvas.height - padding - (point / 5) * chartHeight;

      // 根據心情指數選擇顏色
      let pointColor;
      switch (point) {
        case 1:
          pointColor = "#234d84"; // 深藍
          break;
        case 2:
          pointColor = "#3ba3c5"; // 藍色
          break;
        case 3:
          pointColor = "#7fdd87"; // 綠色
          break;
        case 4:
          pointColor = "#ffd166"; // 黃色
          break;
        case 5:
          pointColor = "#ff862f"; // 橘色
          break;
        default:
          pointColor = "#4a90e2"; // 默認藍色
      }

      // 繪製數據點
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = pointColor;
      ctx.fill();

      // 添加白色邊框
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }

  // 使用當前日期生成日曆
  const today = new Date();
  generateCalendar(today.getFullYear(), today.getMonth());
});

// 為日曆頁面生成日曆
function generateCalendar(year, month) {
  const calendarContainer = document.getElementById("calendar-grid");
  calendarContainer.innerHTML = ""; // 清空容器

  const date = new Date(year, month);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = date.getDay(); // 獲取該月的第一天是星期幾

  // 獲取今天的日期
  const currentDate = new Date();
  const isCurrentMonth =
    currentDate.getFullYear() === year && currentDate.getMonth() === month;
  const currentDay = currentDate.getDate();

  const monthHeader = document.getElementById("calendar-month-header");
  monthHeader.textContent = `${date
    .toLocaleString("en-US", {
      month: "short",
    })
    .toUpperCase()}. ${year}`;

  // 獲取所有日記，用於檢查日期是否有日記記錄
  const diaries = loadDiariesFromLocalStorage();

  // 建立日期與心情指數的映射
  const dateToMood = {};
  diaries.forEach((diary) => {
    const dateParts = diary.date.split("-");
    const diaryYear = parseInt(dateParts[0]);
    const diaryMonth = parseInt(dateParts[1]) - 1; // JavaScript月份從0開始

    // 只考慮當前顯示的月份的日記
    if (diaryYear === year && diaryMonth === month) {
      const diaryDay = parseInt(dateParts[2]);

      // 如果同一天有多條日記，取平均值或最後一條的心情指數
      dateToMood[diaryDay] = diary.point;
    }
  });

  // 創建空白的格子
  for (let i = 0; i < firstDay; i++) {
    const emptyDay = document.createElement("div");
    emptyDay.className = "day no-data"; // 標記為無數據
    calendarContainer.appendChild(emptyDay);
  }

  // 創建每一天的格子
  for (let day = 1; day <= daysInMonth; day++) {
    const dayElement = document.createElement("div");
    dayElement.className = "day";
    dayElement.textContent = day; // 設置文本為日期

    // 如果該日期有日記記錄，根據心情指數設置背景顏色
    if (dateToMood[day]) {
      const moodPoint = dateToMood[day];
      dayElement.classList.add(`mood-${moodPoint}`); // 添加對應心情指數的類名
    }

    // 如果是今天的日期，自動選中
    if (isCurrentMonth && day === currentDay) {
      dayElement.classList.add("selected-day");

      // 格式化為YYYY-MM-DD格式
      const selectedDay = String(day).padStart(2, "0");
      const selectedMonth = String(month + 1).padStart(2, "0");
      const formattedDate = `${year}-${selectedMonth}-${selectedDay}`;

      // 更新日記列表，顯示今天的日記
      updateDiaryList(formattedDate);
    }

    // 添加點擊事件
    dayElement.addEventListener("click", function () {
      // 清除所有選中樣式
      document
        .querySelectorAll(".day")
        .forEach((el) => el.classList.remove("selected-day"));

      // 添加選中樣式到當前日期
      this.classList.add("selected-day");

      // 格式化為YYYY-MM-DD格式
      const selectedDay = String(day).padStart(2, "0");
      const selectedMonth = String(month + 1).padStart(2, "0");
      const formattedDate = `${year}-${selectedMonth}-${selectedDay}`;

      // 更新日記列表，只顯示選中日期的日記
      updateDiaryList(formattedDate);
    });

    calendarContainer.appendChild(dayElement);
  }
}
