#!/usr/bin/env python3
"""
PesaPips Agent v2.0 — File-based IPC Bridge
Works on Windows, Linux (Wine), and Mac.
Reads/writes files in MT5 Common/Files/PesaPips folder.
Bridges them to PesaPips backend via WebSocket.

Usage:
    python3 pesapips_agent.py --token YOUR_TOKEN --user-id YOUR_ID --server https://pesapips-backend.onrender.com
"""
import asyncio
import json
import time
import argparse
import logging
import sys
import os
import platform
from pathlib import Path

try:
    import websockets
except ImportError:
    print("Installing websockets...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "websockets"])
    import websockets

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [PesaPips] %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger(__name__)

RECONNECT_DELAY = 5


# ── AUTO-DETECT MT5 FILES PATH ────────────────────────────────────────────────

def find_mt5_path() -> Path:
    """
    Auto-detect MT5 Common/Files/PesaPips path across Windows, Linux (Wine), Mac.
    """
    system = platform.system()
    candidates = []

    if system == "Windows":
        # Standard Windows MT5 path
        appdata = os.environ.get("APPDATA", "")
        candidates += [
            Path(appdata) / "MetaQuotes" / "Terminal" / "Common" / "Files" / "PesaPips",
        ]
        # Also scan all terminal IDs
        mq_root = Path(appdata) / "MetaQuotes" / "Terminal"
        if mq_root.exists():
            for terminal_dir in mq_root.iterdir():
                p = terminal_dir / "MQL5" / "Files" / "PesaPips"
                candidates.append(p)

    elif system == "Linux":
        # Wine path on Linux
        home = Path.home()
        candidates += [
            home / ".wine" / "drive_c" / "users" / os.environ.get("USER", "user") / "AppData" / "Roaming" / "MetaQuotes" / "Terminal" / "Common" / "Files" / "PesaPips",
            home / ".wine" / "drive_c" / "Program Files" / "MetaTrader 5" / "MQL5" / "Files" / "PesaPips",
        ]
        # Scan all wine users
        wine_users = home / ".wine" / "drive_c" / "users"
        if wine_users.exists():
            for user_dir in wine_users.iterdir():
                p = user_dir / "AppData" / "Roaming" / "MetaQuotes" / "Terminal" / "Common" / "Files" / "PesaPips"
                candidates.append(p)

    elif system == "Darwin":
        # Mac — MT5 via Wine or CrossOver
        home = Path.home()
        candidates += [
            home / "Library" / "Application Support" / "MetaTrader 5" / "MQL5" / "Files" / "PesaPips",
            home / ".wine" / "drive_c" / "users" / os.environ.get("USER", "user") / "AppData" / "Roaming" / "MetaQuotes" / "Terminal" / "Common" / "Files" / "PesaPips",
        ]

    # Check which path has the heartbeat file (EA is running there)
    for path in candidates:
        hbt = path / "heartbeat.txt"
        if hbt.exists():
            logger.info(f"Found MT5 EA at: {path}")
            return path

    # Return first candidate as default (will be created)
    if candidates:
        logger.warning(f"EA not detected yet. Using default path: {candidates[0]}")
        return candidates[0]

    # Absolute fallback
    fallback = Path.home() / "MT5_PesaPips"
    logger.warning(f"Could not detect MT5 path. Using fallback: {fallback}")
    return fallback


# ── FILE IPC CLIENT ───────────────────────────────────────────────────────────

class MT5FileClient:
    def __init__(self, path: Path):
        self.path     = path
        self.cmd_file = path / "command.txt"
        self.rsp_file = path / "response.txt"
        self.hbt_file = path / "heartbeat.txt"

    def is_connected(self) -> bool:
        try:
            if not self.hbt_file.exists():
                return False
            content = self.hbt_file.read_text().strip()
            if not content.startswith("ready|"):
                return False
            # Use file modification time — avoids MT5 broker time vs system clock mismatch
            mtime = self.hbt_file.stat().st_mtime
            return (time.time() - mtime) < 10
        except:
            return False

    def send(self, command: dict, timeout: float = 10.0) -> dict:
        try:
            self.path.mkdir(parents=True, exist_ok=True)

            # Clean old response
            if self.rsp_file.exists():
                self.rsp_file.unlink()

            # Write command
            self.cmd_file.write_text(json.dumps(command, separators=(",", ":")))

            # Wait for response
            start = time.time()
            while time.time() - start < timeout:
                if self.rsp_file.exists():
                    content = self.rsp_file.read_text().strip()
                    if content:
                        try:
                            self.rsp_file.unlink()
                        except:
                            pass
                        return json.loads(content)
                time.sleep(0.05)

            return {"status": "error", "message": "MT5 timeout — make sure EA is running and attached to a chart"}

        except Exception as e:
            return {"status": "error", "message": str(e)}


# ── MAIN AGENT LOOP ───────────────────────────────────────────────────────────

async def run_agent(server_url: str, user_id: int, token: str, mt5_path: Path = None):
    if mt5_path is None:
        mt5_path = find_mt5_path()

    client = MT5FileClient(mt5_path)
    ws_url = f"{server_url}/ws/agent/{user_id}/{token}"
    ws_url = ws_url.replace("https://", "wss://").replace("http://", "ws://")

    logger.info("=" * 50)
    logger.info("  PesaPips Agent v2.0")
    logger.info(f"  Platform : {platform.system()}")
    logger.info(f"  MT5 Path : {mt5_path}")
    logger.info(f"  Server   : {server_url}")
    logger.info("  Keep this window open while trading")
    logger.info("=" * 50)

    while True:
        # Wait for EA to be ready
        if not client.is_connected():
            logger.warning("Waiting for MT5 EA... Make sure PesaPipsEA.mq5 is attached to a chart in MT5.")
            await asyncio.sleep(5)
            continue

        logger.info("MT5 EA detected and ready!")

        try:
            async with websockets.connect(
                ws_url,
                ping_interval=20,
                ping_timeout=10,
                open_timeout=15,
            ) as ws:
                logger.info("Connected to PesaPips server!")
                logger.info("Your dashboard will now show MT5 as CONNECTED.")

                async def heartbeat():
                    while True:
                        await asyncio.sleep(15)
                        try:
                            await ws.send(json.dumps({"type": "ping"}))
                        except:
                            break

                asyncio.create_task(heartbeat())

                async for message in ws:
                    try:
                        command = json.loads(message)

                        if command.get("type") == "pong":
                            continue

                        action = command.get("action", "unknown")
                        logger.info(f"← Command: {action}")

                        # Forward to MT5 EA via file IPC (blocking — run in thread)
                        loop = asyncio.get_event_loop()
                        result = await loop.run_in_executor(None, client.send, command)
                        result["request_id"] = command.get("request_id", "")

                        await ws.send(json.dumps(result))
                        logger.info(f"→ Result: {result.get('status')} ({action})")

                    except json.JSONDecodeError:
                        pass
                    except Exception as e:
                        logger.error(f"Error processing command: {e}")

        except websockets.exceptions.ConnectionClosed as e:
            logger.warning(f"Server disconnected (code={e.code}). Reconnecting in {RECONNECT_DELAY}s...")
        except OSError as e:
            logger.warning(f"Connection error: {e}. Reconnecting in {RECONNECT_DELAY}s...")
        except Exception as e:
            logger.error(f"Unexpected error: {e}. Reconnecting in {RECONNECT_DELAY}s...")

        await asyncio.sleep(RECONNECT_DELAY)


# ── ENTRY POINT ───────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="PesaPips MT5 Agent v2.0")
    parser.add_argument("--token",   required=True,  help="Your PesaPips API token (from Dashboard → MT5 Connect)")
    parser.add_argument("--user-id", required=True,  type=int, help="Your PesaPips user ID")
    parser.add_argument("--server",  default="https://pesapips-backend.onrender.com", help="PesaPips server URL")
    parser.add_argument("--mt5-path", default=None,  help="Manual MT5 Common/Files/PesaPips path (optional — auto-detected)")
    args = parser.parse_args()

    mt5_path = Path(args.mt5_path) if args.mt5_path else None

    try:
        asyncio.run(run_agent(args.server, args.user_id, args.token, mt5_path))
    except KeyboardInterrupt:
        logger.info("Agent stopped by user.")

if __name__ == "__main__":
    main()
