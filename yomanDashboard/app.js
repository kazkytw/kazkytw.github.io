/**
 * SlotMachine Analytics Dashboard
 * Firebase Firestore 資料讀取與視覺化
 */

// ===== Firebase Configuration =====
const firebaseConfig = {
    apiKey: "AIzaSyC8EJaqa55KRH_yBBUfSlWzf1wIFUPWhjc",
    authDomain: "slotmachine-yoman.firebaseapp.com",
    projectId: "slotmachine-yoman",
    storageBucket: "slotmachine-yoman.firebasestorage.app",
    messagingSenderId: "685711453250",
    appId: "1:685711453250:web:7433c54e95c34ae457d1db",
    measurementId: "G-J87HHFBDDV"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ===== Configuration =====
const CONFIG = {
    projectId: 'slotmachine-yoman',
    collection: 'analytics',
    pageSize: 10
};

// ===== State Management =====
const state = {
    allData: [],
    filteredData: [],
    currentPage: 1,
    sortField: 'timestamp',
    sortDirection: 'desc',
    searchQuery: '',
    dateRange: 'today',
    customStartDate: null,
    customEndDate: null,
    currentSection: 'dashboard',
    selectedDevices: new Set(),
    currentUser: null
};

// ===== Chart Instances =====
let dailyPlaysChart = null;
let hourlyHeatmapChart = null;
let amountDistChart = null;

// ===== DOM Elements =====
const elements = {
    loadingOverlay: document.getElementById('loadingOverlay'),
    connectionStatus: document.getElementById('connectionStatus'),
    totalPlays: document.getElementById('totalPlays'),
    totalAmount: document.getElementById('totalAmount'),
    dataTableBody: document.getElementById('dataTableBody'),
    pagination: document.getElementById('pagination'),
    showingFrom: document.getElementById('showingFrom'),
    showingTo: document.getElementById('showingTo'),
    totalRecords: document.getElementById('totalRecords'),
    searchInput: document.getElementById('searchInput'),
    toastContainer: document.getElementById('toastContainer')
};

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', init);

function init() {
    setupGoogleLoginListener();
    
    // Listen for auth state changes
    auth.onAuthStateChanged((user) => {
        if (user) {
            state.currentUser = user;
            hideLoginOverlay();
            startDashboard();
            console.log('Logged in as:', user.email);
        } else {
            state.currentUser = null;
            showLoginOverlay();
        }
    });
}

function setupGoogleLoginListener() {
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    const loginError = document.getElementById('loginError');
    const loginInfo = document.getElementById('loginInfo');
    
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', async () => {
            try {
                loginInfo.textContent = '正在連接 Google...';
                loginError.textContent = '';
                
                const provider = new firebase.auth.GoogleAuthProvider();
                await auth.signInWithPopup(provider);
            } catch (error) {
                console.error('Login error:', error);
                loginInfo.textContent = '';
                
                if (error.code === 'auth/popup-closed-by-user') {
                    loginError.textContent = '登入取消';
                } else if (error.code === 'auth/unauthorized-domain') {
                    loginError.textContent = '此網域未授權，請在 Firebase Console 加入';
                } else {
                    loginError.textContent = '登入失敗: ' + error.message;
                }
            }
        });
    }
}

function hideLoginOverlay() {
    const loginOverlay = document.getElementById('loginOverlay');
    if (loginOverlay) {
        loginOverlay.classList.add('hidden');
    }
}

function showLoginOverlay() {
    const loginOverlay = document.getElementById('loginOverlay');
    if (loginOverlay) {
        loginOverlay.classList.remove('hidden');
    }
}

async function startDashboard() {
    setupEventListeners();
    setDefaultDates();
    await fetchData();
}

