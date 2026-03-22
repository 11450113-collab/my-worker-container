import { DurableObject } from "cloudflare:workers";

// 必須匯出這個類別，否則 Wrangler 編譯會失敗 (exit code 1)
export class Terminal extends DurableObject {
  async fetch(request) {
    // 獲取容器內部的 7860 端口
    const port = this.ctx.container.getTcpPort(7860);

    // 將外部進來的 https 請求強制轉為 http，因為 Cloudflare 到容器內部不支援 TLS
    const url = new URL(request.url);
    url.protocol = "http:";
    
    // 使用新的 HTTP URL 重新構造請求，保留原始的 headers 與 body
    const modifiedRequest = new Request(url.toString(), request);

    // 轉發給容器
    return port.fetch(modifiedRequest);
  }
}

export default {
  async fetch(request, env) {
    try {
      // 產生一個預設的實例 ID，找到我們在 wrangler.toml 綁定的 TERMINAL 容器
      const id = env.TERMINAL.idFromName('default');
      const containerInstance = env.TERMINAL.get(id);

      // 將外部請求轉發給上方的 Terminal 類別處理
      return await containerInstance.fetch(request);
    } catch (err) {
      return new Response("Container loading error: " + err.message, { status: 500 });
    }
  }
};
