/**
 * AquaSense - IoT Water Quality Monitoring Dashboard
 * Core Logic & Simulation Engine
 */

// Global Dashboard State
const state = {
  activeStation: 'kaveri',
  realTimeWindowSize: 20, // number of points to show on the live chart
  currentTelemetry: {},
  historicalLogs: [],
  filteredLogs: [],
  currentPage: 1,
  rowsPerPage: 10,
  chartType: 'all', // 'all', 'ph', 'tds', 'temp'
  simulationInterval: null,
  map: null,
  markers: {},
  chart: null,
  recentBuffer: [], // Stores live incoming records
  pathIndex: 0,
  activePolyline: null,
  latency: 24
};

// Station Configuration
const STATIONS = {
  kaveri: {
    id: 'kaveri',
    name: 'Kaveri River (Srirangapatna)',
    coords: [12.4233, 76.6948],
    source: 'River Basin (Freshwater)',
    wqi: 94,
    nodeId: 'IoT-node-309-kvr',
    base: { ph: 7.35, tds: 145, temp: 24.2 },
    ranges: {
      ph: { min: 6.8, max: 7.6, safeMin: 6.5, safeMax: 8.5 },
      tds: { min: 120, max: 180, safeMax: 300 },
      temp: { min: 22.0, max: 26.5, safeMin: 15.0, safeMax: 30.0 }
    },
    path: [
      [12.4233, 76.6948],
      [12.4241, 76.6961],
      [12.4248, 76.6975],
      [12.4253, 76.6990],
      [12.4251, 76.7011],
      [12.4243, 76.7025],
      [12.4230, 76.7031],
      [12.4218, 76.7020],
      [12.4210, 76.7001],
      [12.4220, 76.6970],
      [12.4228, 76.6953]
    ]
  },
  kukkarahalli: {
    id: 'kukkarahalli',
    name: 'Kukkarahalli Lake (Mysore)',
    coords: [12.3082, 76.6265],
    source: 'Urban Wetland Lake',
    wqi: 68,
    nodeId: 'IoT-node-412-kkh',
    base: { ph: 8.24, tds: 292, temp: 26.8 },
    ranges: {
      ph: { min: 7.6, max: 8.9, safeMin: 6.5, safeMax: 8.5 },
      tds: { min: 250, max: 370, safeMax: 300 },
      temp: { min: 24.5, max: 30.5, safeMin: 15.0, safeMax: 30.0 }
    },
    path: [
      [12.3082, 76.6265],
      [12.3090, 76.6280],
      [12.3081, 76.6295],
      [12.3070, 76.6301],
      [12.3058, 76.6293],
      [12.3045, 76.6285],
      [12.3039, 76.6268],
      [12.3048, 76.6250],
      [12.3060, 76.6241],
      [12.3072, 76.6252]
    ]
  },
  kabini: {
    id: 'kabini',
    name: 'Kabini Reservoir (H.D. Kote)',
    coords: [12.0225, 76.3490],
    source: 'Forest-fed Catchment',
    wqi: 97,
    nodeId: 'IoT-node-104-kbn',
    base: { ph: 7.12, tds: 88, temp: 21.6 },
    ranges: {
      ph: { min: 6.7, max: 7.3, safeMin: 6.5, safeMax: 8.5 },
      tds: { min: 70, max: 110, safeMax: 300 },
      temp: { min: 20.0, max: 23.8, safeMin: 15.0, safeMax: 30.0 }
    },
    path: [
      [12.0225, 76.3490],
      [12.0238, 76.3508],
      [12.0251, 76.3528],
      [12.0265, 76.3540],
      [12.0270, 76.3512],
      [12.0255, 76.3485],
      [12.0235, 76.3468],
      [12.0215, 76.3450],
      [12.0195, 76.3470],
      [12.0210, 76.3480]
    ]
  }
};

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', () => {
  initClock();
  generateHistoricalData();
  initMap();
  initChart();
  
  // Load initial station data
  switchStation(state.activeStation);
  
  // Set up event listeners
  document.getElementById('stationSelect').addEventListener('change', (e) => {
    switchStation(e.target.value);
  });
  
  document.getElementById('filterStatus').addEventListener('change', applyFilters);
  document.getElementById('filterDate').addEventListener('change', applyFilters);
  
  document.getElementById('prevPageBtn').addEventListener('click', () => changePage(-1));
  document.getElementById('nextPageBtn').addEventListener('click', () => changePage(1));
  
  document.getElementById('exportCsvBtn').addEventListener('click', exportToCSV);
  
  // Chart tab switching
  document.querySelectorAll('.btn-tab').forEach(button => {
    button.addEventListener('click', (e) => {
      if (button.classList.contains('btn-ai-tab')) return;
      document.querySelectorAll('.btn-tab').forEach(b => {
        if (!b.classList.contains('btn-ai-tab')) b.classList.remove('active');
      });
      button.classList.add('active');
      state.chartType = button.getAttribute('data-chart');
      updateChartConfig();
    });
  });

  // AI Tab Switching
  document.querySelectorAll('.btn-ai-tab').forEach(button => {
    button.addEventListener('click', (e) => {
      document.querySelectorAll('.btn-ai-tab').forEach(b => b.classList.remove('active'));
      button.classList.add('active');
      
      const tabId = button.getAttribute('data-tab');
      document.querySelectorAll('.ai-tab-content').forEach(content => {
        content.classList.remove('active');
      });
      document.getElementById(`tab-${tabId}`).classList.add('active');
    });
  });

  // Pitch Deck Carousel
  let currentSlide = 1;
  const totalSlides = 5;
  
  function showSlide(index) {
    currentSlide = index;
    document.querySelectorAll('.pitch-slide').forEach(slide => {
      slide.classList.remove('active');
    });
    const targetSlide = document.querySelector(`.pitch-slide[data-slide="${index}"]`);
    if (targetSlide) targetSlide.classList.add('active');
    
    // Update dots
    document.querySelectorAll('.carousel-dots .dot').forEach(dot => {
      dot.classList.remove('active');
    });
    const targetDot = document.querySelector(`.carousel-dots .dot[data-slide="${index}"]`);
    if (targetDot) targetDot.classList.add('active');
  }
  
  document.getElementById('prevSlideBtn').addEventListener('click', () => {
    let prev = currentSlide - 1;
    if (prev < 1) prev = totalSlides;
    showSlide(prev);
  });
  
  document.getElementById('nextSlideBtn').addEventListener('click', () => {
    let next = currentSlide + 1;
    if (next > totalSlides) next = 1;
    showSlide(next);
  });
  
  document.querySelectorAll('.carousel-dots .dot').forEach(dot => {
    dot.addEventListener('click', (e) => {
      const slideIdx = parseInt(dot.getAttribute('data-slide'));
      showSlide(slideIdx);
    });
  });

  // Cloud Broker Console Actions
  document.getElementById('syncNowBtn').addEventListener('click', () => {
    const station = STATIONS[state.activeStation];
    const current = state.currentTelemetry;
    
    const newLog = {
      timestamp: new Date(),
      stationId: station.id,
      stationName: station.name,
      ph: current.ph,
      tds: current.tds,
      temp: current.temp,
      status: getSafetyStatus(current)
    };
    
    state.historicalLogs.unshift(newLog);
    localStorage.setItem('aquasense_logs', JSON.stringify(state.historicalLogs));
    
    applyFilters();
    showToast("Snapshot pushed to AWS Cloud & saved in browser cache!");
    addBrokerLog('save', `MANUAL_SYNC: Synced current payload. LocalStorage cache updated.`);
  });
  
  document.getElementById('clearLogsBtn').addEventListener('click', () => {
    localStorage.removeItem('aquasense_logs');
    generateHistoricalData();
    applyFilters();
    showToast("Cloud DB broker database logs reset successfully.");
    addBrokerLog('info', `SYS_DB: Database cache reset. Seeding historical metrics.`);
  });

  // Start Live Simulation
  startSimulation();
});

