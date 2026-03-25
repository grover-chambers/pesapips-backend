#!/usr/bin/env python3
"""
PesaPips Agent v1.0
Run this on the same computer as your MT5 terminal.
It connects your MT5 to your PesaPips dashboard.

Usage:
    python3 pesapips_agent.py --token YOUR_TOKEN --server https://your-server.com
"""
import asyncio
import socket
import json
import time
import argparse
import logging
import sys
from datetime import datetime

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

# ── CONFIG ────────────────────────────────────────────────────────────────────
MT5_HOST    = "127.0.0.1"
MT5_PORT    = 9999
RECONNECT_DELAY = 5  # seconds between reconnect attempts

# ── MT5 SOCKET CLIENT ─────────────────────────────────────────────────────────
def send_to_mt5(command: dict, timeout: float = 10.0) -> dict:
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        sock.connect((MT5_HOST, MT5_PORT))
        payload = json.dumps(command) + "\n"
        sock.sendall(payload.encode("utf-8"))
        response = b""
        while True:
            chunk = sock.recv(4096)
            if not chunk:
                break
            response += chunk
            if b"\n" in response:
                break
        sock.close()
        return json.loads(response.decode("utf-8").strip())
    except ConnectionRefusedError:
        return {"status": "error", "message": "MT5 not running or EA not attached"}
    except socket.timeout:
        return {"status": "error", "message": "MT5 timeout"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def check_mt5() -> bool:
    result = send_to_mt5({"action": "PING"})
    return result.get("status") == "ok"

# ── MAIN AGENT LOOP ───────────────────────────────────────────────────────────
async def run_agent(server_url: str, user_id: int, token: str):
    ws_url = f"{server_url}/ws/agent/{user_id}/{token}"
    ws_url = ws_url.replace("https://", "wss://").replace("http://", "ws://")

    logger.info(f"PesaPips Agent starting...")
    logger.info(f"Server: {server_url}")

    while True:
        # Check MT5 first
        if not check_mt5():
            logger.warning("MT5 not reachable. Make sure PesaPipsEA is running in MT5. Retrying in 10s...")
            await asyncio.sleep(10)
            continue

        logger.info("MT5 connected!")

        try:
            async with websockets.connect(ws_url, ping_interval=20, ping_timeout=10) as ws:
                logger.info("Connected to PesaPips server!")
                logger.info("Agent is ready. Your dashboard will show MT5 as connected.")

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

                        logger.info(f"Command received: {command.get('action', 'unknown')}")

                        # Forward to MT5
                        result = send_to_mt5(command)
                        result["request_id"] = command.get("request_id", "")

                        # Send result back
                        await ws.send(json.dumps(result))
                        logger.info(f"Result sent: {result.get('status', 'unknown')}")

                    except json.JSONDecodeError:
                        pass
                    except Exception as e:
                        logger.error(f"Error processing command: {e}")

        except websockets.exceptions.ConnectionClosed as e:
            logger.warning(f"Disconnected from server (code={e.code}). Reconnecting in {RECONNECT_DELAY}s...")
        except OSError as e:
            logger.warning(f"Connection error: {e}. Reconnecting in {RECONNECT_DELAY}s...")
        except Exception as e:
            logger.error(f"Unexpected error: {e}. Reconnecting in {RECONNECT_DELAY}s...")

        await asyncio.sleep(RECONNECT_DELAY)

# ── ENTRY POINT ───────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="PesaPips MT5 Agent")
    parser.add_argument("--token",   required=True, help="Your PesaPips API token")
    parser.add_argument("--user-id", required=True, type=int, help="Your PesaPips user ID")
    parser.add_argument("--server",  default="http://localhost:8000", help="PesaPips server URL")
    args = parser.parse_args()

    print("=" * 50)
    print("  PesaPips Agent v1.0")
    print("  Keep this window open while trading")
    print("=" * 50)

    try:
        asyncio.run(run_agent(args.server, args.user_id, args.token))
    except KeyboardInterrupt:
        logger.info("Agent stopped.")

if __name__ == "__main__":
    main()