function setupEventListeners() {
    // Navigation items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            handleNavigation(item.dataset.section);
        });
    });

    // Mobile menu toggle
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', toggleMobileMenu);
    }

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => handleFilterChange(btn));
    });

    // Apply custom date range
    document.getElementById('applyDateRange').addEventListener('click', handleCustomDateRange);

    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', () => fetchData());

    // Search input
    elements.searchInput.addEventListener('input', debounce(handleSearch, 300));

    // Export CSV
    document.getElementById('exportCSV').addEventListener('click', exportToCSV);

    // Export Excel
    const exportExcelBtn = document.getElementById('exportExcel');
    if (exportExcelBtn) {
        exportExcelBtn.addEventListener('click', exportToExcel);
    }

    // Device filter buttons
    document.getElementById('selectAllDevices')?.addEventListener('click', selectAllDevices);
    document.getElementById('deselectAllDevices')?.addEventListener('click', deselectAllDevices);

    // Table sorting
    document.querySelectorAll('.sortable').forEach(th => {
        th.addEventListener('click', () => handleSort(th.dataset.sort));
    });

    // Chart toggle
    document.querySelectorAll('.chart-toggle').forEach(btn => {
        btn.addEventListener('click', () => handleChartToggle(btn));
    });
}

// ===== Navigation =====
function handleNavigation(section) {
    state.currentSection = section;
    
    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.section === section);
    });

    // Update page title
    const titles = {
        'dashboard': { title: '儀表板', subtitle: '即時監控老虎機遊戲數據' },
        'records': { title: '紀錄明細', subtitle: '查看完整遊玩歷史紀錄' },
        'export': { title: '匯出報表', subtitle: '下載資料報表' }
    };
    
    const pageTitle = document.querySelector('.page-title');
    const pageSubtitle = document.querySelector('.page-subtitle');
    if (titles[section]) {
        pageTitle.textContent = titles[section].title;
        pageSubtitle.textContent = titles[section].subtitle;
    }

    // Show/hide sections based on navigation
    const statsGrid = document.querySelector('.stats-grid');
    const chartsSection = document.querySelector('.charts-section');
    const tableSection = document.querySelector('.table-section');
    const exportSection = document.getElementById('exportSection');

    switch (section) {
        case 'dashboard':
            statsGrid.style.display = 'grid';
            chartsSection.style.display = 'grid';
            tableSection.style.display = 'none';  // Hide table on dashboard
            if (exportSection) exportSection.style.display = 'none';
            break;
        case 'records':
            statsGrid.style.display = 'none';
            chartsSection.style.display = 'none';
            tableSection.style.display = 'block';
            if (exportSection) exportSection.style.display = 'none';
            break;
        case 'export':
            statsGrid.style.display = 'none';
            chartsSection.style.display = 'none';
            tableSection.style.display = 'none';
            if (exportSection) exportSection.style.display = 'block';
            break;
    }

    // Close mobile menu if open
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.remove('open');
}

function toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('open');
}

function setDefaultDates() {
    const today = new Date();
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    
    endDate.value = formatDateForInput(today);
    startDate.value = formatDateForInput(new Date(today.setDate(today.getDate() - 7)));
}

// ===== Data Fetching =====
async function fetchData() {
    showLoading(true);
    updateConnectionStatus('connecting');
    
    try {
        // Use Firebase SDK instead of REST API (respects security rules)
        const snapshot = await db.collection(CONFIG.collection).get();
        
        state.allData = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                timestamp: data.timestamp || '',
                amount: parseInt(data.amount || 0),
                device: data.device || 'Unknown',
                createdAt: data.createdAt || ''
            };
        }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        updateConnectionStatus('connected');
        showToast('success', `成功載入 ${state.allData.length} 筆資料`);
        
        applyFilters();
        updateDashboard();
        
    } catch (error) {
        console.error('Fetch error:', error);
        updateConnectionStatus('error');
        
        if (error.code === 'permission-denied') {
            showToast('error', '沒有權限讀取資料，請確認您的帳號已被授權');
        } else {
            showToast('error', '載入資料失敗: ' + error.message);
        }
        
        // Show empty state
        state.allData = [];
        state.filteredData = [];
        updateDashboard();
    } finally {
        showLoading(false);
    }
}