// System Clock
function initClock() {
  const timeEl = document.getElementById('timeDisplay');
  const updateClock = () => {
    const now = new Date();
    timeEl.textContent = now.toTimeString().split(' ')[0];
  };
  updateClock();
  setInterval(updateClock, 1000);
}

// ----------------------------------------------------
// MAP MODULE
// ----------------------------------------------------
function initMap() {
  // Center map around Mysore area containing the 3 stations
  state.map = L.map('map', {
    zoomControl: true,
    scrollWheelZoom: false
  }).setView([12.22, 76.56], 9);

  // CartoDB Dark Matter tile layer for premium dark aesthetics
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
  }).addTo(state.map);

  // Plot Stations
  Object.keys(STATIONS).forEach(key => {
    const station = STATIONS[key];
    
    // Determine safety color for initial pin
    let statusClass = 'safe';
    if (station.wqi < 70) statusClass = 'warning';
    if (station.wqi < 50) statusClass = 'critical';

    // Custom Icon using CSS pulsing effect
    const icon = L.divIcon({
      className: 'custom-marker',
      html: `<div class="marker-ring ${statusClass}" id="marker-${station.id}"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    const marker = L.marker(station.coords, { icon: icon }).addTo(state.map);
    
    // Custom popup
    const popupContent = `
      <div class="map-popup-card">
        <div class="map-popup-title">${station.name}</div>
        <div class="map-popup-item"><span>WQI Index:</span> <strong>${station.wqi}/100</strong></div>
        <div class="map-popup-item"><span>Source:</span> <span>${station.source}</span></div>
      </div>
    `;
    marker.bindPopup(popupContent, { closeButton: false });
    
    marker.on('click', () => {
      document.getElementById('stationSelect').value = station.id;
      switchStation(station.id);
    });

    state.markers[station.id] = marker;
  });
}

// Update Map Marker pulsing states based on active metrics
function updateMarkerStates() {
  Object.keys(STATIONS).forEach(key => {
    const element = document.getElementById(`marker-${key}`);
    if (element) {
      // Clean classes
      element.classList.remove('safe', 'warning', 'critical', 'active');
      
      // Add active class if selected
      if (key === state.activeStation) {
        element.classList.add('active');
      }

      // Check current safety state
      let status = 'safe';
      if (key === state.activeStation) {
        status = getSafetyStatus(state.currentTelemetry);
      } else {
        // Fallback to static source metrics
        status = STATIONS[key].wqi >= 90 ? 'safe' : (STATIONS[key].wqi >= 65 ? 'warning' : 'critical');
      }
      element.classList.add(status);
    }
  });
}

// ----------------------------------------------------
// TELEMETRY SIMULATION ENGINE
// ----------------------------------------------------
function startSimulation() {
  if (state.simulationInterval) clearInterval(state.simulationInterval);
  
  state.simulationInterval = setInterval(() => {
    simulateTelemetryTick();
  }, 3000); // Telemetry updates every 3 seconds
}

function simulateTelemetryTick() {
  const station = STATIONS[state.activeStation];
  const current = state.currentTelemetry;
  
  // Advance GPS patrol drone coordinate
  state.pathIndex = (state.pathIndex + 1) % station.path.length;
  const newCoords = station.path[state.pathIndex];
  current.lat = newCoords[0];
  current.lng = newCoords[1];
  
  // Move Leaflet marker
  if (state.map && state.markers[state.activeStation]) {
    state.markers[state.activeStation].setLatLng(newCoords);
    // Draw patrol trail
    drawPatrolTrail(station.path.slice(0, state.pathIndex + 1));
  }
  
  // Random small walks
  const phDelta = (Math.random() - 0.5) * 0.04;
  const tdsDelta = Math.round((Math.random() - 0.5) * 4);
  const tempDelta = (Math.random() - 0.5) * 0.2;

  // Update telemetry value within bounds
  current.ph = Math.max(0, Math.min(14, parseFloat((current.ph + phDelta).toFixed(2))));
  current.tds = Math.max(0, Math.min(2000, current.tds + tdsDelta));
  current.temp = Math.max(0, Math.min(50, parseFloat((current.temp + tempDelta).toFixed(1))));
  current.timestamp = new Date();
  
  // Record trend history
  current.phTrend = phDelta > 0.01 ? 'up' : (phDelta < -0.01 ? 'down' : 'stable');
  current.tdsTrend = tdsDelta > 1 ? 'up' : (tdsDelta < -1 ? 'down' : 'stable');
  current.tempTrend = tempDelta > 0.05 ? 'up' : (tempDelta < -0.05 ? 'down' : 'stable');
  
  // Update Live Telemetry UI
  updateTelemetryUI();

  // Add data point to chart buffer
  pushToChartData(current);

  // Connection Latency simulation
  const latencyDelta = Math.round((Math.random() - 0.5) * 4);
  state.latency = Math.max(12, Math.min(68, state.latency + latencyDelta));
  const latencyEl = document.getElementById('cloudLatency');
  if (latencyEl) latencyEl.textContent = `${state.latency}ms`;

  // Log incoming broker event
  addBrokerLog('publish', `PUB: {"ph": ${current.ph.toFixed(2)}, "tds": ${current.tds}, "temp": ${current.temp.toFixed(1)}, "lat": ${current.lat.toFixed(5)}, "lng": ${current.lng.toFixed(5)}}`);

  // Check if we should insert the tick into the history table array and cache in localStorage
  if (Math.random() > 0.8) {
    const newLog = {
      timestamp: new Date(current.timestamp),
      stationId: station.id,
      stationName: station.name,
      ph: current.ph,
      tds: current.tds,
      temp: current.temp,
      status: getSafetyStatus(current)
    };
    state.historicalLogs.unshift(newLog); // Prepend to history
    localStorage.setItem('aquasense_logs', JSON.stringify(state.historicalLogs));
    applyFilters();
    addBrokerLog('save', `AUTO_SYNC: Saved record to Cloud database (doc_id: aq_${Math.random().toString(36).substring(2,8)})`);
  }
}

// Switch Active Station
function switchStation(stationId) {
  state.activeStation = stationId;
  const config = STATIONS[stationId];
  
  // Clear existing polyline trail
  if (state.activePolyline && state.map) {
    state.map.removeLayer(state.activePolyline);
    state.activePolyline = null;
  }
  state.pathIndex = 0;

  // Set starting state
  state.currentTelemetry = {
    ph: config.base.ph,
    tds: config.base.tds,
    temp: config.base.temp,
    lat: config.path[0][0],
    lng: config.path[0][1],
    phTrend: 'stable',
    tdsTrend: 'stable',
    tempTrend: 'stable',
    timestamp: new Date()
  };

  // Pan Map to active station
  if (state.map) {
    state.map.setView(config.coords, 10);
    state.markers[stationId].openPopup();
  }

  // Update Station Profile UI
  document.getElementById('profileName').textContent = config.name;
  document.getElementById('profileCoords').textContent = `${state.currentTelemetry.lat.toFixed(5)}° N, ${state.currentTelemetry.lng.toFixed(5)}° E`;
  document.getElementById('profileSource').textContent = config.source;
  document.getElementById('profileWQI').textContent = `${config.wqi} / 100`;

  const nodeIdEl = document.getElementById('profileNodeId');
  if (nodeIdEl) nodeIdEl.textContent = config.nodeId;
  
  const brokerIpEl = document.getElementById('brokerIp');
  if (brokerIpEl) brokerIpEl.textContent = `${config.id}-broker.iot`;

  // Animate profile WQI color
  const wqiEl = document.getElementById('profileWQI');
  wqiEl.className = 'info-val font-mono';
  if (config.wqi >= 90) wqiEl.classList.add('highlight-cyan');
  else if (config.wqi >= 70) wqiEl.classList.add('accent-amber');
  else wqiEl.classList.add('accent-coral');

  // Load static chart telemetry mockup buffer
  buildInitialChartData(config);

  // Update Display
  updateTelemetryUI();
  updateMarkerStates();
  applyFilters(); // Filter logs for this station

  // Log connection event
  addBrokerLog('info', `SYS_STATION: Connected to Node ${config.nodeId} (${config.name})`);
}

// ----------------------------------------------------
// UI PRESENTATION LAYOUT
// ----------------------------------------------------
function updateTelemetryUI() {
  const current = state.currentTelemetry;
  const config = STATIONS[state.activeStation];
  
  // pH Card Update
  document.getElementById('phValue').textContent = current.ph.toFixed(2);
  const phStatus = getParamStatus('ph', current.ph, config.ranges.ph);
  updateMetricCardState('phCard', 'phBadge', 'phFill', phStatus, (current.ph / 14 * 100));
  updateTrendUI('phTrend', current.phTrend, current.phTrend === 'stable' ? 'stable' : `${current.phTrend === 'up' ? '+' : '-'}${Math.abs((Math.random() * 0.05)).toFixed(3)}/s`);

  // TDS Card Update
  document.getElementById('tdsValue').textContent = current.tds;
  const tdsStatus = getParamStatus('tds', current.tds, config.ranges.tds);
  updateMetricCardState('tdsCard', 'tdsBadge', 'tdsFill', tdsStatus, Math.min(100, (current.tds / 600 * 100)));
  updateTrendUI('tdsTrend', current.tdsTrend, current.tdsTrend === 'stable' ? 'stable' : `${current.tdsTrend === 'up' ? '↑ +' : '↓ -'}${Math.round(Math.random() * 3)} ppm/m`);

  // Temp Card Update
  document.getElementById('tempValue').textContent = current.temp.toFixed(1);
  const tempStatus = getParamStatus('temp', current.temp, config.ranges.temp);
  updateMetricCardState('tempCard', 'tempBadge', 'tempFill', tempStatus, (current.temp / 50 * 100));
  updateTrendUI('tempTrend', current.tempTrend, current.tempTrend === 'stable' ? 'stable' : `${current.tempTrend === 'up' ? '↑ +' : '↓ -'}${Math.abs(Math.random() * 0.2).toFixed(1)}°C/h`);

  // Update Main system alarm status
  const overallStatus = getSafetyStatus(current);
  const statusPanel = document.querySelector('.system-status');
  const statusText = document.getElementById('systemStatusText');
  const profileSafety = document.getElementById('profileSafety');

  statusPanel.className = 'system-status';
  profileSafety.className = 'status-badge';
  
  if (overallStatus === 'safe') {
    statusPanel.classList.add('active');
    statusText.textContent = 'ALL SYSTEMS OPERATIONAL - SAFE';
    profileSafety.classList.add('safe');
    profileSafety.textContent = 'SAFE';
  } else if (overallStatus === 'warning') {
    statusPanel.classList.add('warning');
    statusText.textContent = 'WARNING: WATER QUALITY ANOMALY DETECTED';
    profileSafety.classList.add('warning');
    profileSafety.textContent = 'WARNING';
  } else {
    statusPanel.classList.add('critical');
    statusText.textContent = 'ALERT: CRITICAL QUALITY DEGRADATION';
    profileSafety.classList.add('critical');
    profileSafety.textContent = 'CRITICAL';
  }

  // Trigger AI analysis updates
  updateAIInsights(current);
}

// Single Parameter Safety Evaluator
function getParamStatus(type, value, range) {
  if (type === 'ph') {
    if (value < range.safeMin || value > range.safeMax) {
      if (value < range.safeMin - 1.0 || value > range.safeMax + 1.0) return 'critical';
      return 'warning';
    }
  } else if (type === 'tds') {
    if (value > range.safeMax) {
      if (value > range.safeMax + 200) return 'critical';
      return 'warning';
    }
  } else if (type === 'temp') {
    if (value < range.safeMin || value > range.safeMax) {
      if (value < range.safeMin - 5.0 || value > range.safeMax + 5.0) return 'critical';
      return 'warning';
    }
  }
  return 'safe';
}

// Combined safety index status
function getSafetyStatus(telemetry) {
  const config = STATIONS[state.activeStation];
  const phSt = getParamStatus('ph', telemetry.ph, config.ranges.ph);
  const tdsSt = getParamStatus('tds', telemetry.tds, config.ranges.tds);
  const tempSt = getParamStatus('temp', telemetry.temp, config.ranges.temp);

  if (phSt === 'critical' || tdsSt === 'critical' || tempSt === 'critical') return 'critical';
  if (phSt === 'warning' || tdsSt === 'warning' || tempSt === 'warning') return 'warning';
  return 'safe';
}

// Metric Visual Updates
function updateMetricCardState(cardId, badgeId, fillId, status, percentage) {
  const card = document.getElementById(cardId);
  const badge = document.getElementById(badgeId);
  const fill = document.getElementById(fillId);

  // Clean cards alert states
  card.className = 'db-card metric-card';
  badge.className = 'badge';
  
  badge.textContent = status.toUpperCase();
  fill.style.width = `${percentage}%`;

  if (status === 'safe') {
    badge.classList.add('safe');
  } else if (status === 'warning') {
    card.classList.add('alert-warning');
    badge.classList.add('warning');
  } else {
    card.classList.add('alert-critical');
    badge.classList.add('critical');
  }
}

function updateTrendUI(elementId, trend, labelText) {
  const el = document.getElementById(elementId);
  el.className = 'metric-trend font-mono';
  
  let arrow = '→';
  if (trend === 'up') {
    arrow = '↑';
    el.classList.add('up');
  } else if (trend === 'down') {
    arrow = '↓';
    el.classList.add('down');
  }

  el.querySelector('.trend-icon').textContent = arrow;
  el.querySelector('span:last-child').textContent = labelText;
}

// ----------------------------------------------------
// CHART MODULE (CHART.JS)
// ----------------------------------------------------
let chartBuffer = []; // Local rolling window of live data

function initChart() {
  const ctx = document.getElementById('telemetryChart').getContext('2d');
  
  Chart.defaults.color = '#94a3b8';
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.font.size = 11;

  state.chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: []
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            usePointStyle: true,
            boxWidth: 8,
            padding: 15
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          titleColor: '#fff',
          bodyColor: '#cbd5e1',
          borderColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1,
          padding: 10,
          displayColors: true,
          callbacks: {
            title: (items) => {
              return `IoT Ping: ${items[0].label}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(255, 255, 255, 0.02)',
            borderColor: 'rgba(255,255,255,0.05)'
          },
          ticks: {
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 6
          }
        },
        y: {
          grid: {
            color: 'rgba(255, 255, 255, 0.02)',
            borderColor: 'rgba(255,255,255,0.05)'
          }
        }
      }
    }
  });
}

