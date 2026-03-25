#!/usr/bin/env python3
"""
Jarvis Health Dashboard Backend
Flask application providing system metrics and service health checks
"""

from flask import Flask, jsonify, render_template, send_from_directory
from flask_cors import CORS
import os
import psutil
import subprocess
import time
from datetime import datetime

# Set the correct path for static files
app_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
frontend_dir = os.path.join(app_dir, 'frontend')

app = Flask(__name__, static_folder=frontend_dir, static_url_path='', template_folder=frontend_dir)
CORS(app)

# System thresholds for alerts
THRESHOLDS = {
    'cpu_percent': 80,
    'memory_percent': 85,
    'disk_percent': 90,
    'temperature_c': 75
}

# Service definitions
SERVICES = {
    'homeassistant': {
        'name': 'Home Assistant',
        'check_type': 'docker',
        'container_name': 'homeassistant'
    },
    'openclaw': {
        'name': 'OpenClaw Gateway',
        'check_type': 'process',
        'process_name': 'openclaw-gateway'
    },
    'tennis_bot': {
        'name': 'Tennis Booking Bot',
        'check_type': 'process',
        'process_name': 'telegram_bot'
    },
    'voice_assistant': {
        'name': 'Voice Assistant',
        'check_type': 'process',
        'process_name': 'whisper'
    }
}


def get_system_metrics():
    """Get current system metrics"""
    try:
        # CPU metrics
        cpu_percent = psutil.cpu_percent(interval=0.1)
        cpu_count = psutil.cpu_count()
        cpu_freq = psutil.cpu_freq()

        # Memory metrics
        memory = psutil.virtual_memory()
        swap = psutil.swap_memory()

        # Disk metrics
        disk = psutil.disk_usage('/')
        disk_io = psutil.disk_io_counters()

        # Network metrics
        network = psutil.net_io_counters()

        # Temperature (Raspberry Pi specific)
        temp = None
        try:
            temps = psutil.sensors_temperatures()
            # Try different sensor names (varies by system)
            if temps and 'cpu_thermal' in temps:
                temp = temps['cpu_thermal'][0].current
            elif temps and 'cpu-thermal' in temps:
                temp = temps['cpu-thermal'][0].current
            elif temps and 'coretemp' in temps:
                temp = temps['coretemp'][0].current
            elif temps and 'cpu_thermal' in temps:
                temp = temps['cpu_thermal'][0].current
        except Exception as e:
            app.logger.debug(f"Temperature sensor error: {e}")
            pass

        # Uptime
        boot_time = datetime.fromtimestamp(psutil.boot_time())
        uptime = datetime.now() - boot_time

        return {
            'cpu': {
                'percent': cpu_percent,
                'count': cpu_count,
                'frequency': {
                    'current': cpu_freq.current if cpu_freq else None,
                    'min': cpu_freq.min if cpu_freq else None,
                    'max': cpu_freq.max if cpu_freq else None
                }
            },
            'memory': {
                'total': memory.total,
                'available': memory.available,
                'used': memory.used,
                'percent': memory.percent,
                'swap_total': swap.total,
                'swap_used': swap.used,
                'swap_percent': swap.percent
            },
            'disk': {
                'total': disk.total,
                'used': disk.used,
                'free': disk.free,
                'percent': disk.percent,
                'read_bytes': disk_io.read_bytes if disk_io else None,
                'write_bytes': disk_io.write_bytes if disk_io else None
            },
            'network': {
                'bytes_sent': network.bytes_sent if network else None,
                'bytes_recv': network.bytes_recv if network else None,
                'packets_sent': network.packets_sent if network else None,
                'packets_recv': network.packets_recv if network else None
            },
            'temperature': {
                'current': temp,
                'unit': 'celsius'
            },
            'uptime': {
                'boot': boot_time.isoformat(),
                'uptime_seconds': uptime.total_seconds(),
                'uptime_formatted': str(uptime)
            },
            'timestamp': datetime.now().isoformat()
        }
    except Exception as e:
        app.logger.error(f"Error getting system metrics: {e}")
        return None


