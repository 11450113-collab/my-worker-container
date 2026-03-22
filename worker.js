export default {
  async fetch(request, env) {
    try {
      // 產生一個預設的實例 ID，找到我們在 wrangler.toml 綁定的 TERMINAL 容器
      const id = env.TERMINAL.idFromName('default');
      const containerInstance = env.TERMINAL.get(id);

      // 【關鍵修復】將外部進來的 https 請求強制轉為 http，因為 Cloudflare 到容器的內部連線不需要也不支援 TLS
      const url = new URL(request.url);
      url.protocol = "http:";
      
      // 使用新的 HTTP URL 重新構造請求，保留原始的 headers 與 body
      const modifiedRequest = new Request(url.toString(), request);

      // 將請求轉發給容器
      return await containerInstance.fetch(modifiedRequest);
    } catch (err) {
      return new Response("Container loading error: " + err.message, { status: 500 });
    }
  }
};