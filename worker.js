import { DurableObject } from "cloudflare:workers";

// 定義與 Container 綁定的 Durable Object 類別 (必須與 wrangler.toml 中的 class_name 一致)
export class Terminal extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    // 當這個物件被喚醒時，啟動 Docker 容器
    this.ctx.blockConcurrencyWhile(async () => {
      await this.ctx.container.start();
    });
  }

  async fetch(request) {
    // 將請求轉發到容器內的 7860 Port (對應 Dockerfile)
    const port = this.ctx.container.getTcpPort(7860);
    return port.fetch(request);
  }
}

export default {
  async fetch(request, env) {
    try {
      // 產生一個預設的實例 ID，並轉發流量給我們上面定義的 Terminal 類別
      const id = env.TERMINAL.idFromName('default');
      const containerInstance = env.TERMINAL.get(id);
      return await containerInstance.fetch(request);
    } catch (err) {
      return new Response("Container loading error: " + err.message, { status: 500 });
    }
  }
};