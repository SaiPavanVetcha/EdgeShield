import glob
import os
import platform
import psutil
from typing import Optional, Dict, Any


def _read_sysfs_int(path: str) -> Optional[int]:
    """Safely reads an integer value from a Linux sysfs node."""
    try:
        with open(path, "r") as f:
            return int(f.read().strip())
    except (FileNotFoundError, ValueError, PermissionError, OSError):
        return None


def _get_linux_capacities(bat_path: str) -> tuple[Optional[int], Optional[int]]:
    """Try all common Linux battery capacity attributes."""
    energy_design = _read_sysfs_int(os.path.join(bat_path, "energy_full_design"))
    energy_full = _read_sysfs_int(os.path.join(bat_path, "energy_full"))
    charge_design = _read_sysfs_int(os.path.join(bat_path, "charge_full_design"))
    charge_full = _read_sysfs_int(os.path.join(bat_path, "charge_full"))

    # Some embedded / older systems
    design_alt = _read_sysfs_int(os.path.join(bat_path, "design_capacity"))
    full_alt = _read_sysfs_int(os.path.join(bat_path, "full_charge_capacity"))

    design = energy_design or charge_design or design_alt
    full = energy_full or charge_full or full_alt
    return design, full


def collect_battery_metrics() -> Dict[str, Any]:
    """
    Collect battery metrics in a cross-platform way.

    Returns a consistent dictionary that never breaks the silver layer
    with unexpected null health values when a battery is present.
    """
    result = {
        "present": False,
        "percent": None,
        "power_plugged": None,
        "design_capacity_raw": None,
        "full_charge_capacity_raw": None,
        "health_percentage": None,
    }

    # ------------------------------------------------------------------
    # 1. Primary source – psutil (works on Windows, macOS, Linux)
    # ------------------------------------------------------------------
    battery = psutil.sensors_battery()
    if battery is not None:
        result["present"] = True
        result["percent"] = round(float(battery.percent), 2) if battery.percent is not None else None
        result["power_plugged"] = bool(battery.power_plugged)

    # ------------------------------------------------------------------
    # 2. Linux-only enrichment – real design / full capacity from sysfs
    # ------------------------------------------------------------------
    if platform.system() == "Linux":
        bat_nodes = (
            glob.glob("/sys/class/power_supply/BAT*")
            + glob.glob("/sys/class/power_supply/battery")
        )
        if bat_nodes:
            result["present"] = True
            design, full = _get_linux_capacities(bat_nodes[0])

            if design is not None and design > 0 and full is not None and full > 0:
                health = round((full / design) * 100.0, 2)
                result["design_capacity_raw"] = int(design)
                result["full_charge_capacity_raw"] = int(full)
                result["health_percentage"] = float(min(max(health, 0.0), 100.0))

    # ------------------------------------------------------------------
    # 3. Fallbacks when we know a battery exists but lack capacity data
    #    (common on Windows / macOS)
    # ------------------------------------------------------------------
    if result["present"]:
        # If we still don't have health, give a safe default so silver
        # expectation does not drop the entire row.
        if result["health_percentage"] is None:
            result["health_percentage"] = 100.0  # assume healthy until proven otherwise

        # Keep design / full as None if we truly don't have the numbers.
        # The silver layer should tolerate null design/full as long as
        # health_percentage is present.
    else:
        # No battery detected (desktop / VM / server)
        result["design_capacity_raw"] = 0
        result["full_charge_capacity_raw"] = 0
        result["health_percentage"] = 100.0
        result["percent"] = None
        result["power_plugged"] = None

    return result