// ===== Filtering =====
function handleFilterChange(btn) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.dateRange = btn.dataset.range;
    state.currentPage = 1;
    
    applyFilters();
    updateDashboard();
}

function handleCustomDateRange() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (!startDate || !endDate) {
        showToast('error', '請選擇開始和結束日期');
        return;
    }
    
    state.customStartDate = new Date(startDate);
    state.customEndDate = new Date(endDate);
    state.customEndDate.setHours(23, 59, 59, 999);
    state.dateRange = 'custom';
    
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    state.currentPage = 1;
    
    applyFilters();
    updateDashboard();
    showToast('info', `已篩選 ${startDate} ~ ${endDate}`);
}

function applyFilters() {
    let data = [...state.allData];
    
    // Date filter
    const now = new Date();
    let startDate, endDate;
    
    switch (state.dateRange) {
        case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 1);
            break;
        case 'week':
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 7);
            endDate = now;
            break;
        case 'month':
            startDate = new Date(now);
            startDate.setMonth(now.getMonth() - 1);
            endDate = now;
            break;
        case 'custom':
            startDate = state.customStartDate;
            endDate = state.customEndDate;
            break;
        case 'all':
        default:
            startDate = new Date(0);
            endDate = new Date();
            break;
    }
    
    data = data.filter(item => {
        const itemDate = new Date(item.timestamp);
        return itemDate >= startDate && itemDate <= endDate;
    });
    
    // Search filter
    if (state.searchQuery) {
        const query = state.searchQuery.toLowerCase();
        data = data.filter(item => 
            item.device.toLowerCase().includes(query) ||
            item.timestamp.includes(query)
        );
    }
    
    // Device filter - always apply if filter has been initialized
    if (deviceFilterInitialized) {
        data = data.filter(item => state.selectedDevices.has(item.device));
    }
    
    // Sort
    data.sort((a, b) => {
        let aVal = a[state.sortField];
        let bVal = b[state.sortField];
        
        if (state.sortField === 'timestamp') {
            aVal = new Date(aVal);
            bVal = new Date(bVal);
        }
        
        if (state.sortDirection === 'asc') {
            return aVal > bVal ? 1 : -1;
        } else {
            return aVal < bVal ? 1 : -1;
        }
    });
    
    state.filteredData = data;
}

function handleSearch(e) {
    state.searchQuery = e.target.value;
    state.currentPage = 1;
    applyFilters();
    updateTable();
}

// ===== Device Filter =====
let deviceFilterInitialized = false;

function updateDeviceFilter() {
    const deviceList = document.getElementById('deviceList');
    const deviceFilterStats = document.getElementById('deviceFilterStats');
    if (!deviceList) return;
    
    // Get all unique devices from all data (not filtered)
    const devices = [...new Set(state.allData.map(item => item.device))].sort();
    
    // Only auto-select all devices on first initialization
    if (!deviceFilterInitialized && devices.length > 0) {
        devices.forEach(device => state.selectedDevices.add(device));
        deviceFilterInitialized = true;
    }
    
    deviceList.innerHTML = devices.map(device => `
        <label class="device-checkbox">
            <input type="checkbox" 
                   value="${device}" 
                   ${state.selectedDevices.has(device) ? 'checked' : ''}
                   onchange="handleDeviceToggle('${device}', this.checked)">
            <span class="device-checkbox-label">${device}</span>
            <span class="device-count">(${state.allData.filter(d => d.device === device).length})</span>
        </label>
    `).join('');
    
    // Update selected devices stats
    if (deviceFilterStats) {
        const selectedCount = state.selectedDevices.size;
        const totalDevices = devices.length;
        const selectedPlays = state.allData.filter(d => state.selectedDevices.has(d.device)).length;
        const selectedAmount = state.allData.filter(d => state.selectedDevices.has(d.device)).reduce((sum, d) => sum + d.amount, 0);
        
        deviceFilterStats.innerHTML = `
            <div class="device-stats-row">
                <span class="device-stats-label">📊 已選擇 <strong>${selectedCount}</strong> / ${totalDevices} 個裝置</span>
                <span class="device-stats-divider">|</span>
                <span class="device-stats-value">🎮 共 <strong>${formatNumber(selectedPlays)}</strong> 次遊玩</span>
                <span class="device-stats-divider">|</span>
                <span class="device-stats-value">💰 獎品總額 <strong>$${formatNumber(selectedAmount)}</strong></span>
            </div>
        `;
    }
}

