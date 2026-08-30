# MCP tools

`zkvm-host-server` exposes `prove` and `verify` as [MCP](https://modelcontextprotocol.io)
tools, so an MCP client — Claude Desktop, Cursor, or anything else speaking the
protocol — can generate and check real STARK proofs directly, without going through
the `/v1/*` HTTP API or the CLI.

It runs on its **own port, 4478**, separate from the `/v1/*` API on 4477. That's a
deliberate choice, not an oversight: `rmcp`'s `StreamableHttpService` implements
`tower::Service`, but its response type doesn't line up with `axum::Router::nest_service`
without an adapter, and `rmcp`'s own examples serve it via a raw `hyper` accept loop
rather than mounting it on an existing router — so that's the pattern used here too,
instead of asserting an integration that isn't actually demonstrated upstream.

## Connecting a client

Point any MCP client at the streamable HTTP endpoint:

```json
{
  "mcpServers": {
    "zkvm-host": {
      "url": "http://127.0.0.1:4478/"
    }
  }
}
```

For Claude Desktop, this goes in `claude_desktop_config.json`. For Cursor, in its MCP
settings. Start the server first (`cargo run --release -p zkvm-host-server`, or the
built binary directly) — the client connects to an already-running process, it doesn't
launch one.

## What's exposed

- **`prove`** — args: `{ "program": "<.zkasm text>" }`. Returns the proof (base64),
  its byte length, and the public inputs (`initial`, `result`).
- **`verify`** — args: `{ "program": "<.zkasm text>", "proof_base64": "<...>" }`.
  Re-executes `program` locally to know what to check against, then verifies. Returns
  `{ "valid": bool, "result": ..., "error": ... }`.

Both are thin wrappers around the exact same `zkvm-isa` / `zkvm-stark` functions the
CLI and HTTP API use — there's one proving implementation in this repo, exposed three
ways (CLI, HTTP, MCP), not three implementations to keep in sync.

## A real transcript

Captured by [`scripts/mcp_demo.sh`](../scripts/mcp_demo.sh) against a running server
(proof bytes truncated below for readability — the script prints the full thing):

```
$ curl -s -i -X POST http://127.0.0.1:4478/ \
    -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' \
    -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{...}}'

data: {"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2024-11-05","capabilities":{"tools":{}},"serverInfo":{"name":"zkvm-host-server","version":"0.1.0"},"instructions":"Tools for the zkvm-host STARK prover: `prove` a .zkasm program, `verify` a proof against one."}}

(session: 14ca9059-28e7-484c-8cf2-82c371893e75)

$ # tools/call prove
data: {"jsonrpc":"2.0","id":2,"result":{"content":[{"type":"text","text":"{\"initial\":\"5\",\"result\":\"12\",\"proof_bytes\":11277,\"proof_base64\":\"BQAAAwAAEAEAAAAA0/...(11277 bytes)...AAAAA\"}"}],"isError":false}}

$ # tools/call verify (correct program)
data: {"jsonrpc":"2.0","id":3,"result":{"content":[{"type":"text","text":"{\"result\":\"12\",\"valid\":true}"}],"isError":false}}

$ # tools/call verify (WRONG program, same proof)
data: {"jsonrpc":"2.0","id":4,"result":{"content":[{"type":"text","text":"{\"error\":\"constraint evaluations over the out-of-domain frame are inconsistent\",\"valid\":false}"}],"isError":false}}
```

## What this is not

There's no auth on this endpoint — anyone who can reach the port can call `prove`
and `verify`. Fine for local use; not something to expose publicly as-is (see
[`docs/HOST_SERVICE.md`](HOST_SERVICE.md)'s notes on the HTTP API having the same gap).
