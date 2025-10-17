import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
backend_path = str(ROOT)
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///./test.db")
