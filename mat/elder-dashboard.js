// Elder Care Dashboard - Main JavaScript
// 頁面切換、Firebase 整合、Alert 系統

class ElderDashboard {
  constructor() {
    this.currentPage = 'home';
    this.elders = {}; // 存儲所有長者的資料 { G1: {...}, G2: {...}, ... }
    this.elderNames = {}; // 存儲自訂名稱 { G1: "林奶奶", G2: "陳爺爺", ... }
    
    // 初始化所有床位
    for (let i = 1; i <= 16; i++) {
      const id = `G${i}`;
      this.elders[id] = {
        status: 'IN_BED',
        statusTime: '--:-- - Present',
        todaySleepHours: 0,
        interruptions: 0
      };
      this.elderNames[id] = id; // 預設名稱為 G1, G2...
    }
    
    this.loadElderNames(); // 從 localStorage 載入自訂名稱
    this.init();
  }

  init() {
    this.setupNavigation();
    this.setupAlertModal();
    this.initFirebase();
    this.renderElderGrid();
  }

  // ===== 載入/儲存自訂名稱 =====
  loadElderNames() {
    const saved = localStorage.getItem('elder_names');
    if (saved) {
      try {
        this.elderNames = JSON.parse(saved);
      } catch (e) {
        console.error('Failed to load elder names:', e);
      }
    }
  }

  saveElderNames() {
    localStorage.setItem('elder_names', JSON.stringify(this.elderNames));
  }

  updateElderName(elderId, newName) {
    this.elderNames[elderId] = newName || elderId;
    this.saveElderNames();
  }

  // ===== 渲染床位網格 =====
  renderElderGrid() {
    const grid = document.getElementById('elder-grid');
    if (!grid) return;

    grid.innerHTML = '';

    // 生成所有床位卡片
    for (let i = 1; i <= 16; i++) {
      const elderId = `G${i}`;
      const elderData = this.elders[elderId];
      const elderName = this.elderNames[elderId] || elderId;

      const card = this.createElderCard(elderId, elderName, elderData);
      grid.appendChild(card);
    }
  }

