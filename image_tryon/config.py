"""配置读取:从 .env 文件 + 环境变量加载敏感配置(零第三方依赖)。

优先级:已存在的环境变量 > .env 文件。.env 已被 .gitignore 忽略,不入库。
"""

from __future__ import annotations

import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = REPO_ROOT / ".env"


def load_dotenv(path: Path | None = None, override: bool = False) -> dict[str, str]:
    """解析 .env(KEY=VALUE,忽略空行与 # 注释)写入 os.environ。返回解析到的键值。"""
    path = path or ENV_FILE
    parsed: dict[str, str] = {}
    if not path.is_file():
        return parsed
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key, value = key.strip(), value.strip().strip('"').strip("'")
        parsed[key] = value
        if override or key not in os.environ:
            os.environ[key] = value
    return parsed


def get(name: str, default: str | None = None) -> str | None:
    load_dotenv()
    return os.environ.get(name, default)


def require(name: str) -> str:
    """取值;缺失则报清晰错误(提示去 .env 填)。"""
    value = get(name)
    if not value:
        raise RuntimeError(
            f"缺少配置 {name}。请在 {ENV_FILE} 中填写(参考 .env.example),"
            f"或设置同名环境变量。"
        )
    return value


def get_gemini_api_key() -> str:
    return require("GEMINI_API_KEY")