function selectAllDevices() {
    const devices = [...new Set(state.allData.map(item => item.device))];
    state.selectedDevices = new Set(devices);
    updateDeviceFilter();
    state.currentPage = 1;
    applyFilters();
    updateDashboard();
    showToast('info', '已選取所有裝置');
}

function deselectAllDevices() {
    state.selectedDevices.clear();
    updateDeviceFilter();
    state.currentPage = 1;
    applyFilters();
    updateDashboard();
    showToast('info', '已取消選取所有裝置');
}

function handleDeviceToggle(device, isChecked) {
    if (isChecked) {
        state.selectedDevices.add(device);
    } else {
        state.selectedDevices.delete(device);
    }
    state.currentPage = 1;
    applyFilters();
    updateDashboard();
}

// Make device toggle global
window.handleDeviceToggle = handleDeviceToggle;

function handleSort(field) {
    if (state.sortField === field) {
        state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        state.sortField = field;
        state.sortDirection = 'desc';
    }
    
    // Update sort icons
    document.querySelectorAll('.sortable').forEach(th => {
        th.classList.remove('sorted-asc', 'sorted-desc');
        if (th.dataset.sort === field) {
            th.classList.add(`sorted-${state.sortDirection}`);
        }
    });
    
    applyFilters();
    updateTable();
}

// ===== Dashboard Updates =====
function updateDashboard() {
    updateStats();
    updateCharts();
    updateDeviceFilter();
    updateTable();
}

function updateStats() {
    const data = state.filteredData;
    
    // Total plays
    const totalPlays = data.length;
    elements.totalPlays.textContent = formatNumber(totalPlays);
    
    // Total amount
    const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);
    elements.totalAmount.textContent = `$${formatNumber(totalAmount)}`;
}

function updateCharts() {
    updateDailyPlaysChart();
    updateHourlyHeatmap();
    updateAmountDistChart();
}

function updateDailyPlaysChart() {
    const ctx = document.getElementById('dailyPlaysChart').getContext('2d');
    
    // Aggregate by date
    const dailyData = {};
    state.filteredData.forEach(item => {
        const date = item.timestamp.split(' ')[0];
        dailyData[date] = (dailyData[date] || 0) + 1;
    });
    
    const sortedDates = Object.keys(dailyData).sort();
    const labels = sortedDates;
    const values = sortedDates.map(date => dailyData[date]);
    
    if (dailyPlaysChart) {
        dailyPlaysChart.destroy();
    }
    
    const isLineChart = document.querySelector('.chart-toggle.active')?.dataset.chart === 'line';
    
    dailyPlaysChart = new Chart(ctx, {
        type: isLineChart ? 'line' : 'bar',
        data: {
            labels,
            datasets: [{
                label: '遊玩次數',
                data: values,
                borderColor: '#9f7aea',
                backgroundColor: isLineChart 
                    ? 'rgba(159, 122, 234, 0.1)' 
                    : 'rgba(159, 122, 234, 0.6)',
                borderWidth: 2,
                fill: isLineChart,
                tension: 0.4,
                pointBackgroundColor: '#9f7aea',
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#64748b' }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#64748b' }
                }
            }
        }
    });
}

