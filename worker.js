export default {
  async fetch(request, env) {
    try {
      // 透過 TERMINAL 綁定，找到名為 'default' 的容器實例並轉發請求
      const id = env.TERMINAL.idFromName('default');
      const container = env.TERMINAL.get(id);
      return await container.fetch(request);
    } catch (err) {
      return new Response("Container loading error: " + err.message, { status: 500 });
    }
  }
};
