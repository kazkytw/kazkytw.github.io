// Data Dashboard - Main JavaScript
// 資料儀表板專用腳本

class DataDashboard {
  constructor() {
    this.elders = {}; // 存儲所有長者的資料
    this.elderNames = {}; // 存儲自訂名稱
    this.events = []; // 事件記錄
    
    // 初始化所有床位
    for (let i = 1; i <= 16; i++) {
      const id = `G${i}`;
      this.elders[id] = {
        status: 'IN_BED',
        statusTime: '--:--',
        todaySleepHours: 0,
        interruptions: 0,
        lastUpdate: null
      };
      this.elderNames[id] = id;
    }
    
    this.loadElderNames();
    this.init();
  }

  init() {
    this.setupToolbar();
    this.initFirebase();
    this.renderElderGrid();
    this.updateStats();
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

  // ===== 工具欄設定 =====
  setupToolbar() {
    // 啟用通知
    document.getElementById('enable-notify')?.addEventListener('click', async () => {
      if (!('Notification' in window)) {
        alert('此瀏覽器不支援通知功能');
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        alert('✅ 通知已啟用');
      } else {
        alert('❌ 通知權限被拒絕');
      }
    });

    // 測試連線
    document.getElementById('test-connection')?.addEventListener('click', async () => {
      const statusEl = document.getElementById('connection-status');
      if (!firebase?.database) {
        statusEl.textContent = '❌ Firebase 未初始化';
        statusEl.style.color = '#e74c3c';
        return;
      }

      try {
        const ref = firebase.database().ref('.info/connected');
        const snapshot = await ref.once('value');
        const connected = snapshot.val();
        
        if (connected) {
          statusEl.textContent = '✅ Firebase 連線正常';
          statusEl.style.color = '#16a34a';
        } else {
          statusEl.textContent = '⚠️ Firebase 未連線';
          statusEl.style.color = '#f59e0b';
        }
      } catch (error) {
        statusEl.textContent = '❌ 連線測試失敗';
        statusEl.style.color = '#e74c3c';
        console.error('Connection test error:', error);
      }
    });

    // 清空畫面
    document.getElementById('clear-view')?.addEventListener('click', () => {
      if (confirm('確定要清空所有資料嗎？（此操作不會刪除 Firebase 資料）')) {
        this.events = [];
        this.renderEventTable();
        
        // 重置所有床位狀態
        for (let i = 1; i <= 16; i++) {
          const id = `G${i}`;
          this.elders[id] = {
            status: 'IN_BED',
            statusTime: '--:--',
            todaySleepHours: 0,
            interruptions: 0,
            lastUpdate: null
          };
        }
        
        this.renderElderGrid();
        this.updateStats();
      }
    });
  }

  // ===== Firebase 整合 =====
  async initFirebase() {
    try {
      if (typeof firebaseManager === 'undefined') {
        console.warn('Firebase Manager not found');
        return;
      }

      await firebaseManager.init();
      console.log('Firebase initialized in data dashboard');

      // 監聽睡眠事件
      this.listenToSleepEvents();

    } catch (error) {
      console.error('Firebase init failed:', error);
    }
  }

  listenToSleepEvents() {
    if (!firebase?.database) return;

    const eventsRef = firebase.database().ref('sleep_events').orderByChild('ts').limitToLast(100);

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

    // 更新床位狀態
    if (eventType === 'LEAVE_BED') {
      this.elders[elderId].status = 'OUT_OF_BED';
      this.elders[elderId].statusTime = time;
      this.elders[elderId].interruptions += 1;
      this.elders[elderId].lastUpdate = ts;

      // 瀏覽器通知
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`床位 ${this.elderNames[elderId]} 離床`, {
          body: `時間：${time}`,
          icon: '🚶'
        });
      }

    } else if (eventType === 'RETURN_BED') {
      this.elders[elderId].status = 'IN_BED';
      this.elders[elderId].statusTime = time;
      this.elders[elderId].lastUpdate = ts;
    }

    // 更新卡片
    this.updateElderCard(elderId);

    // 新增事件記錄
    this.addEventRecord(event);

    // 更新統計
    this.updateStats();
  }

  // ===== 渲染床位網格 =====
  renderElderGrid() {
    const grid = document.getElementById('elder-grid');
    if (!grid) return;

    grid.innerHTML = '';

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

  // ===== 事件記錄 =====
  addEventRecord(event) {
    this.events.unshift(event); // 新事件加到最前面
    
    // 只保留最新 100 筆
    if (this.events.length > 100) {
      this.events = this.events.slice(0, 100);
    }

    this.renderEventTable();
  }

  renderEventTable() {
    const tbody = document.getElementById('event-rows');
    if (!tbody) return;

    if (this.events.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; color: #94a3b8; padding: 24px;">
            尚無事件記錄
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.events.map(event => {
      const time = new Date(event.ts).toLocaleTimeString('zh-TW', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      });
      
      const badgeClass = event.eventType === 'LEAVE_BED' ? 'leave' : 'return';
      const badgeText = event.eventType === 'LEAVE_BED' ? '離床' : '回床';

      return `
        <tr>
          <td>${time}</td>
          <td><strong>${event.elderId}</strong></td>
          <td><span class="event-badge ${badgeClass}">${badgeText}</span></td>
          <td>${event.groupId} / #${event.matNumber}</td>
        </tr>
      `;
    }).join('');
  }

  // ===== 統計更新 =====
  updateStats() {
    let inBedCount = 0;
    let outBedCount = 0;
    let totalInterruptions = 0;

    Object.values(this.elders).forEach(elder => {
      if (elder.status === 'IN_BED') {
        inBedCount++;
      } else {
        outBedCount++;
      }
      totalInterruptions += elder.interruptions;
    });

    document.getElementById('in-bed-count').textContent = inBedCount;
    document.getElementById('out-bed-count').textContent = outBedCount;
    document.getElementById('total-interruptions').textContent = totalInterruptions;
  }
}

// ===== 初始化 =====
let dataDashboard;

document.addEventListener('DOMContentLoaded', () => {
  dataDashboard = new DataDashboard();
});
