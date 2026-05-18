def estimate_ups_runtime_minutes(
    power_source: str,
    battery_percent: float | None,
    load_percent: float | None
) -> float | None:
    if power_source != "ups":
        return None

    if battery_percent is None or load_percent is None:
        return None

    if load_percent <= 0:
        return None

    estimated_runtime = (battery_percent / load_percent) * 60

    return round(estimated_runtime, 2)