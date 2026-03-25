# Jarvis Health Dashboard

Real-time system health monitoring dashboard for Raspberry Pi 5 (Jarvis). Monitors CPU, memory, disk, temperature, services, and provides alert notifications.

## Features

- **Real-time Metrics**: CPU, Memory, Disk, Temperature, Network, Uptime
- **Service Monitoring**: Home Assistant, OpenClaw, Tennis Bot, Voice Assistant
- **Automatic Alerts**: Threshold-based warnings for system health
- **Auto-refresh**: Updates every 5 seconds
- **PWA Support**: Install as app on your wall tablet
- **Responsive Design**: Optimized for mobile and desktop
- **Dark Theme**: Professional monitoring aesthetics

## Screenshots

### Main Dashboard
- System metrics cards with progress bars
- Color-coded status (green/yellow/red)
- Real-time network activity

### Services Grid
- Service status indicators
- Visual health check results

## Installation

### Prerequisites

- Python 3.8+
- pip package manager
- Docker (optional, for service monitoring)
- Raspberry Pi (recommended) or any Linux system

### Setup

1. **Clone repository**
   ```bash
   git clone git@github.com:triplese7en/jarvis-dashboard.git
   cd jarvis-dashboard
   ```

2. **Install Python dependencies**
   ```bash
   pip3 install -r requirements.txt
   ```

3. **Configure services** (optional)
   Edit `backend/app.py` to customize monitored services:
   ```python
   SERVICES = {
       'your_service': {
           'name': 'Service Name',
           'check_type': 'docker|tcp|process',
           ...
       }
   }
   ```

4. **Start the dashboard**
   ```bash
   python3 backend/app.py
   ```

5. **Access dashboard**
   - Local: http://localhost:5000
   - Network: http://<jarvis-ip>:5000
   - For Nick: http://192.168.70.141:5000

## Configuration

### Alert Thresholds

Edit thresholds in `backend/app.py`:
```python
THRESHOLDS = {
    'cpu_percent': 80,      # Alert if CPU > 80%
    'memory_percent': 85,    # Alert if Memory > 85%
    'disk_percent': 90,      # Alert if Disk > 90%
    'temperature_c': 75      # Alert if Temp > 75°C
}
```

### Monitored Services

Edit `SERVICES` dictionary in `backend/app.py`:
```python
SERVICES = {
    'service_id': {
        'name': 'Display Name',
        'check_type': 'docker',      # Check Docker container
        # 'check_type': 'tcp',       # Check TCP port
        # 'check_type': 'process',    # Check running process
        'container_name': 'container',
        'host': 'localhost',
        'port': 8080,
        'process_name': 'python3'
    }
}
```

## Usage

### Manual Refresh
Click refresh button (↻) to update metrics immediately

### Auto-refresh
Dashboard updates automatically every 5 seconds

### Alerts
Alerts appear at top when metrics exceed thresholds:
- CPU > 80%
- Memory > 85%
- Disk > 90%
- Temperature > 75°C

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | Dashboard frontend |
| `GET /api/metrics` | System metrics (CPU, RAM, Disk, etc.) |
| `GET /api/services` | Service health status |
| `GET /api/health` | Complete health check with alerts |
| `GET /api/alerts` | Current threshold alerts |

## Deployment

### Run as Service (Auto-start on boot)

1. **Create systemd service**:
   ```bash
   sudo nano /etc/systemd/system/jarvis-dashboard.service
   ```

2. **Add content**:
   ```ini
   [Unit]
   Description=Jarvis Health Dashboard
   After=network.target

   [Service]
   Type=simple
   User=nicolas
   WorkingDirectory=/home/nicolas/.openclaw/workspace/jarvis-dashboard
   ExecStart=/usr/bin/python3 /home/nicolas/.openclaw/workspace/jarvis-dashboard/backend/app.py
   Restart=on-failure
   RestartSec=10

   [Install]
   WantedBy=multi-user.target
   ```

3. **Enable service**:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable jarvis-dashboard
   sudo systemctl start jarvis-dashboard
   ```

4. **Check status**:
   ```bash
   sudo systemctl status jarvis-dashboard
   ```

### Access from Wall Tablet

1. Open browser on wall tablet
2. Navigate to: http://192.168.70.141:5000
3. Tap "Add to Home Screen" (iOS) or "Install" (Android)
4. Pin to always-on display

## Technical Details

### Tech Stack
- **Backend**: Flask (Python)
- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Metrics**: psutil
- **PWA**: Service Worker, Web Manifest
- **Real-time**: Polling (5-second intervals)

### System Compatibility
- Raspberry Pi (tested on Pi 5)
- Debian/Ubuntu Linux
- macOS (limited temperature monitoring)
- Windows (limited temperature monitoring)

## Troubleshooting

### Services show as "error"
- Check Docker is running: `sudo systemctl status docker`
- Verify container names: `docker ps`
- Check permissions: backend may need sudo access

### Metrics not updating
- Check Flask logs for errors
- Verify psutil is installed: `pip3 show psutil`
- Check firewall allows port 5000

### Temperature shows "--"
- Temperature sensors may not be available
- Check with: `python3 -c "import psutil; print(psutil.sensors_temperatures())"`
- Some systems don't expose temperature data

## Development

### File Structure
```
jarvis-dashboard/
├── backend/
│   └── app.py              # Flask application & metrics
├── frontend/
│   ├── index.html            # Dashboard UI
│   ├── css/
│   │   └── dashboard.css   # Styling
│   ├── js/
│   │   └── dashboard.js   # Dashboard logic
│   ├── manifest.json         # PWA manifest
│   └── sw.js               # Service worker
├── requirements.txt          # Python dependencies
└── README.md              # This file
```

### Adding New Metrics

Edit `get_system_metrics()` in `backend/app.py`:
```python
def get_system_metrics():
    return {
        'cpu': {...},
        'your_metric': {
            'value': get_your_value(),
            'unit': 'units'
        },
        ...
    }
```

Then update `updateMetrics()` in `frontend/js/dashboard.js` to display new data.

## License

MIT License - Free to use and modify.

## Credits

- Design: Professional monitoring dashboard aesthetics
- Metrics: psutil library
- PWA: Service Worker standards

---

**Version**: 1.0.0
**Last Updated**: March 2026
**Host**: Jarvis (Raspberry Pi 5)
