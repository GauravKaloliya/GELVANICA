import os
import sys

_api_dir = os.path.dirname(os.path.abspath(__file__))
if _api_dir not in sys.path:
    sys.path.insert(0, _api_dir)

os.environ.setdefault('GNOVIUM_MODE', 'cloud')
os.environ.setdefault('VERCEL', '1')

from app import create_app

application = create_app()

@application.get('/api/v1/health')
def vercel_health():
    from app.core.response import ok
    return ok({"status": "healthy", "service": "gnovium-api", "deployment": "vercel"})

app = application