function buildInitialChartData(config) {
  chartBuffer = [];
  const now = new Date();
  
  // Seed initial rolling list with small walks
  let currPh = config.base.ph;
  let currTds = config.base.tds;
  let currTemp = config.base.temp;

  for (let i = state.realTimeWindowSize; i > 0; i--) {
    const time = new Date(now.getTime() - i * 5000);
    const phWalk = (Math.random() - 0.5) * 0.08;
    const tdsWalk = Math.round((Math.random() - 0.5) * 5);
    const tempWalk = (Math.random() - 0.5) * 0.3;

    currPh = Math.max(5.5, Math.min(9.5, parseFloat((currPh + phWalk).toFixed(2))));
    currTds = Math.max(50, Math.min(500, currTds + tdsWalk));
    currTemp = Math.max(15, Math.min(35, parseFloat((currTemp + tempWalk).toFixed(1))));

    chartBuffer.push({
      timestamp: time,
      ph: currPh,
      tds: currTds,
      temp: currTemp
    });
  }
  updateChartConfig();
}

function pushToChartData(telemetry) {
  chartBuffer.push({
    timestamp: new Date(telemetry.timestamp),
    ph: telemetry.ph,
    tds: telemetry.tds,
    temp: telemetry.temp
  });

  if (chartBuffer.length > state.realTimeWindowSize) {
    chartBuffer.shift();
  }
  
  // Simple data update to optimize redraws
  const times = chartBuffer.map(d => d.timestamp.toLocaleTimeString());
  state.chart.data.labels = times;

  if (state.chartType === 'all') {
    state.chart.data.datasets[0].data = chartBuffer.map(d => d.ph);
    state.chart.data.datasets[1].data = chartBuffer.map(d => d.tds);
    state.chart.data.datasets[2].data = chartBuffer.map(d => d.temp);
  } else {
    state.chart.data.datasets[0].data = chartBuffer.map(d => d[state.chartType]);
  }
  
  state.chart.update('none'); // silent update without reset animations
}

