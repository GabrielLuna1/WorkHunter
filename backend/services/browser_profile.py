import random
from typing import Dict, Any


USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
]

VIEWPORTS = [
    {"width": 1920, "height": 1080},
    {"width": 1536, "height": 864},
    {"width": 1440, "height": 900},
    {"width": 1366, "height": 768},
]

TIMEZONES = [
    "America/Sao_Paulo",
    "America/Fortaleza",
    "America/Manaus",
]

LOCALES = [
    "pt-BR",
    "pt-BR,en-US,en;q=0.9",
]

PLATFORMS = ["Win32", "Win64"]


class DeviceProfile:
    def generate(self) -> Dict[str, Any]:
        ua = random.choice(USER_AGENTS)
        viewport = random.choice(VIEWPORTS)
        timezone = random.choice(TIMEZONES)
        locale = random.choice(LOCALES)
        platform = random.choice(PLATFORMS)

        chrome_version = ua.split("Chrome/")[1][:3] if "Chrome" in ua else ""
        extra_headers = {
            "Accept-Language": locale.split(",")[0] + "," + locale,
            "Sec-CH-UA": (
                f'"Google Chrome";v="{chrome_version}", '
                f'"Chromium";v="{chrome_version}", "Not=A?Brand";v="99"'
            )
            if chrome_version
            else "",
            "Sec-CH-UA-Mobile": "?0",
            "Sec-CH-UA-Platform": f'"{platform}"' if platform else "",
        }

        return {
            "viewport": viewport,
            "user_agent": ua,
            "timezone_id": timezone,
            "locale": locale,
            "device_scale_factor": 1,
            "is_mobile": False,
            "has_touch": False,
            "extra_http_headers": extra_headers,
            "color_scheme": "light" if random.random() < 0.7 else "dark",
        }

    def get_browser_script(self) -> str:
        return ""


device_profile = DeviceProfile()
