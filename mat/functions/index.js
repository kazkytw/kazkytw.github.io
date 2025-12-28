// Cloud Functions (optional) - for Plan 2
// 1) Send FCM push when LEAVE_BED or ABNORMAL_SLEEP is written to sleep_events
// 2) (Optional) Generate weekly reports on schedule

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.onSleepEvent = functions.database.ref('/sleep_events/{pushId}')
  .onCreate(async (snapshot, context) => {
    const ev = snapshot.val();
    if (!ev || !ev.eventType) return null;

    // TODO: decide who to notify:
    // Option A: store caregiver tokens under caregiver_tokens/{elderId}/{tokenId} = {token}
    // Option B: store tokens in a list and filter by elderId
    const elderId = ev.elderId || 'unknown';
    const tokensSnap = await admin.database().ref(`caregiver_tokens/${elderId}`).once('value');
    if (!tokensSnap.exists()) return null;

    const tokens = [];
    tokensSnap.forEach(child => {
      const v = child.val();
      if (v && v.token) tokens.push(v.token);
    });
    if (tokens.length === 0) return null;

    let title = 'SmartMat 通知';
    let body = '';
    if (ev.eventType === 'LEAVE_BED') {
      title = '離床提醒';
      body = `${elderId} 已離床，請留意跌倒風險。`;
    } else if (ev.eventType === 'ABNORMAL_SLEEP') {
      title = '異常睡眠提醒';
      body = `${elderId} 偵測到異常睡眠指標，建議查看週報或關懷長者。`;
    } else {
      return null;
    }

    const message = {
      notification: { title, body },
      tokens
    };

    const res = await admin.messaging().sendEachForMulticast(message);
    console.log('FCM sent:', res.successCount, 'success,', res.failureCount, 'fail');
    return null;
  });