function updateChartConfig() {
  const canvas = document.getElementById('telemetryChart');
  const ctx = canvas.getContext('2d');
  
  // Gradients for glowing graphs
  const cyanGrad = ctx.createLinearGradient(0, 0, 0, 200);
  cyanGrad.addColorStop(0, 'rgba(6, 182, 212, 0.2)');
  cyanGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');

  const emeraldGrad = ctx.createLinearGradient(0, 0, 0, 200);
  emeraldGrad.addColorStop(0, 'rgba(16, 185, 129, 0.2)');
  emeraldGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');

  const blueGrad = ctx.createLinearGradient(0, 0, 0, 200);
  blueGrad.addColorStop(0, 'rgba(59, 130, 246, 0.2)');
  blueGrad.addColorStop(1, 'rgba(59, 130, 246, 0)');

  const labels = chartBuffer.map(d => d.timestamp.toLocaleTimeString());
  state.chart.data.labels = labels;
  state.chart.data.datasets = [];

  // Configure scale systems depending on what we are plotting
  if (state.chartType === 'all') {
    state.chart.options.scales.y = {
      grid: { color: 'rgba(255, 255, 255, 0.02)' },
      title: { display: true, text: 'Scaled Indices' }
    };
    
    state.chart.data.datasets = [
      {
        label: 'pH Level',
        data: chartBuffer.map(d => d.ph),
        borderColor: '#10b981',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        backgroundColor: emeraldGrad,
        pointRadius: 2,
        pointHoverRadius: 5
      },
      {
        label: 'TDS (ppm / 2)', // Scaled to look nice together
        data: chartBuffer.map(d => d.tds / 2),
        borderColor: '#06b6d4',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        backgroundColor: cyanGrad,
        pointRadius: 2,
        pointHoverRadius: 5
      },
      {
        label: 'Temp (°C)',
        data: chartBuffer.map(d => d.temp),
        borderColor: '#3b82f6',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        backgroundColor: blueGrad,
        pointRadius: 2,
        pointHoverRadius: 5
      }
    ];
  } else if (state.chartType === 'ph') {
    state.chart.options.scales.y = {
      min: 5.0,
      max: 10.0,
      grid: { color: 'rgba(255, 255, 255, 0.02)' },
      title: { display: true, text: 'pH Units' }
    };
    state.chart.data.datasets = [{
      label: 'Water pH Level',
      data: chartBuffer.map(d => d.ph),
      borderColor: '#10b981',
      borderWidth: 3,
      tension: 0.4,
      fill: true,
      backgroundColor: emeraldGrad,
      pointRadius: 3,
      pointHoverRadius: 6
    }];
  } else if (state.chartType === 'tds') {
    state.chart.options.scales.y = {
      min: 0,
      max: 500,
      grid: { color: 'rgba(255, 255, 255, 0.02)' },
      title: { display: true, text: 'Total Dissolved Solids (ppm)' }
    };
    state.chart.data.datasets = [{
      label: 'TDS (ppm)',
      data: chartBuffer.map(d => d.tds),
      borderColor: '#06b6d4',
      borderWidth: 3,
      tension: 0.4,
      fill: true,
      backgroundColor: cyanGrad,
      pointRadius: 3,
      pointHoverRadius: 6
    }];
  } else if (state.chartType === 'temp') {
    state.chart.options.scales.y = {
      min: 10.0,
      max: 40.0,
      grid: { color: 'rgba(255, 255, 255, 0.02)' },
      title: { display: true, text: 'Temperature (°C)' }
    };
    state.chart.data.datasets = [{
      label: 'Temperature (°C)',
      data: chartBuffer.map(d => d.temp),
      borderColor: '#3b82f6',
      borderWidth: 3,
      tension: 0.4,
      fill: true,
      backgroundColor: blueGrad,
      pointRadius: 3,
      pointHoverRadius: 6
    }];
  }
  
  state.chart.update();
}

