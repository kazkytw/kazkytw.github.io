// Firebase 配置檔案
const firebaseConfig = {
  apiKey: "AIzaSyD3eOpt9RRtSPvHQoMGXfxe",
  authDomain: "wuxion-c5544.firebaseapp.com",
  databaseURL:
    "https://wuxion-c5544-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "wuxion-c5544",
  storageBucket: "wuxion-c5544.firebasestorage.app",
  messagingSenderId: "66725893750",
  appId: "1:667258937508:web:521e95c9730bc273e18631",
};

class FirebaseManager {
  constructor() {
    this.db = null;
    this.initialized = false;
  }

  // 初始化 Firebase
  async init() {
    try {
      if (typeof firebase === "undefined") {
        throw new Error("Firebase SDK not loaded");
      }

      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }

      this.db = firebase.database();
      this.initialized = true;
      console.log("Firebase initialized successfully");
      return true;
    } catch (error) {
      console.error("Firebase initialization failed:", error);
      return false;
    }
  }

  // 記錄地墊按下事件（保留：原本的 mat_presses）
  async logMatPress(timestamp, groupId, matNumber) {
    if (!this.initialized) {
      console.warn("Firebase not initialized, cannot log data");
      return false;
    }

    try {
      const pressData = {
        timestamp,
        groupId,
        matNumber,
        date: new Date().toISOString(),
        sessionId: this.getSessionId(),
      };

      const pressesRef = this.db.ref("mat_presses");
      await pressesRef.push(pressData);

      console.log("Mat press logged to Firebase:", pressData);
      return true;
    } catch (error) {
      console.error("Failed to log mat press:", error);
      return false;
    }
  }

  // ✅ 記錄睡眠事件（離床/回床/異常…）
  async logSleepEvent(eventType, ts, elderId, groupId, matNumber, extra = {}) {
    if (!this.initialized) {
      console.warn("Firebase not initialized, cannot log data");
      return false;
    }

    try {
      const eventData = {
        eventType, // 'LEAVE_BED' | 'RETURN_BED' | 'ABNORMAL_SLEEP' ...
        ts, // unix ms
        elderId, // e.g. 'G1'
        groupId,
        matNumber,
        date: new Date(ts).toISOString(),
        sessionId: this.getSessionId(),
        ...extra,
      };

      const ref = this.db.ref("sleep_events");
      await ref.push(eventData);

      console.log("Sleep event logged:", eventData);
      return true;
    } catch (error) {
      console.error("Failed to log sleep event:", error);
      return false;
    }
  }

  // 儲存/更新睡眠會話統計（簡化版）
  async upsertSleepSession(elderId, sessionKey, sessionData) {
    if (!this.initialized) {
      console.warn("Firebase not initialized, cannot upsert session");
      return false;
    }

    try {
      const ref = this.db.ref(`sleep_sessions/${elderId}/${sessionKey}`);
      await ref.update({
        ...sessionData,
        updatedAt: new Date().toISOString(),
        sessionId: this.getSessionId(),
      });
      return true;
    } catch (error) {
      console.error("Failed to upsert sleep session:", error);
      return false;
    }
  }

  // 讀取睡眠會話（供週報/照護者儀表板）
  async getSleepSessions(elderId, limit = 50) {
    if (!this.initialized) {
      console.warn("Firebase not initialized");
      return [];
    }

    try {
      const ref = this.db.ref(`sleep_sessions/${elderId}`);
      const snapshot = await ref.limitToLast(limit).once("value");

      const items = [];
      snapshot.forEach((child) => {
        items.push({ key: child.key, ...child.val() });
      });

      items.sort((a, b) => (b.startTs || 0) - (a.startTs || 0));
      return items;
    } catch (error) {
      console.error("Failed to get sleep sessions:", error);
      return [];
    }
  }

  // 取得或生成會話ID
  getSessionId() {
    let sessionId = sessionStorage.getItem("mat_simulator_session_id");
    if (!sessionId) {
      sessionId =
        "session_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem("mat_simulator_session_id", sessionId);
    }
    return sessionId;
  }

  // 取得 mat_presses 歷史
  async getMatPressHistory(limit = 50) {
    if (!this.initialized) {
      console.warn("Firebase not initialized");
      return [];
    }

    try {
      const pressesRef = this.db.ref("mat_presses");
      const snapshot = await pressesRef
        .orderByChild("date")
        .limitToLast(limit)
        .once("value");

      const history = [];
      snapshot.forEach((childSnapshot) => {
        history.push({
          id: childSnapshot.key,
          ...childSnapshot.val(),
        });
      });

      return history.reverse();
    } catch (error) {
      console.error("Failed to get history:", error);
      return [];
    }
  }
}

// 建立全域 Firebase 管理器實例
const firebaseManager = new FirebaseManager();
