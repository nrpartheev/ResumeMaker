import os

bind = f"0.0.0.0:{os.environ.get('PORT', '5900')}"
workers = 1
worker_class = "sync"
timeout = 300        # 5 minutes — AI calls can take 30-60s
graceful_timeout = 30
keepalive = 5
max_requests = 50
max_requests_jitter = 10