// ----------------------------------------------------
// HISTORICAL LOGS GENERATOR
// ----------------------------------------------------
function generateHistoricalData() {
  const cachedLogs = localStorage.getItem('aquasense_logs');
  if (cachedLogs) {
    try {
      state.historicalLogs = JSON.parse(cachedLogs).map(log => ({
        ...log,
        timestamp: new Date(log.timestamp)
      }));
      return;
    } catch (e) {
      console.error("Failed to parse cached historical logs", e);
    }
  }

  state.historicalLogs = [];
  const now = new Date();
  const stationKeys = Object.keys(STATIONS);

  // Seed logs covering 30 days back, recording every 4 hours
  const totalEntries = 30 * 6; // 180 points per station

  stationKeys.forEach(key => {
    const config = STATIONS[key];
    let currPh = config.base.ph;
    let currTds = config.base.tds;
    let currTemp = config.base.temp;

    for (let i = 0; i < totalEntries; i++) {
      // Step back in chunks of 4 hours
      const timestamp = new Date(now.getTime() - i * 4 * 60 * 60 * 1000);
      
      // Multi-hour walks are slightly larger
      const phWalk = (Math.random() - 0.5) * 0.12;
      const tdsWalk = Math.round((Math.random() - 0.5) * 12);
      const tempWalk = (Math.random() - 0.5) * 0.6;

      currPh = Math.max(5.5, Math.min(9.5, parseFloat((currPh + phWalk).toFixed(2))));
      currTds = Math.max(50, Math.min(550, currTds + tdsWalk));
      currTemp = Math.max(15, Math.min(35, parseFloat((currTemp + tempWalk).toFixed(1))));

      // Introduce rare anomalies to make logs interesting
      let status = 'safe';
      // Anomaly trigger (e.g. 5% chance of warning, 1% critical)
      const anomalyRoll = Math.random();
      if (anomalyRoll > 0.98) {
        currPh = parseFloat((8.8 + Math.random() * 0.9).toFixed(2)); // High Alkaline Spike
        currTds = 410 + Math.round(Math.random() * 120);
        status = 'critical';
      } else if (anomalyRoll > 0.94) {
        currTds = 310 + Math.round(Math.random() * 80);
        status = 'warning';
      } else {
        // Evaluate based on ranges
        const phSt = getParamStatus('ph', currPh, config.ranges.ph);
        const tdsSt = getParamStatus('tds', currTds, config.ranges.tds);
        const tempSt = getParamStatus('temp', currTemp, config.ranges.temp);
        
        if (phSt === 'critical' || tdsSt === 'critical' || tempSt === 'critical') status = 'critical';
        else if (phSt === 'warning' || tdsSt === 'warning' || tempSt === 'warning') status = 'warning';
      }

      state.historicalLogs.push({
        timestamp,
        stationId: config.id,
        stationName: config.name,
        ph: currPh,
        tds: currTds,
        temp: currTemp,
        status
      });
    }
  });

  // Sort chronological descending (newest first)
  state.historicalLogs.sort((a, b) => b.timestamp - a.timestamp);
  localStorage.setItem('aquasense_logs', JSON.stringify(state.historicalLogs));
}

