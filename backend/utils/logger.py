"""
utils/logger.py
=================
One place to configure logging for the whole backend, so every module can
just do `logging.getLogger("adas.<module>")` and get consistent formatting.
"""

import logging
import sys


def setup_logging(level: int = logging.INFO) -> None:
    root = logging.getLogger("adas")
    if root.handlers:
        # Already configured (e.g. re-imported under uvicorn's reloader).
        return

    root.setLevel(level)
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s")
    )
    root.addHandler(handler)
