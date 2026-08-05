#!/usr/bin/env python3
from __future__ import annotations

import argparse
import http.server
import os
import socketserver
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve the Math ChackChack repository locally")
    parser.add_argument("--port", type=int, default=4173)
    args = parser.parse_args()

    root = Path(__file__).resolve().parents[1]
    os.chdir(root)
    handler = http.server.SimpleHTTPRequestHandler
    with socketserver.TCPServer(("127.0.0.1", args.port), handler) as server:
        print(f"Serving {root} at http://127.0.0.1:{args.port}/apps/web/")
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