// ----------------------------------------------------
// TABLE INTERACTION: FILTERING & PAGINATION
// ----------------------------------------------------
function applyFilters() {
  const filterStatus = document.getElementById('filterStatus').value;
  const filterDateRange = document.getElementById('filterDate').value;
  
  const now = new Date();
  let timeThreshold = 0;

  if (filterDateRange === '24h') timeThreshold = 24 * 60 * 60 * 1000;
  else if (filterDateRange === '7d') timeThreshold = 7 * 24 * 60 * 60 * 1000;
  else if (filterDateRange === '30d') timeThreshold = 30 * 24 * 60 * 60 * 1000;

  // Filter logs based on filters AND matching active station
  state.filteredLogs = state.historicalLogs.filter(log => {
    // 1. Station match
    if (log.stationId !== state.activeStation) return false;

    // 2. Status filter
    if (filterStatus !== 'all' && log.status !== filterStatus) return false;

    // 3. Time filter
    const age = now.getTime() - log.timestamp.getTime();
    if (age > timeThreshold) return false;

    return true;
  });

  // Reset pagination to first page
  state.currentPage = 1;
  renderHistoryTable();
}

function renderHistoryTable() {
  const tbody = document.getElementById('historyTableBody');
  tbody.innerHTML = '';

  if (state.filteredLogs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="table-loading">No telemetry logs found matching filter constraints.</td>
      </tr>
    `;
    updatePaginationControls(0);
    return;
  }

  // Slice logs for pagination
  const startIndex = (state.currentPage - 1) * state.rowsPerPage;
  const endIndex = Math.min(startIndex + state.rowsPerPage, state.filteredLogs.length);
  const pageLogs = state.filteredLogs.slice(startIndex, endIndex);

  pageLogs.forEach(log => {
    const row = document.createElement('tr');
    
    // Nice readable timestamps
    const dateStr = log.timestamp.toLocaleDateString();
    const timeStr = log.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    row.innerHTML = `
      <td class="td-timestamp"><strong>${dateStr}</strong>, ${timeStr}</td>
      <td>${log.stationName}</td>
      <td class="td-value">${log.ph.toFixed(2)}</td>
      <td class="td-value">${log.tds} <span class="text-muted">ppm</span></td>
      <td class="td-value">${log.temp.toFixed(1)}°C</td>
      <td><span class="status-badge ${log.status}">${log.status.toUpperCase()}</span></td>
    `;
    tbody.appendChild(row);
  });

  updatePaginationControls(state.filteredLogs.length);
}

function updatePaginationControls(totalRecords) {
  const prevBtn = document.getElementById('prevPageBtn');
  const nextBtn = document.getElementById('nextPageBtn');
  const info = document.getElementById('paginationInfo');

  const maxPage = Math.ceil(totalRecords / state.rowsPerPage) || 1;

  prevBtn.disabled = state.currentPage === 1;
  nextBtn.disabled = state.currentPage === maxPage;

  const startRecord = totalRecords === 0 ? 0 : (state.currentPage - 1) * state.rowsPerPage + 1;
  const endRecord = Math.min(state.currentPage * state.rowsPerPage, totalRecords);

  info.textContent = `Showing ${startRecord}-${endRecord} of ${totalRecords} records`;
}

function changePage(direction) {
  const maxPage = Math.ceil(state.filteredLogs.length / state.rowsPerPage) || 1;
  const targetPage = state.currentPage + direction;

  if (targetPage >= 1 && targetPage <= maxPage) {
    state.currentPage = targetPage;
    renderHistoryTable();
  }
}

// ----------------------------------------------------
// EXPORT DATA (CLIENT-SIDE CSV GENERATOR)
// ----------------------------------------------------
function exportToCSV() {
  if (state.filteredLogs.length === 0) {
    alert('No data records available to export.');
    return;
  }

  const stationName = STATIONS[state.activeStation].name.replace(/[^a-zA-Z0-9]/g, '_');
  const dateRange = document.getElementById('filterDate').value;
  const filename = `aquasense_logs_${stationName}_${dateRange}_export.csv`;

  // CSV headers
  let csvContent = 'Timestamp,Station Name,pH Value,TDS Reading (ppm),Temperature (C),Quality Status\r\n';

  // CSV rows
  state.filteredLogs.forEach(log => {
    // Format timestamp ISO style for consistency
    const tsStr = log.timestamp.toISOString().replace('T', ' ').substring(0, 19);
    const escapedStationName = `"${log.stationName.replace(/"/g, '""')}"`;
    const row = [
      tsStr,
      escapedStationName,
      log.ph.toFixed(2),
      log.tds,
      log.temp.toFixed(1),
      log.status.toUpperCase()
    ].join(',');
    csvContent += row + '\r\n';
  });

  // Blob and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  if (navigator.msSaveBlob) { // IE 10+
    navigator.msSaveBlob(blob, filename);
  } else {
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}

// ----------------------------------------------------
// MOBILE GPSpatrol PATH DRAWING
// ----------------------------------------------------
function drawPatrolTrail(coords) {
  if (!state.map) return;
  
  if (state.activePolyline) {
    state.map.removeLayer(state.activePolyline);
  }
  
  state.activePolyline = L.polyline(coords, {
    color: '#06b6d4',
    weight: 2,
    opacity: 0.6,
    dashArray: '5, 8',
    lineCap: 'round',
    lineJoin: 'round'
  }).addTo(state.map);
}