  createElderCard(elderId, name, data) {
    const card = document.createElement('div');
    card.className = `elder-card ${data.status === 'IN_BED' ? 'in-bed' : 'out-of-bed'}`;
    card.dataset.elderId = elderId;

    card.innerHTML = `
      <div class="elder-card-title">
        <input 
          type="text" 
          class="elder-card-title-editable" 
          value="${name}"
          data-elder-id="${elderId}"
          maxlength="20"
        />
      </div>
      
      <div class="elder-card-hours">
        <span>${data.todaySleepHours}</span>
        <span class="elder-card-hours-label">hrs</span>
      </div>
      
      <div class="elder-card-status">
        <span class="elder-status-badge ${data.status === 'IN_BED' ? 'in-bed' : 'out-of-bed'}">
          ${data.status === 'IN_BED' ? '🛏️ IN BED' : '🚶 OUT OF BED'}
        </span>
      </div>
      
      <div class="elder-card-interruptions">
        <span class="elder-interruptions-count">${data.interruptions}</span>
        <span class="elder-interruptions-label">中斷次數</span>
      </div>
    `;

    // 設定名稱編輯事件
    const nameInput = card.querySelector('.elder-card-title-editable');
    nameInput.addEventListener('blur', (e) => {
      this.updateElderName(elderId, e.target.value);
    });

    nameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.target.blur();
      }
    });

    return card;
  }

  // ===== 導航系統 =====
  setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const page = item.dataset.page;
        this.switchPage(page);
      });
    });
  }

  switchPage(pageName) {
    // 隱藏所有頁面
    document.querySelectorAll('.page').forEach(page => {
      page.classList.remove('active');
    });

    // 移除所有導航 active 狀態
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
    });

    // 顯示目標頁面
    const targetPage = document.getElementById(`page-${pageName}`);
    if (targetPage) {
      targetPage.classList.add('active');
      this.currentPage = pageName;
    }

    // 設定導航 active 狀態
    const targetNav = document.querySelector(`[data-page="${pageName}"]`);
    if (targetNav) {
      targetNav.classList.add('active');
    }
  }

  // ===== Alert 系統 =====
  setupAlertModal() {
    const modal = document.getElementById('alert-modal');
    const closeBtn = document.getElementById('alert-close');
    const dismissBtn = document.getElementById('btn-dismiss');
    const callBtn = document.getElementById('btn-call');

    // 關閉按鈕
    closeBtn?.addEventListener('click', () => this.hideAlert());
    dismissBtn?.addEventListener('click', () => this.hideAlert());

    // Call Caregiver 按鈕
    callBtn?.addEventListener('click', () => {
      this.callCaregiver();
    });

    // 點擊背景關閉
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.hideAlert();
      }
    });
  }

  showAlert(title, message, time) {
    const modal = document.getElementById('alert-modal');
    const urgentText = document.querySelector('.alert-urgent');
    const timeText = document.querySelector('.alert-time');

    if (urgentText) urgentText.textContent = title;
    if (timeText) timeText.textContent = `TIME: ${time}`;
    
    modal?.classList.remove('hidden');

    // 瀏覽器通知
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '🔔'
      });
    }
  }

  hideAlert() {
    const modal = document.getElementById('alert-modal');
    modal?.classList.add('hidden');
  }

  callCaregiver() {
    alert('正在呼叫照護者...\n（此為示範功能）');
    this.hideAlert();
  }

  // ===== Firebase 整合 =====
  async initFirebase() {
    try {
      if (typeof firebaseManager === 'undefined') {
        console.warn('Firebase Manager not found');
        return;
      }

      await firebaseManager.init();
      console.log('Firebase initialized in dashboard');

      // 監聽睡眠事件
      this.listenToSleepEvents();

      // 請求通知權限
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }

    } catch (error) {
      console.error('Firebase init failed:', error);
    }
  }

  listenToSleepEvents() {
    if (!firebase?.database) return;

    const eventsRef = firebase.database().ref('sleep_events').orderByChild('ts').limitToLast(50);

    eventsRef.on('child_added', (snapshot) => {
      const event = snapshot.val();
      if (!event) return;

      this.handleSleepEvent(event);
    });
  }

  handleSleepEvent(event) {
    const { eventType, ts, elderId, groupId, matNumber } = event;
    
    if (!this.elders[elderId]) return;

    const time = new Date(ts).toLocaleTimeString('zh-TW', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    if (eventType === 'LEAVE_BED') {
      // 離床事件
      this.elders[elderId].status = 'OUT_OF_BED';
      this.elders[elderId].statusTime = `${time} - Present`;
      this.elders[elderId].interruptions += 1;

      // 顯示警報
      this.showAlert(
        `URGENT: ${this.elderNames[elderId]} LEFT BED!`,
        `床位 ${elderId} (${this.elderNames[elderId]}) 已離床，請注意安全`,
        time
      );

      // 更新對應的卡片
      this.updateElderCard(elderId);

    } else if (eventType === 'RETURN_BED') {
      // 回床事件
      this.elders[elderId].status = 'IN_BED';
      this.elders[elderId].statusTime = `${time} - Present`;
      
      // 更新對應的卡片
      this.updateElderCard(elderId);
    }
  }

  // 更新單一床位卡片
  updateElderCard(elderId) {
    const card = document.querySelector(`[data-elder-id="${elderId}"]`);
    if (!card) return;

    const data = this.elders[elderId];
    
    // 更新狀態樣式
    card.className = `elder-card ${data.status === 'IN_BED' ? 'in-bed' : 'out-of-bed'}`;
    
    // 更新睡眠時數
    const hoursEl = card.querySelector('.elder-card-hours span:first-child');
    if (hoursEl) hoursEl.textContent = data.todaySleepHours;
    
    // 更新狀態標籤
    const statusBadge = card.querySelector('.elder-status-badge');
    if (statusBadge) {
      statusBadge.className = `elder-status-badge ${data.status === 'IN_BED' ? 'in-bed' : 'out-of-bed'}`;
      statusBadge.textContent = data.status === 'IN_BED' ? '🛏️ IN BED' : '🚶 OUT OF BED';
    }
    
    // 更新中斷次數
    const interruptionsEl = card.querySelector('.elder-interruptions-count');
    if (interruptionsEl) interruptionsEl.textContent = data.interruptions;
  }

  // ===== 週報資料載入 =====
  async loadWeeklyReport() {
    try {
      if (!firebaseManager?.getSleepSessions) return;

      const sessions = await firebaseManager.getSleepSessions('G1', 7);
      console.log('Weekly sessions:', sessions);

      // TODO: 渲染圖表
      this.renderWeeklyChart(sessions);

    } catch (error) {
      console.error('Failed to load weekly report:', error);
    }
  }

  renderWeeklyChart(sessions) {
    // 簡易圖表渲染（可使用 Chart.js 等函式庫）
    const canvas = document.getElementById('sleep-chart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 繪製簡易長條圖
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#3498db';

    const barWidth = canvas.width / 7;
    const maxHeight = canvas.height;

    sessions.forEach((session, index) => {
      const hours = (session.totalSleepMinutes || 0) / 60;
      const barHeight = (hours / 10) * maxHeight; // 假設最大 10 小時

      ctx.fillRect(
        index * barWidth + 5,
        maxHeight - barHeight,
        barWidth - 10,
        barHeight
      );
    });
  }

  // ===== 測試用：模擬警報 =====
  testAlert() {
    const now = new Date();
    const time = now.toLocaleTimeString('zh-TW', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    this.showAlert(
      'URGENT: GRANDMA LEFT BED!',
      '長者已離床，請立即確認安全',
      time
    );
  }
}

// ===== 初始化 =====
let dashboard;

document.addEventListener('DOMContentLoaded', () => {
  dashboard = new ElderDashboard();

  // 測試用：5秒後顯示警報（開發時使用）
  // setTimeout(() => dashboard.testAlert(), 5000);
});

// 全域函數供控制台測試
window.testAlert = () => {
  if (dashboard) {
    dashboard.testAlert();
  }
};
