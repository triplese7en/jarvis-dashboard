// Dashboard Logic - Updates UI with system metrics

let currentMetrics = null;
let currentServices = null;
let autoRefreshInterval = null;

// DOM Elements
const elements = {
    cpuValue: document.getElementById('cpuValue'),
    cpuCores: document.getElementById('cpuCores'),
    cpuFreq: document.getElementById('cpuFreq'),
    cpuProgress: document.getElementById('cpuProgress'),
    memoryValue: document.getElementById('memoryValue'),
    memoryUsed: document.getElementById('memoryUsed'),
    memorySwap: document.getElementById('memorySwap'),
    memoryProgress: document.getElementById('memoryProgress'),
    diskValue: document.getElementById('diskValue'),
    diskFree: document.getElementById('diskFree'),
    diskUsed: document.getElementById('diskUsed'),
    diskProgress: document.getElementById('diskProgress'),
    tempValue: document.getElementById('tempValue'),
    tempStatus: document.getElementById('tempStatus'),
    networkSent: document.getElementById('networkSent'),
    networkRecv: document.getElementById('networkRecv'),
    uptimeValue: document.getElementById('uptimeValue'),
    bootTime: document.getElementById('bootTime'),
    lastUpdated: document.getElementById('lastUpdated'),
    alertsSection: document.getElementById('alertsSection'),
    alertsList: document.getElementById('alertsList'),
    servicesGrid: document.getElementById('servicesGrid'),
    refreshBtn: document.getElementById('refreshBtn')
};

// Initialize
function init() {
    setupEventListeners();
    updateDashboard();
    startAutoRefresh();
}

// Setup Event Listeners
function setupEventListeners() {
    elements.refreshBtn.addEventListener('click', () => {
        refreshBtnAnimation();
        updateDashboard();
    });
}

// Refresh Button Animation
function refreshBtnAnimation() {
    elements.refreshBtn.style.transform = 'rotate(360deg)';
    setTimeout(() => {
        elements.refreshBtn.style.transform = '';
    }, 500);
}

// Update Dashboard
async function updateDashboard() {
    try {
        // Fetch all data in parallel
        const [metricsResponse, servicesResponse] = await Promise.all([
            fetch('/api/metrics'),
            fetch('/api/services')
        ]);

        const metricsData = await metricsResponse.json();
        const servicesData = await servicesResponse.json();

        if (metricsData.success) {
            updateMetrics(metricsData.data);
        }

        if (servicesData.success) {
            updateServices(servicesData.data);
        }

        // Update timestamp
        updateLastUpdated();

    } catch (error) {
        console.error('Error updating dashboard:', error);
        showErrorState();
    }
}

// Update System Metrics
function updateMetrics(metrics) {
    currentMetrics = metrics;

    // CPU
    if (metrics.cpu) {
        const cpuPercent = metrics.cpu.percent;
        elements.cpuValue.textContent = `${cpuPercent.toFixed(1)}%`;
        elements.cpuCores.textContent = metrics.cpu.count;
        elements.cpuProgress.style.width = `${cpuPercent}%`;

        // Color code progress
        if (cpuPercent > 80) {
            elements.cpuProgress.style.background = '#ef4444';
        } else if (cpuPercent > 60) {
            elements.cpuProgress.style.background = '#f59e0b';
        } else {
            elements.cpuProgress.style.background = '#10b981';
        }

        // CPU Frequency
        if (metrics.cpu.frequency && metrics.cpu.frequency.current) {
            const freq = metrics.cpu.frequency.current;
            elements.cpuFreq.textContent = freq ? `${freq.toFixed(0)} MHz` : '--';
        }
    }

    // Memory
    if (metrics.memory) {
        const memPercent = metrics.memory.percent;
        const memUsed = metrics.memory.used;
        const memSwap = metrics.memory.swap_used;

        elements.memoryValue.textContent = `${memPercent.toFixed(1)}%`;
        elements.memoryUsed.textContent = formatBytes(memUsed);
        elements.memorySwap.textContent = memSwap > 0 ? formatBytes(memSwap) : 'None';
        elements.memoryProgress.style.width = `${memPercent}%`;

        // Color code progress
        if (memPercent > 85) {
            elements.memoryProgress.style.background = '#ef4444';
        } else if (memPercent > 70) {
            elements.memoryProgress.style.background = '#f59e0b';
        } else {
            elements.memoryProgress.style.background = '#10b981';
        }
    }

    // Disk
    if (metrics.disk) {
        const diskPercent = metrics.disk.percent;
        const diskFree = metrics.disk.free;
        const diskUsed = metrics.disk.used;

        elements.diskValue.textContent = `${diskPercent.toFixed(1)}%`;
        elements.diskFree.textContent = formatBytes(diskFree);
        elements.diskUsed.textContent = formatBytes(diskUsed);
        elements.diskProgress.style.width = `${diskPercent}%`;

        // Color code progress
        if (diskPercent > 90) {
            elements.diskProgress.style.background = '#ef4444';
        } else if (diskPercent > 75) {
            elements.diskProgress.style.background = '#f59e0b';
        } else {
            elements.diskProgress.style.background = '#10b981';
        }
    }

    // Temperature
    if (metrics.temperature && metrics.temperature.current) {
        const temp = metrics.temperature.current;
        elements.tempValue.textContent = `${temp.toFixed(1)}°C`;

        // Temperature status
        if (temp > 75) {
            elements.tempStatus.textContent = '🔴 High';
            elements.tempStatus.className = 'detail-value temp-status-danger';
        } else if (temp > 65) {
            elements.tempStatus.textContent = '🟡 Warm';
            elements.tempStatus.className = 'detail-value temp-status-warning';
        } else {
            elements.tempStatus.textContent = '🟢 Normal';
            elements.tempStatus.className = 'detail-value temp-status-normal';
        }
    }

    // Network
    if (metrics.network) {
        const sent = metrics.network.bytes_sent;
        const recv = metrics.network.bytes_recv;

        elements.networkSent.textContent = formatBytes(sent);
        elements.networkRecv.textContent = formatBytes(recv);
    }

    // Uptime
    if (metrics.uptime) {
        const uptime = metrics.uptime.uptime_formatted;
        const boot = metrics.uptime.boot;

        elements.uptimeValue.textContent = uptime;
        elements.bootTime.textContent = formatDate(boot);
    }
}

