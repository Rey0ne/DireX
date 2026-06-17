FROM debian:bookworm-slim

# Blender 4.5 LTS 依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates libx11-6 libxext6 libxrender1 libxxf86vm1 \
    libxi6 libxfixes3 libgl1 libegl1 libgomp1 libtinfo6 && \
    rm -rf /var/lib/apt/lists/*

# 下载 Blender 4.5 LTS 并解压
RUN curl -SL https://download.blender.org/release/Blender4.5/blender-4.5.0-linux-x64.tar.xz -o /tmp/blender.tar.xz && \
    tar -xf /tmp/blender.tar.xz -C /opt && \
    rm /tmp/blender.tar.xz && \
    ln -s /opt/blender-*/blender /usr/local/bin/blender

# 安装 Rigify（已内置在 Blender 4.5 中）
# 创建工作目录
WORKDIR /workspace

# 验证安装
RUN blender --version

ENTRYPOINT ["blender", "--background"]
