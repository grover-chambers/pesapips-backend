"""
MT5 File-based IPC bridge.
Communicates with PesaPipsEA via shared files in MT5 common data folder.
"""
import os
import json
import time
import threading
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# MT5 common data path on Wine
MT5_COMMON_PATH = os.path.expanduser(
    "~/.wine/drive_c/users/brayo/AppData/Roaming/MetaQuotes/Terminal/Common/Files/PesaPips"
)

class MT5Bridge:
    def __init__(self, data_path: str = MT5_COMMON_PATH):
        self.path     = Path(data_path)
        self.cmd_file = self.path / "command.txt"
        self.rsp_file = self.path / "response.txt"
        self.hbt_file = self.path / "heartbeat.txt"
        self._lock    = threading.Lock()

    def _ensure_path(self):
        self.path.mkdir(parents=True, exist_ok=True)

    def is_connected(self) -> bool:
        try:
            if not self.hbt_file.exists():
                return False
            content = self.hbt_file.read_text().strip()
            if not content.startswith("ready|"):
                return False
            # Use file modification time — avoids MT5 broker time vs system time mismatch
            mtime = self.hbt_file.stat().st_mtime
            return (time.time() - mtime) < 10
        except:
            return False

    def _send(self, command: dict, timeout: float = 10.0) -> dict:
        with self._lock:
            try:
                self._ensure_path()

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
                            self.rsp_file.unlink()
                            return json.loads(content)
                    time.sleep(0.05)

                return {"status": "error", "message": "MT5 timeout — make sure EA is running"}

            except json.JSONDecodeError:
                return {"status": "error", "message": "Invalid response from MT5"}
            except Exception as e:
                logger.error(f"MT5 bridge error: {e}")
                return {"status": "error", "message": str(e)}

    def ping(self)         -> dict: return self._send({"action": "PING"})
    def get_balance(self)  -> dict: return self._send({"action": "BALANCE"})
    def get_positions(self)-> dict: return self._send({"action": "POSITIONS"})
    def get_history(self)  -> dict: return self._send({"action": "HISTORY"})

    def buy(self, symbol, volume, sl=0.0, tp=0.0, comment="PesaPips") -> dict:
        return self._send({"action":"BUY","symbol":symbol,"volume":volume,"sl":sl,"tp":tp,"comment":comment})

    def sell(self, symbol, volume, sl=0.0, tp=0.0, comment="PesaPips") -> dict:
        return self._send({"action":"SELL","symbol":symbol,"volume":volume,"sl":sl,"tp":tp,"comment":comment})

    def close(self, ticket: int) -> dict:
        return self._send({"action":"CLOSE","ticket":str(ticket)})

    def close_all(self) -> dict:
        return self._send({"action":"CLOSE_ALL"})

# Global instance
mt5 = MT5Bridge()