// Update Services
function updateServices(services) {
    currentServices = services;
    elements.servicesGrid.innerHTML = '';

    Object.entries(services).forEach(([serviceId, serviceData]) => {
        const card = createServiceCard(serviceId, serviceData);
        elements.servicesGrid.appendChild(card);
    });
}

// Create Service Card
function createServiceCard(serviceId, service) {
    const card = document.createElement('div');
    card.className = 'service-card';

    const statusClass = service.status || 'unknown';
    const statusIcon = getStatusIcon(statusClass);

    card.innerHTML = `
        <div class="service-status ${statusClass}" title="${statusClass}"></div>
        <div class="service-info">
            <div class="service-name">${service.name}</div>
            <div class="service-details">${statusClass.toUpperCase()}</div>
        </div>
    `;

    return card;
}

// Get Status Icon
function getStatusIcon(status) {
    const icons = {
        'running': '●',
        'stopped': '●',
        'error': '●',
        'unknown': '●'
    };
    return icons[status] || '●';
}

// Update Last Updated
function updateLastUpdated() {
    const now = new Date();
    elements.lastUpdated.textContent = `Updated: ${now.toLocaleTimeString()}`;
}

// Start Auto Refresh
function startAutoRefresh() {
    // Refresh every 5 seconds
    autoRefreshInterval = setInterval(() => {
        updateDashboard();
    }, 5000);
}

// Stop Auto Refresh
function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

// Show Error State
function showErrorState() {
    elements.cpuValue.textContent = 'Error';
    elements.memoryValue.textContent = 'Error';
    elements.diskValue.textContent = 'Error';
}

// Format Bytes
function formatBytes(bytes) {
    if (!bytes) return '--';

    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const formatted = bytes / Math.pow(1024, i);

    if (i === 0) return `${formatted.toFixed(0)} B`;
    return `${formatted.toFixed(1)} ${sizes[i]}`;
}

// Format Date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Check for Alerts
async function checkAlerts() {
    try {
        const response = await fetch('/api/alerts');
        const data = await response.json();

        if (data.success && data.count > 0) {
            displayAlerts(data.data);
        } else {
            hideAlerts();
        }
    } catch (error) {
        console.error('Error checking alerts:', error);
    }
}

// Display Alerts
function displayAlerts(alerts) {
    elements.alertsList.innerHTML = '';

    alerts.forEach(alert => {
        const alertItem = document.createElement('div');
        alertItem.className = 'alert-item';
        alertItem.innerHTML = `
            <div class="alert-item-text">${alert.metric}: ${alert.value} (threshold: ${alert.threshold})</div>
            <div class="alert-item-value">⚠️</div>
        `;
        elements.alertsList.appendChild(alertItem);
    });

    elements.alertsSection.style.display = 'block';
}

// Hide Alerts
function hideAlerts() {
    elements.alertsSection.style.display = 'none';
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
