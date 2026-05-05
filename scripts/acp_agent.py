#!/usr/bin/env python3
"""
ACP Universal Agent Connector
Connect ANY Python-based agent to the Agent Control Panel.

Works with:
- OpenCode, Claude Code, Codex, Hermes, LangChain, AutoGen, CrewAI,
- Custom scripts, Jupyter notebooks, cron jobs, etc.

Usage:
    python acp_agent.py --url http://acp.example.com --name "MyBot" --type custom
    python acp_agent.py --daemon  # Run heartbeat in background

Or import as a library:
    from acp_agent import ACPClient
    client = ACPClient("http://acp.example.com", "MyBot", "custom")
    client.onboard()
    client.pulse(activity="Working on feature X", current_task="auth fix")
"""

import argparse
import os
import sys
import time
import json
import threading
from typing import Optional, Dict, Any

# Optional dependencies - graceful degradation
HAS_REQUESTS = False
try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    pass


class ACPClient:
    """Universal ACP client for any Python agent."""

    def __init__(
        self,
        base_url: str,
        name: str,
        agent_type: str = "custom",
        model: str = "",
        provider: str = "",
        heartbeat_interval: int = 60,
    ):
        self.base_url = base_url.rstrip("/")
        self.name = name
        self.agent_type = agent_type
        self.model = model
        self.provider = provider
        self.heartbeat_interval = heartbeat_interval
        self.agent_id: Optional[str] = None
        self._heartbeat_thread: Optional[threading.Thread] = None
        self._stop_heartbeat = threading.Event()

    def _request(self, method: str, path: str, **kwargs) -> Dict[str, Any]:
        """Make HTTP request with graceful fallback."""
        url = f"{self.base_url}{path}"
        headers = {"Content-Type": "application/json"}
        headers.update(kwargs.pop("headers", {}))

        if HAS_REQUESTS:
            resp = requests.request(method, url, headers=headers, timeout=10, **kwargs)
            resp.raise_for_status()
            return resp.json()
        else:
            # Fallback to urllib (stdlib only)
            import urllib.request
            import urllib.error

            data = kwargs.get("json")
            if data:
                data = json.dumps(data).encode()

            req = urllib.request.Request(url, data=data, headers=headers, method=method)
            try:
                with urllib.request.urlopen(req, timeout=10) as resp:
                    return json.loads(resp.read().decode())
            except urllib.error.HTTPError as e:
                raise RuntimeError(f"HTTP {e.code}: {e.read().decode()}")

    def onboard(self) -> Dict[str, Any]:
        """Register agent with ACP. Returns agent config."""
        print(f"[ACP] Onboarding '{self.name}' to {self.base_url}...")

        payload = {
            "name": self.name,
            "type": self.agent_type,
            "model": self.model,
            "provider": self.provider,
        }

        result = self._request("POST", "/api/onboard", json=payload)
        self.agent_id = result.get("agent_id")

        print(f"[ACP] \u2705 Connected! Agent ID: {self.agent_id}")
        print(f"[ACP] Dashboard: {self.base_url}")

        # Save config
        config_dir = os.path.expanduser("~/.acp")
        os.makedirs(config_dir, exist_ok=True)
        with open(f"{config_dir}/agent.json", "w") as f:
            json.dump({
                "base_url": self.base_url,
                "agent_id": self.agent_id,
                "name": self.name,
                "type": self.agent_type,
                "model": self.model,
                "provider": self.provider,
            }, f, indent=2)

        return result

    def heartbeat(self) -> bool:
        """Send a single heartbeat. Returns True if successful."""
        if not self.agent_id:
            raise RuntimeError("Agent not onboarded. Call onboard() first.")
        try:
            self._request("POST", f"/api/agents/{self.agent_id}/heartbeat")
            return True
        except Exception as e:
            print(f"[ACP] Heartbeat failed: {e}")
            return False

    def pulse(
        self,
        activity: str,
        current_task: Optional[str] = None,
        current_project: Optional[str] = None,
        status: str = "active",
        **extra,
    ) -> bool:
        """Send a real-time pulse update."""
        if not self.agent_id:
            raise RuntimeError("Agent not onboarded. Call onboard() first.")

        payload = {
            "activity": activity,
            "model": self.model,
            "provider": self.provider,
            "status": status,
        }
        if current_task:
            payload["current_task"] = current_task
        if current_project:
            payload["current_project"] = current_project
        payload.update(extra)

        try:
            self._request("POST", f"/api/agents/{self.agent_id}/pulse", json=payload)
            return True
        except Exception as e:
            print(f"[ACP] Pulse failed: {e}")
            return False

    def start_heartbeat(self) -> None:
        """Start background heartbeat thread."""
        if self._heartbeat_thread and self._heartbeat_thread.is_alive():
            return

        self._stop_heartbeat.clear()

        def loop():
            while not self._stop_heartbeat.is_set():
                ok = self.heartbeat()
                if ok:
                    print(f"[ACP] Heartbeat OK at {time.strftime('%H:%M:%S')}")
                self._stop_heartbeat.wait(self.heartbeat_interval)

        self._heartbeat_thread = threading.Thread(target=loop, daemon=True)
        self._heartbeat_thread.start()
        print(f"[ACP] Heartbeat thread started (interval: {self.heartbeat_interval}s)")

    def stop_heartbeat(self) -> None:
        """Stop background heartbeat."""
        self._stop_heartbeat.set()
        if self._heartbeat_thread:
            self._heartbeat_thread.join(timeout=5)

    def query(self, query_text: str) -> bool:
        """Send a query to another agent (requires auth)."""
        if not self.agent_id:
            raise RuntimeError("Agent not onboarded.")
        try:
            self._request(
                "POST", f"/api/agents/{self.agent_id}/query", json={"query": query_text}
            )
            return True
        except Exception as e:
            print(f"[ACP] Query failed: {e}")
            return False