function updateHourlyHeatmap() {
    const ctx = document.getElementById('hourlyHeatmap').getContext('2d');
    
    // Aggregate by hour
    const hourlyData = new Array(24).fill(0);
    state.filteredData.forEach(item => {
        const timePart = item.timestamp.split(' ')[1];
        if (timePart) {
            const hour = parseInt(timePart.split(':')[0]);
            if (!isNaN(hour)) {
                hourlyData[hour]++;
            }
        }
    });
    
    const labels = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
    const maxValue = Math.max(...hourlyData, 1);
    
    // Generate gradient colors based on value
    const backgroundColors = hourlyData.map(val => {
        const intensity = val / maxValue;
        return `rgba(159, 122, 234, ${0.2 + intensity * 0.8})`;
    });
    
    if (hourlyHeatmapChart) {
        hourlyHeatmapChart.destroy();
    }
    
    hourlyHeatmapChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                data: hourlyData,
                backgroundColor: backgroundColors,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#64748b', maxRotation: 45 }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#64748b' }
                }
            }
        }
    });
}

function updateAmountDistChart() {
    const ctx = document.getElementById('amountDistChart').getContext('2d');
    
    // Aggregate by fixed amount values (100, 150, 200)
    const amounts = {
        '$100': 0,
        '$150': 0,
        '$200': 0
    };
    
    state.filteredData.forEach(item => {
        const amt = item.amount;
        if (amt === 100) amounts['$100']++;
        else if (amt === 150) amounts['$150']++;
        else if (amt === 200) amounts['$200']++;
    });
    
    if (amountDistChart) {
        amountDistChart.destroy();
    }
    
    amountDistChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(amounts),
            datasets: [{
                data: Object.values(amounts),
                backgroundColor: [
                    '#48bb78',  // Green for $100
                    '#9f7aea',  // Purple for $150
                    '#f5576c'   // Pink for $200
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: '#a0aec0', padding: 16, font: { size: 14 } }
                }
            },
            cutout: '60%'
        }
    });
}

function handleChartToggle(btn) {
    document.querySelectorAll('.chart-toggle').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    updateDailyPlaysChart();
}

// ===== Table =====
function updateTable() {
    const data = state.filteredData;
    const start = (state.currentPage - 1) * CONFIG.pageSize;
    const end = start + CONFIG.pageSize;
    const pageData = data.slice(start, end);
    
    // Update table body
    if (pageData.length === 0) {
        elements.dataTableBody.innerHTML = `
            <tr>
                <td colspan="3">
                    <div class="empty-state">
                        <div class="empty-state-icon">📭</div>
                        <div class="empty-state-title">沒有資料</div>
                    </div>
                </td>
            </tr>
        `;
    } else {
        elements.dataTableBody.innerHTML = pageData.map(item => `
            <tr>
                <td>${formatTimestamp(item.timestamp)}</td>
                <td><span class="amount-badge ${getAmountClass(item.amount)}">💰 $${formatNumber(item.amount)}</span></td>
                <td><span class="device-tag">📱 ${item.device}</span></td>
            </tr>
        `).join('');
    }
    
    // Update pagination info
    elements.showingFrom.textContent = data.length > 0 ? start + 1 : 0;
    elements.showingTo.textContent = Math.min(end, data.length);
    elements.totalRecords.textContent = data.length;
    
    // Update pagination buttons
    updatePagination();
}