def check_service_health(service):
    """Check health of a single service"""
    try:
        service_name = service['name']
        check_type = service['check_type']
        status = 'unknown'
        details = {}

        if check_type == 'docker':
            # Check Docker container status
            container_name = service.get('container_name')
            try:
                result = subprocess.run(
                    ['docker', 'inspect', '--format', '{{.State.Status}}', container_name],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                if result.returncode == 0:
                    container_status = result.stdout.strip()
                    status = 'running' if container_status == 'running' else 'stopped'
                    details['container_status'] = container_status
                else:
                    status = 'error'
                    details['error'] = 'Container not found'
            except Exception as e:
                status = 'error'
                details['error'] = str(e)

        elif check_type == 'tcp':
            # Check TCP port
            host = service.get('host', 'localhost')
            port = service.get('port')
            try:
                import socket
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(2)
                result = sock.connect_ex((host, port))
                sock.close()
                status = 'running' if result == 0 else 'stopped'
            except Exception as e:
                status = 'error'
                details['error'] = str(e)

        elif check_type == 'process':
            # Check if process is running
            process_name = service.get('process_name')
            try:
                for proc in psutil.process_iter(['pid', 'cmdline']):
                    cmdline = ' '.join(proc.info.get('cmdline', []))
                    if process_name.lower() in cmdline.lower():
                        status = 'running'
                        details['pid'] = proc.info['pid']
                        break
                else:
                    status = 'stopped'
            except Exception as e:
                status = 'error'
                details['error'] = str(e)

        return {
            'name': service_name,
            'status': status,
            'details': details,
            'timestamp': datetime.now().isoformat()
        }
    except Exception as e:
        app.logger.error(f"Error checking service {service.get('name')}: {e}")
        return {
            'name': service.get('name'),
            'status': 'error',
            'details': {'error': str(e)},
            'timestamp': datetime.now().isoformat()
        }


def check_all_services():
    """Check health of all defined services"""
    results = {}
    for service_id, service_config in SERVICES.items():
        results[service_id] = check_service_health(service_config)
    return results


def check_thresholds(metrics):
    """Check if any metrics exceed thresholds"""
    alerts = []

    if metrics and metrics.get('cpu'):
        if metrics['cpu']['percent'] > THRESHOLDS['cpu_percent']:
            alerts.append({
                'type': 'warning',
                'metric': 'CPU',
                'value': f"{metrics['cpu']['percent']:.1f}%",
                'threshold': f"{THRESHOLDS['cpu_percent']}%"
            })

    if metrics and metrics.get('memory'):
        if metrics['memory']['percent'] > THRESHOLDS['memory_percent']:
            alerts.append({
                'type': 'warning',
                'metric': 'Memory',
                'value': f"{metrics['memory']['percent']:.1f}%",
                'threshold': f"{THRESHOLDS['memory_percent']}%"
            })

    if metrics and metrics.get('disk'):
        if metrics['disk']['percent'] > THRESHOLDS['disk_percent']:
            alerts.append({
                'type': 'warning',
                'metric': 'Disk',
                'value': f"{metrics['disk']['percent']:.1f}%",
                'threshold': f"{THRESHOLDS['disk_percent']}%"
            })

    if metrics and metrics.get('temperature'):
        temp = metrics['temperature']['current']
        if temp and temp > THRESHOLDS['temperature_c']:
            alerts.append({
                'type': 'warning',
                'metric': 'Temperature',
                'value': f"{temp:.1f}°C",
                'threshold': f"{THRESHOLDS['temperature_c']}°C"
            })

    return alerts


# Routes
@app.route('/')
def index():
    """Serve the dashboard frontend"""
    return app.send_static_file('index.html')


@app.route('/api/metrics')
def metrics():
    """Get current system metrics"""
    metrics_data = get_system_metrics()
    return jsonify({
        'success': True,
        'data': metrics_data
    })


@app.route('/api/services')
def services():
    """Get health status of all services"""
    services_data = check_all_services()
    return jsonify({
        'success': True,
        'data': services_data
    })


@app.route('/api/health')
def health():
    """Get complete health check including alerts"""
    metrics_data = get_system_metrics()
    services_data = check_all_services()
    alerts = check_thresholds(metrics_data)

    return jsonify({
        'success': True,
        'data': {
            'metrics': metrics_data,
            'services': services_data,
            'alerts': alerts,
            'timestamp': datetime.now().isoformat()
        }
    })


@app.route('/api/alerts')
def alerts():
    """Get current threshold alerts"""
    metrics_data = get_system_metrics()
    alerts = check_thresholds(metrics_data)
    return jsonify({
        'success': True,
        'data': alerts,
        'count': len(alerts)
    })


if __name__ == '__main__':
    print("🚀 Jarvis Health Dashboard starting...")
    print("📍 Access at: http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
