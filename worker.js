// Cloudflare Worker 路由，將流量導向 Durable Object Terminal
export default {
	async fetch(request, env, ctx) {
		// 取得 Terminal Durable Object 的 id
		const id = env.Terminal.idFromName("default");
		const stub = env.Terminal.get(id);
		// 將請求轉發給容器 Durable Object
		return await stub.fetch(request);
	}
};