def main():
    parser = argparse.ArgumentParser(description="ACP Universal Agent Connector")
    parser.add_argument("--url", default=os.getenv("ACP_URL", "http://localhost:3104"), help="ACP base URL")
    parser.add_argument("--name", default=os.getenv("AGENT_NAME", os.uname().nodename), help="Agent name")
    parser.add_argument("--type", default=os.getenv("AGENT_TYPE", "custom"), help="Agent type")
    parser.add_argument("--model", default=os.getenv("AGENT_MODEL", ""), help="Model name")
    parser.add_argument("--provider", default=os.getenv("AGENT_PROVIDER", ""), help="Provider name")
    parser.add_argument("--heartbeat", type=int, default=int(os.getenv("HEARTBEAT_INTERVAL", "60")), help="Heartbeat interval (seconds)")
    parser.add_argument("--daemon", action="store_true", help="Run heartbeat in background")
    parser.add_argument("--pulse", help="Send a one-time pulse with this activity text")
    parser.add_argument("--task", help="Current task for pulse")
    parser.add_argument("--project", help="Current project for pulse")
    args = parser.parse_args()

    client = ACPClient(
        base_url=args.url,
        name=args.name,
        agent_type=args.type,
        model=args.model,
        provider=args.provider,
        heartbeat_interval=args.heartbeat,
    )

    # Try to load existing config
    config_path = os.path.expanduser("~/.acp/agent.json")
    if os.path.exists(config_path):
        with open(config_path) as f:
            saved = json.load(f)
        if saved.get("base_url") == args.url and saved.get("name") == args.name:
            client.agent_id = saved.get("agent_id")
            print(f"[ACP] Loaded existing agent ID: {client.agent_id}")

    # Onboard if needed
    if not client.agent_id:
        client.onboard()

    # One-time pulse
    if args.pulse:
        client.pulse(
            activity=args.pulse,
            current_task=args.task,
            current_project=args.project,
        )
        print(f"[ACP] Pulse sent: {args.pulse}")
        return

    # Heartbeat mode
    if args.daemon:
        client.start_heartbeat()
        print("[ACP] Running in daemon mode. Press Ctrl+C to stop.")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            client.stop_heartbeat()
            print("[ACP] Stopped.")
    else:
        # Single heartbeat + pulse demo
        client.heartbeat()
        client.pulse(activity="Connected and ready", current_task="idle")
        print("[ACP] One-shot complete. Use --daemon for continuous heartbeat.")


if __name__ == "__main__":
    main()
