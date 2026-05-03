import { Container } from "@cloudflare/containers";

export class Terminal extends Container {
    defaultPort = 7860;
}

export default {
    async fetch(request, env) {
        try {
            // 產生實例 ID 並找到我們綁定的容器 Durable Object
            const id = env.TERMINAL.idFromName("default");
            const containerInstance = env.TERMINAL.get(id);

            // 直接交給 Container 類別處理，讓它把請求送到 7860 port
            return await containerInstance.fetch(request);
        } catch (err) {
            return new Response("Worker routing error: " + err.message, { status: 500 });
        }
    },
};