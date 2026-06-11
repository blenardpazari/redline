import urllib.request
import json

_cache: dict[str, tuple[str | None, float | None, float | None]] = {}


def lookup(ip: str) -> tuple[str | None, float | None, float | None]:
    if ip in _cache:
        return _cache[ip]

    if ip.startswith(("10.", "192.168.", "127.", "172.", "::1", "fc", "fd")):
        _cache[ip] = (None, None, None)
        return _cache[ip]

    try:
        url = f"http://ip-api.com/json/{ip}?fields=status,countryCode,lat,lon"
        with urllib.request.urlopen(url, timeout=3) as resp:
            data = json.loads(resp.read())
        if data.get("status") == "success":
            result = (data.get("countryCode"), float(data["lat"]), float(data["lon"]))
        else:
            result = (None, None, None)
    except Exception:
        result = (None, None, None)

    _cache[ip] = result
    return result
