"""异步生成任务:内存 job 存储 + 后台线程执行。

generate_tryon 立即返回 pending + generation_id;后台跑生成,完成后落盘并置 succeeded。
get_generation_status 轮询。idempotency_key 去重。
(Cloud Run 单实例够 demo 用;多实例需换共享存储 + GCS,见 README TODO。)
"""

from __future__ import annotations

import threading
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from pathlib import Path

from .contracts import GenerationStatus
from .manifest import REPO_ROOT

DEFAULT_RESULTS_DIR = REPO_ROOT / "image_tryon" / "_generated"


@dataclass
class Job:
    generation_id: str
    status: GenerationStatus = GenerationStatus.PENDING
    views: dict[str, str] = field(default_factory=dict)   # view -> 仓库相对路径
    warnings: list[str] = field(default_factory=list)
    error: str | None = None


class JobStore:
    def __init__(self, max_workers: int = 2, results_dir: Path | None = None):
        self._jobs: dict[str, Job] = {}
        self._by_key: dict[str, str] = {}
        self._lock = threading.Lock()
        self._pool = ThreadPoolExecutor(max_workers=max_workers)
        self.results_dir = Path(results_dir or DEFAULT_RESULTS_DIR)

    def existing(self, idempotency_key: str | None) -> Job | None:
        if not idempotency_key:
            return None
        with self._lock:
            gid = self._by_key.get(idempotency_key)
            return self._jobs.get(gid) if gid else None

    def submit(self, generation_id: str, idempotency_key: str | None, fn, *, sync: bool = False) -> Job:
        job = Job(generation_id)
        with self._lock:
            self._jobs[generation_id] = job
            if idempotency_key:
                self._by_key[idempotency_key] = generation_id
        if sync:
            self._run(generation_id, fn)
        else:
            self._pool.submit(self._run, generation_id, fn)
        return job

    def _run(self, generation_id: str, fn) -> None:
        job = self._jobs[generation_id]
        job.status = GenerationStatus.PROCESSING
        try:
            images, warnings = fn()                 # ({view: bytes}, warnings)
            out = self.results_dir / generation_id
            out.mkdir(parents=True, exist_ok=True)
            for view, data in images.items():
                (out / f"{view}.png").write_bytes(data)
                job.views[view] = f"image_tryon/_generated/{generation_id}/{view}.png"
            job.warnings = list(warnings)
            job.status = GenerationStatus.SUCCEEDED
        except Exception as e:                       # noqa: BLE001 结构化失败
            job.error = f"{type(e).__name__}: {e}"
            job.status = GenerationStatus.FAILED

    def get(self, generation_id: str) -> Job | None:
        with self._lock:
            return self._jobs.get(generation_id)


# 进程级单例
STORE = JobStore()
