from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query

router = APIRouter()

@router.get("/tasks")
def get_tasks():
    pass
