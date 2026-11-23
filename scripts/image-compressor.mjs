import { startImageCompressor } from '../tools/image-compressor/server.mjs';

try {
  const app = await startImageCompressor();
  console.log(`\n图片压缩工作台 → ${app.url}`);
  console.log(`目标目录：${app.imageRoot}`);
  console.log('在浏览器打开上方地址。按 Ctrl+C 停止；正在处理的图片会先完成。\n');

  let stopping = false;
  const shutdown = async () => {
    if (stopping) return;
    stopping = true;
    await app.close();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} catch (error) {
  console.error(`图片工具启动失败：${error.message}`);
  process.exitCode = 1;
}
