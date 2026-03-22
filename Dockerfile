# 使用 Ubuntu 22.04 作為基底系統
FROM ubuntu:22.04

# 設定非互動模式，避免安裝過程卡住
ENV DEBIAN_FRONTEND=noninteractive

# 1. 安裝常用工具 (curl, git, vim 等)
# 2. 下載 ttyd (這是核心工具)
RUN apt-get update && apt-get install -y \
	curl \
	wget \
	git \
	vim \
	nano \
	sudo \
	net-tools \
	iputils-ping \
	&& rm -rf /var/lib/apt/lists/* \
	&& wget -O /usr/local/bin/ttyd https://github.com/tsl0922/ttyd/releases/download/1.7.7/ttyd.x86_64 \
	&& chmod +x /usr/local/bin/ttyd

# 建立一個名叫 'user' 的使用者，並給予 sudo 權限 (免密碼)
RUN useradd -m -s /bin/bash user && \
	echo "user ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/nopasswd

# 切換到該使用者
USER user
WORKDIR /home/user

# Hugging Face Spaces / Container 預設 Port
EXPOSE 7860

# 啟動 ttyd，建議加上帳密保護
# -c user:yourpassword 可自訂帳號密碼
CMD ["ttyd", "-W", "-p", "7860", "-c", "user:yourpassword", "bash"]