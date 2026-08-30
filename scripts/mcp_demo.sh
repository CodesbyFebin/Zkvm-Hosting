#!/usr/bin/env bash
# A real MCP conversation against the real server: initialize -> tools/list ->
# tools/call prove -> tools/call verify (twice: once against the correct
# program, once against a different one, to show it actually rejects). Prints
# a transcript -- this is what docs/MCP.md's example output was captured from.
set -euo pipefail
cd "$(dirname "$0")/.."

MCP=http://127.0.0.1:4478
PROGRAM='INIT 5\nADD 3\nMUL 2\nSUB 4\n'
WRONG_PROGRAM='INIT 5\nADD 3\nMUL 2\nSUB 5\n'

SERVER_PID=""
cleanup() { [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null || true; }
trap cleanup EXIT

echo "=== starting zkvm-host-server ==="
./target/release/zkvm-host-server >/tmp/mcp_demo_server.log 2>&1 &
SERVER_PID=$!
for _ in $(seq 1 40); do
  curl -sf http://127.0.0.1:4477/healthz >/dev/null 2>&1 && break
  sleep 0.3
done
# The MCP listener is a second, independently-started task in the same
# process; wait for it too rather than assuming it's up alongside :4477.
for _ in $(seq 1 40); do
  curl -s -o /dev/null "$MCP/" && break
  sleep 0.3
done

echo
echo "\$ curl -s -i -X POST $MCP/ \\"
echo "    -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' \\"
echo "    -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"initialize\",\"params\":{...}}'"
echo

INIT_HEADERS=$(mktemp)
INIT_BODY=$(curl -s -D "$INIT_HEADERS" -X POST "$MCP/" \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"demo","version":"0.0.1"}}}')
SESSION=$(grep -i '^mcp-session-id:' "$INIT_HEADERS" | tr -d '\r' | awk '{print $2}')
rm -f "$INIT_HEADERS"
echo "$INIT_BODY" | grep '^data: {'
echo
echo "(session: $SESSION)"

call() {
  local id="$1" name="$2" args="$3"
  curl -s -X POST "$MCP/" \
    -H 'content-type: application/json' \
    -H 'accept: application/json, text/event-stream' \
    -H "mcp-session-id: $SESSION" \
    -d "{\"jsonrpc\":\"2.0\",\"id\":$id,\"method\":\"tools/call\",\"params\":{\"name\":\"$name\",\"arguments\":$args}}" \
    | grep '^data: {'
}

echo
echo "\$ # tools/call prove"
PROVE_RESULT=$(call 2 prove "{\"program\":\"$PROGRAM\"}")
echo "$PROVE_RESULT"
PROOF_B64=$(echo "$PROVE_RESULT" | sed 's/^data: //' | python3 -c "import sys,json; d=json.load(sys.stdin); print(json.loads(d['result']['content'][0]['text'])['proof_base64'])")

echo
echo "\$ # tools/call verify (correct program)"
call 3 verify "{\"program\":\"$PROGRAM\",\"proof_base64\":\"$PROOF_B64\"}"

echo
echo "\$ # tools/call verify (WRONG program, same proof)"
call 4 verify "{\"program\":\"$WRONG_PROGRAM\",\"proof_base64\":\"$PROOF_B64\"}"