// ----------------------------------------------------
// CLOUD CONSOLE BROKER LOGGER
// ----------------------------------------------------
function addBrokerLog(type, message) {
  const terminalLogs = document.getElementById('terminalLogs');
  if (!terminalLogs) return;

  const now = new Date();
  const timeStr = now.toTimeString().split(' ')[0];
  
  let typeClass = 'event-info';
  if (type === 'publish') typeClass = 'event-publish';
  if (type === 'save') typeClass = 'event-save';
  if (type === 'warn') typeClass = 'event-warn';
  if (type === 'crit') typeClass = 'event-crit';
  
  const logLine = document.createElement('div');
  logLine.className = 'terminal-log-line';
  logLine.innerHTML = `<span class="timestamp">[${timeStr}]</span><span class="${typeClass}">${message}</span>`;
  
  terminalLogs.appendChild(logLine);
  
  // Autoscroll to bottom
  terminalLogs.scrollTop = terminalLogs.scrollHeight;
  
  // Keep logs history size capped
  while (terminalLogs.childNodes.length > 25) {
    terminalLogs.removeChild(terminalLogs.firstChild);
  }
}

// ----------------------------------------------------
// DYNAMIC AI INSIGHTS & FORECAST ENGINE
// ----------------------------------------------------
function updateAIInsights(current) {
  const config = STATIONS[state.activeStation];
  const phSt = getParamStatus('ph', current.ph, config.ranges.ph);
  const tdsSt = getParamStatus('tds', current.tds, config.ranges.tds);
  const tempSt = getParamStatus('temp', current.temp, config.ranges.temp);
  
  const reasoningEl = document.getElementById('aiReasoning');
  const alertBox = document.getElementById('aiAlertBox');
  const alertText = document.getElementById('aiAlertText');
  const alertPulse = document.getElementById('aiAlertPulse');
  
  if (!reasoningEl || !alertBox) return;
  
  // Clean classes
  alertBox.className = 'ai-alert-box';
  if (alertPulse) alertPulse.className = 'status-pulse';
  
  let diagnosis = '';
  let alertType = 'safe';
  let alertMsg = '';
  
  // Meander predicted parameters slightly
  const predPh = parseFloat((current.ph + (Math.random() - 0.5) * 0.05).toFixed(2));
  const predTds = Math.round(current.tds + (Math.random() - 0.5) * 6);
  const predAnomalyProb = (phSt !== 'safe' || tdsSt !== 'safe') ? (55 + Math.random() * 38).toFixed(1) : (0.5 + Math.random() * 2.5).toFixed(1);
  
  // Calculate disease risk base for forecast
  let choleraMock = 1.0;
  if (current.ph > 8.0) choleraMock += (current.ph - 8.0) * 25;
  if (current.temp > 24.0) choleraMock += (current.temp - 24.0) * 5;
  let typhoidMock = 2.0;
  if (current.tds > 150) typhoidMock += (current.tds - 150) * 0.18;
  let dysenteryMock = 1.0;
  if (current.ph < 7.0) dysenteryMock += (7.0 - current.ph) * 25;
  if (current.tds > 200) dysenteryMock += (current.tds - 200) * 0.08;
  let gastroMock = 3.0;
  if (current.tds > 180) gastroMock += (current.tds - 180) * 0.25;
  if (phSt !== 'safe') gastroMock += 15;
  
  const overallMock = (choleraMock + typhoidMock + dysenteryMock + gastroMock) / 4;
  const predDiseaseProb = parseFloat((overallMock + (Math.random() - 0.5) * 8).toFixed(1));
  const boundedPredDisease = Math.max(1, Math.min(95, predDiseaseProb));

  document.getElementById('predPh').textContent = predPh.toFixed(2);
  document.getElementById('predTds').textContent = `${predTds} ppm`;
  document.getElementById('predAnomaly').textContent = `${predAnomalyProb}%`;
  document.getElementById('predDisease').textContent = `${boundedPredDisease}%`;
  
  const predPhStatus = document.getElementById('predPhStatus');
  const predTdsStatus = document.getElementById('predTdsStatus');
  const predAnomalyStatus = document.getElementById('predAnomalyStatus');
  const predDiseaseStatus = document.getElementById('predDiseaseStatus');
  
  // Style predictive badges
  const phPredSt = getParamStatus('ph', predPh, config.ranges.ph);
  predPhStatus.className = 'forecast-status font-mono ' + phPredSt;
  predPhStatus.textContent = phPredSt.toUpperCase() + ' (94% Conf.)';
  
  const tdsPredSt = getParamStatus('tds', predTds, config.ranges.tds);
  predTdsStatus.className = 'forecast-status font-mono ' + tdsPredSt;
  predTdsStatus.textContent = tdsPredSt.toUpperCase() + ' (91% Conf.)';
  
  if (parseFloat(predAnomalyProb) > 50) {
    predAnomalyStatus.className = 'forecast-status font-mono critical';
    predAnomalyStatus.textContent = 'HIGH RISK';
  } else if (parseFloat(predAnomalyProb) > 10) {
    predAnomalyStatus.className = 'forecast-status font-mono warning';
    predAnomalyStatus.textContent = 'ELEVATED RISK';
  } else {
    predAnomalyStatus.className = 'forecast-status font-mono safe';
    predAnomalyStatus.textContent = 'LOW RISK';
  }

  if (boundedPredDisease > 50) {
    predDiseaseStatus.className = 'forecast-status font-mono critical';
    predDiseaseStatus.textContent = 'HIGH RISK';
  } else if (boundedPredDisease > 15) {
    predDiseaseStatus.className = 'forecast-status font-mono warning';
    predDiseaseStatus.textContent = 'ELEVATED RISK';
  } else {
    predDiseaseStatus.className = 'forecast-status font-mono safe';
    predDiseaseStatus.textContent = 'LOW RISK';
  }

  if (phSt === 'critical' || tdsSt === 'critical' || tempSt === 'critical') {
    alertType = 'critical';
    diagnosis = `CRITICAL DEGRADATION DETECTED: Automated neural analysis shows severe chemical indicators outside safety bounds. pH level (${current.ph.toFixed(2)}) or mineral content (${current.tds} ppm) indicate industrial discharge or acid spill. downstream irrigation valves alert activated.`;
    alertMsg = `AI Model: CRITICAL - Ecological downstream warnings active!`;
    if (alertPulse) alertPulse.classList.add('critical');
    addBrokerLog('crit', `ML_ALERT: Isolation Forest flags critical outlier parameters.`);
  } else if (phSt === 'warning' || tdsSt === 'warning' || tempSt === 'warning') {
    alertType = 'warning';
    diagnosis = `WATER RUNOFF SUSPECTED: Mild chemical anomalies detected. Dissolved minerals are elevated at ${current.tds} ppm and temperature is slightly off-nominal at ${current.temp.toFixed(1)}°C, matching historical agricultural runoff signatures (fertilizer washouts or soil wash).`;
    alertMsg = `AI Model: WARNING - Runoff pattern match. Heightened monitoring.`;
    if (alertPulse) alertPulse.classList.add('warning');
    addBrokerLog('warn', `ML_WARNING: Random Forest classifier flags potential agricultural runoff.`);
  } else {
    alertType = 'safe';
    diagnosis = `COGNITIVE AUDIT: Water parameters are clean and stable. Multi-parameter neural classification correlates pH (${current.ph.toFixed(2)}), electrical conductivity, and temperature to confirm WQI safety profile (${config.wqi}/100) and drinking water suitability.`;
    alertMsg = `AI Model: System is safe. Parameters within standard drinking water limits.`;
    if (alertPulse) alertPulse.classList.add('safe');
  }
  
  reasoningEl.textContent = diagnosis;
  alertText.textContent = alertMsg;
  alertBox.classList.add(alertType);

  // Update pathogen and disease risk assessor
  updateDiseaseRisk(current, phSt, tdsSt, tempSt);
}