function updatePagination() {
    const totalPages = Math.ceil(state.filteredData.length / CONFIG.pageSize);
    
    if (totalPages <= 1) {
        elements.pagination.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Previous button
    html += `<button ${state.currentPage === 1 ? 'disabled' : ''} onclick="goToPage(${state.currentPage - 1})">◀</button>`;
    
    // Page numbers
    const maxVisible = 5;
    let startPage = Math.max(1, state.currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    if (startPage > 1) {
        html += `<button onclick="goToPage(1)">1</button>`;
        if (startPage > 2) html += `<button disabled>...</button>`;
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="${i === state.currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += `<button disabled>...</button>`;
        html += `<button onclick="goToPage(${totalPages})">${totalPages}</button>`;
    }
    
    // Next button
    html += `<button ${state.currentPage === totalPages ? 'disabled' : ''} onclick="goToPage(${state.currentPage + 1})">▶</button>`;
    
    elements.pagination.innerHTML = html;
}

function goToPage(page) {
    state.currentPage = page;
    updateTable();
}

// Make goToPage global for onclick handlers
window.goToPage = goToPage;

// ===== Export =====
function exportToCSV() {
    if (state.filteredData.length === 0) {
        showToast('error', '沒有資料可匯出');
        return;
    }
    
    const headers = ['時間', '獎品金額', '裝置'];
    const rows = state.filteredData.map(item => [
        item.timestamp,
        item.amount,
        item.device
    ]);
    
    let csvContent = '\uFEFF'; // BOM for UTF-8
    csvContent += headers.join(',') + '\n';
    csvContent += rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `slotmachine_analytics_${formatDateForFile(new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    showToast('success', `成功匯出 ${state.filteredData.length} 筆資料 (CSV)`);
}

function exportToExcel() {
    if (state.filteredData.length === 0) {
        showToast('error', '沒有資料可匯出');
        return;
    }
    
    // Use HTML table format - Excel can open this reliably
    const headers = ['時間', '獎品金額', '裝置'];
    const rows = state.filteredData.map(item => [
        item.timestamp,
        item.amount,
        item.device
    ]);
    
    let htmlContent = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="UTF-8">
<style>
    table { border-collapse: collapse; }
    th { background-color: #9f7aea; color: white; font-weight: bold; padding: 10px; border: 1px solid #ccc; }
    td { padding: 8px; border: 1px solid #ccc; }
    .amount { text-align: right; }
</style>
</head>
<body>
<table>
    <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
    ${rows.map(row => `<tr>
        <td>${row[0]}</td>
        <td class="amount">$${row[1]}</td>
        <td>${row[2]}</td>
    </tr>`).join('')}
</table>
</body>
</html>`;
    
    const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `slotmachine_analytics_${formatDateForFile(new Date())}.xls`;
    link.click();
    URL.revokeObjectURL(url);
    
    showToast('success', `成功匯出 ${state.filteredData.length} 筆資料 (Excel)`);
}

// ===== UI Helpers =====
function showLoading(show) {
    elements.loadingOverlay.classList.toggle('hidden', !show);
}

function updateConnectionStatus(status) {
    const statusDot = elements.connectionStatus.querySelector('.status-dot');
    const statusText = elements.connectionStatus.querySelector('.status-text');
    
    statusDot.classList.remove('connected', 'error');
    
    switch (status) {
        case 'connected':
            statusDot.classList.add('connected');
            statusText.textContent = '已連線';
            break;
        case 'error':
            statusDot.classList.add('error');
            statusText.textContent = '連線失敗';
            break;
        default:
            statusText.textContent = '連線中...';
    }
}

function showToast(type, message) {
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type]}</span>
        <span class="toast-message">${message}</span>
    `;
    
    elements.toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ===== Utility Functions =====
function formatNumber(num) {
    return num.toLocaleString('zh-TW');
}

function formatTimestamp(timestamp) {
    if (!timestamp) return '-';
    return timestamp;
}

function formatDateForInput(date) {
    return date.toISOString().split('T')[0];
}

function formatDateForFile(date) {
    return date.toISOString().split('T')[0].replace(/-/g, '');
}

function getAmountClass(amount) {
    if (amount === 100) return 'amount-low';
    if (amount === 150) return 'amount-medium';
    return 'amount-high';  // 200
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
