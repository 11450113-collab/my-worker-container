
export class Terminal {
	constructor(state, env) {
		this.state = state;
		this.env = env;
	}

	async fetch(request) {
		return new Response("Terminal OK");
	}
}

export default {
	async fetch(request, env, ctx) {
		// 取得 Terminal Durable Object 的 id
		const id = env.TERMINAL.idFromName("main");
		const stub = env.TERMINAL.get(id);
		// 將請求轉發給 Durable Object
		return await stub.fetch(request);
	}
};