function updateDiseaseRisk(current, phSt, tdsSt, tempSt) {
  // Cholera calculation (thrives in alkaline & warm water)
  let cholera = 1.0;
  if (current.ph > 8.0) cholera += (current.ph - 8.0) * 25;
  if (current.temp > 24.0) cholera += (current.temp - 24.0) * 5;
  cholera = Math.max(1, Math.min(95, cholera));

  // Typhoid calculation (thrives in high TDS/pollution)
  let typhoid = 2.0;
  if (current.tds > 150) typhoid += (current.tds - 150) * 0.18;
  typhoid = Math.max(1, Math.min(95, typhoid));

  // Dysentery calculation (thrives in pH drift & high TDS)
  let dysentery = 1.0;
  if (current.ph < 7.0) dysentery += (7.0 - current.ph) * 25;
  if (current.tds > 200) dysentery += (current.tds - 200) * 0.08;
  dysentery = Math.max(1, Math.min(95, dysentery));

  // Gastroenteritis calculation (thrives in sewage indicator TDS)
  let gastro = 3.0;
  if (current.tds > 180) gastro += (current.tds - 180) * 0.25;
  if (phSt !== 'safe') gastro += 15;
  gastro = Math.max(1, Math.min(95, gastro));

  const overallThreat = (cholera + typhoid + dysentery + gastro) / 4;

  // Update UI Elements
  document.getElementById('choleraFill').style.width = cholera + '%';
  document.getElementById('choleraRiskBadge').textContent = Math.round(cholera) + '% Risk';
  updateRiskBadgeClass('choleraRiskBadge', cholera);

  document.getElementById('typhoidFill').style.width = typhoid + '%';
  document.getElementById('typhoidRiskBadge').textContent = Math.round(typhoid) + '% Risk';
  updateRiskBadgeClass('typhoidRiskBadge', typhoid);

  document.getElementById('dysenteryFill').style.width = dysentery + '%';
  document.getElementById('dysenteryRiskBadge').textContent = Math.round(dysentery) + '% Risk';
  updateRiskBadgeClass('dysenteryRiskBadge', dysentery);

  document.getElementById('gastroFill').style.width = gastro + '%';
  document.getElementById('gastroRiskBadge').textContent = Math.round(gastro) + '% Risk';
  updateRiskBadgeClass('gastroRiskBadge', gastro);

  document.getElementById('threatValue').textContent = overallThreat.toFixed(1) + '%';

  const threatBadge = document.getElementById('diseaseThreatBadge');
  const summaryEl = document.getElementById('diseaseSummary');

  // Clear threat badge classes
  threatBadge.className = 'status-badge';
  
  if (overallThreat < 15) {
    threatBadge.textContent = 'MINIMAL THREAT';
    threatBadge.classList.add('safe');
    summaryEl.textContent = 'Biosecurity index is optimal. Water chemistry restricts pathogen replication. Minimal risk of cholera, typhoid, or dysentery outbreak.';
  } else if (overallThreat < 50) {
    threatBadge.textContent = 'ELEVATED RISK';
    threatBadge.classList.add('warning');
    summaryEl.textContent = `Elevated biological risk. Water temperature (${current.temp.toFixed(1)}°C) or TDS loading (${current.tds} ppm) supports organic pathogen incubation. Boiling or filtration recommended.`;
  } else {
    threatBadge.textContent = 'HIGH PATHOGEN VECTOR';
    threatBadge.classList.add('critical');
    summaryEl.textContent = 'CRITICAL PATHOGEN VECTOR ACTIVE: Extreme pH drift or mineral loading indicates severe sewage/runoff intrusion. Immediate outbreak vector warning for Cholera and Gastroenteritis.';
  }
}

function updateRiskBadgeClass(elementId, risk) {
  const el = document.getElementById(elementId);
  el.className = 'disease-risk-badge';
  if (risk < 15) {
    el.classList.add('safe');
  } else if (risk < 50) {
    el.classList.add('warning');
  } else {
    el.classList.add('critical');
  }
}

// ----------------------------------------------------
// UI GLASSMORPHIC TOAST ALERTS
// ----------------------------------------------------
function showToast(message) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <span class="toast-icon">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
    </span>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  
  // Slide out and remove toast after 3 seconds
  setTimeout(() => {
    toast.classList.add('removing');
    toast.addEventListener('transitionend', () => {
      toast.remove();
    });
  }, 3000);
}
