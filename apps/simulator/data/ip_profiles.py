from typing import TypedDict


class IpProfile(TypedDict):
    ip: str
    country: str
    country_name: str
    lat: float
    lon: float
    behavior: str
    user_agent: str


IP_PROFILES: list[IpProfile] = [
    {"ip": "45.33.32.156",    "country": "RU", "country_name": "Russia",         "lat": 55.75,  "lon":  37.61, "behavior": "brute_force",   "user_agent": "Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1)"},
    {"ip": "185.220.101.47",  "country": "RU", "country_name": "Russia",         "lat": 59.95,  "lon":  30.32, "behavior": "ddos",           "user_agent": "python-requests/2.28.0"},
    {"ip": "77.88.55.80",     "country": "RU", "country_name": "Russia",         "lat": 55.75,  "lon":  37.61, "behavior": "scanner",        "user_agent": "Nikto/2.1.6"},
    {"ip": "222.186.30.111",  "country": "CN", "country_name": "China",          "lat": 31.23,  "lon": 121.47, "behavior": "sql_injection",  "user_agent": "sqlmap/1.7.8#stable"},
    {"ip": "101.71.38.3",     "country": "CN", "country_name": "China",          "lat": 39.93,  "lon": 116.39, "behavior": "scanner",        "user_agent": "curl/7.81.0"},
    {"ip": "180.163.220.52",  "country": "CN", "country_name": "China",          "lat": 31.23,  "lon": 121.47, "behavior": "bot",            "user_agent": "Mozilla/5.0 (compatible; Baiduspider/2.0)"},
    {"ip": "177.128.138.70",  "country": "BR", "country_name": "Brazil",         "lat": -23.55, "lon": -46.64, "behavior": "ddos",           "user_agent": "python-httpx/0.24.0"},
    {"ip": "189.40.6.27",     "country": "BR", "country_name": "Brazil",         "lat": -15.78, "lon": -47.93, "behavior": "normal",         "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"},
    {"ip": "175.45.176.3",    "country": "KP", "country_name": "North Korea",    "lat": 39.02,  "lon": 125.75, "behavior": "brute_force",   "user_agent": "Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.1)"},
    {"ip": "175.45.177.12",   "country": "KP", "country_name": "North Korea",    "lat": 39.02,  "lon": 125.75, "behavior": "scanner",        "user_agent": "curl/7.64.1"},
    {"ip": "5.160.218.21",    "country": "IR", "country_name": "Iran",           "lat": 35.69,  "lon":  51.42, "behavior": "sql_injection",  "user_agent": "sqlmap/1.7.2"},
    {"ip": "91.98.37.210",    "country": "IR", "country_name": "Iran",           "lat": 35.69,  "lon":  51.42, "behavior": "ddos",           "user_agent": "python-requests/2.31.0"},
    {"ip": "104.21.14.101",   "country": "US", "country_name": "United States",  "lat": 37.75,  "lon": -97.82, "behavior": "normal",         "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/537.36"},
    {"ip": "172.64.80.1",     "country": "US", "country_name": "United States",  "lat": 47.61,  "lon": -122.33,"behavior": "normal",         "user_agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Mobile/15E148"},
    {"ip": "198.41.214.162",  "country": "US", "country_name": "United States",  "lat": 40.71,  "lon": -74.01, "behavior": "normal",         "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/121.0.0.0"},
    {"ip": "104.16.123.96",   "country": "US", "country_name": "United States",  "lat": 37.38,  "lon": -122.08,"behavior": "normal",         "user_agent": "Mozilla/5.0 (X11; Linux x86_64) Firefox/121.0"},
    {"ip": "81.169.145.105",  "country": "DE", "country_name": "Germany",        "lat": 52.52,  "lon":  13.40, "behavior": "normal",         "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"},
    {"ip": "217.160.0.113",   "country": "DE", "country_name": "Germany",        "lat": 48.14,  "lon":  11.58, "behavior": "normal",         "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) Safari/605.1.15"},
    {"ip": "188.43.182.40",   "country": "AL", "country_name": "Albania",        "lat": 41.33,  "lon":  19.83, "behavior": "brute_force",   "user_agent": "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:40.0) Firefox/40.0"},
    {"ip": "82.116.76.157",   "country": "AL", "country_name": "Albania",        "lat": 40.46,  "lon":  19.49, "behavior": "sql_injection",  "user_agent": "sqlmap/1.6.12"},
]
