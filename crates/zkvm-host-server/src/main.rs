use std::net::SocketAddr;

#[tokio::main]
async fn main() {
    let http_addr = SocketAddr::from(([127, 0, 0, 1], 4477));
    let mcp_addr = SocketAddr::from(([127, 0, 0, 1], 4478));

    let mcp = tokio::spawn(async move {
        zkvm_host_server::mcp::serve(mcp_addr)
            .await
            .unwrap_or_else(|e| panic!("MCP server error: {e}"));
    });

    let app = zkvm_host_server::app();
    let listener = tokio::net::TcpListener::bind(http_addr)
        .await
        .unwrap_or_else(|e| panic!("failed to bind {http_addr}: {e}"));
    println!("zkvm-host-server listening on http://{http_addr}");
    let http = tokio::spawn(async move {
        axum::serve(listener, app)
            .await
            .unwrap_or_else(|e| panic!("server error: {e}"));
    });

    let _ = tokio::join!(http, mcp);
}
