import { DurableObject } from "cloudflare:workers";

export class Terminal extends DurableObject {
  // 必須要有這個 fetch 函式，處理進入容器的流量
  async fetch(request) {
    // 將請求轉發到背景運行的 Docker 容器 (根據您的設定為 7860 Port)
    const url = new URL(request.url);
    url.protocol = "http:";
    url.hostname = "127.0.0.1";
    url.port = "7860";
    
    // 複製 Headers 以便修改
    const headers = new Headers(request.headers);
    // ⚠️ 關鍵修復：強制將 Host 改為 127.0.0.1
    // 若保留原始的 Host，Cloudflare 防火牆會認為這是非法的內部路由並拋出 Error 1003
    headers.set("Host", "127.0.0.1");
    
    // 複製原始請求的設定
    const init = {
      method: request.method,
      headers: headers,
      redirect: "manual"
    };
    
    // 確保 GET 和 HEAD 請求沒有 body，避免引發 TypeError
    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = request.body;
    }

    const proxiedRequest = new Request(url.toString(), init);

    try {
      // 將請求打給同一個網路環境下的容器
      return await fetch(proxiedRequest);
    } catch (err) {
      return new Response("Container is booting up or unreachable. Please refresh in a few seconds. (" + err.message + ")", { status: 502 });
    }
  }
}

export default {
  async fetch(request, env) {
    try {
      // 產生實例 ID 並找到我們綁定的容器 Durable Object
      const id = env.TERMINAL.idFromName('default');
      const containerInstance = env.TERMINAL.get(id);

      // 這裡不需轉換網址，直接轉發給上方的 Terminal 類別處理即可
      return await containerInstance.fetch(request);
    } catch (err) {
      return new Response("Worker routing error: " + err.message, { status: 500 });
    }
  }
};