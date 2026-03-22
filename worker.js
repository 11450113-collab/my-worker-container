import { DurableObject } from "cloudflare:workers";

// 必須匯出這個類別以滿足 Wrangler 的驗證。
// 留空即可，Cloudflare 會在底層自動將它與 Docker 容器連接。
export class Terminal extends DurableObject {
  // 不需撰寫任何程式碼
}

export default {
  async fetch(request, env) {
    try {
      // 產生實例 ID 並找到我們綁定的容器
      const id = env.TERMINAL.idFromName('default');
      const containerInstance = env.TERMINAL.get(id);

      // 【關鍵修復】在進入容器前，先將外部的 https 請求強制轉為 http
      const url = new URL(request.url);
      url.protocol = "http:";
      
      // 重新構造請求（保留原本的 method、headers 與 body）
      const modifiedRequest = new Request(url.toString(), request);

      // 將降級後的請求直接發送給容器實例
      return await containerInstance.fetch(modifiedRequest);
    } catch (err) {
      return new Response("Container loading error: " + err.message, { status: 500 });
    }
  }
};