import urllib.request
import json

# (country, city, lat, lon)
_cache: dict[str, tuple[str | None, str | None, float | None, float | None]] = {}

_PRIVATE_PREFIXES = ("10.", "192.168.", "127.", "172.16.", "172.17.", "172.18.",
                     "172.19.", "172.20.", "172.21.", "172.22.", "172.23.",
                     "172.24.", "172.25.", "172.26.", "172.27.", "172.28.",
                     "172.29.", "172.30.", "172.31.", "::1", "fc", "fd")


def lookup(ip: str) -> tuple[str | None, float | None, float | None]:
    """Legacy 3-tuple interface: (country, lat, lon)"""
    country, _, lat, lon = lookup_full(ip)
    return country, lat, lon


def lookup_full(ip: str) -> tuple[str | None, str | None, float | None, float | None]:
    """Returns (country, city, lat, lon)"""
    if ip in _cache:
        return _cache[ip]

    if any(ip.startswith(p) for p in _PRIVATE_PREFIXES):
        _cache[ip] = (None, None, None, None)
        return _cache[ip]

    result = _try_ipinfo(ip) or _try_ipapi(ip) or (None, None, None, None)
    _cache[ip] = result
    return result


def _try_ipinfo(ip: str) -> tuple[str | None, str | None, float | None, float | None] | None:
    try:
        url = f"https://ipinfo.io/{ip}/json"
        with urllib.request.urlopen(url, timeout=4) as resp:
            data = json.loads(resp.read())
        if "loc" in data and data.get("country"):
            lat, lon = data["loc"].split(",")
            return (data.get("country"), data.get("city"), float(lat), float(lon))
    except Exception:
        pass
    return None


def _try_ipapi(ip: str) -> tuple[str | None, str | None, float | None, float | None] | None:
    try:
        url = f"http://ip-api.com/json/{ip}?fields=status,countryCode,city,lat,lon"
        with urllib.request.urlopen(url, timeout=3) as resp:
            data = json.loads(resp.read())
        if data.get("status") == "success":
            return (data.get("countryCode"), data.get("city"), float(data["lat"]), float(data["lon"]))
    except Exception:
        pass
    return None
