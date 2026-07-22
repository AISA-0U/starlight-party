# 照片池

把照片放在这个目录，并在 `photos.json` 的 `photos` 数组中登记文件名：

```json
{
  "photos": ["photo-01.jpg", "photo-02.png", "旅行合照.webp"]
}
```

支持浏览器可显示的常见格式，例如 JPEG、PNG、WebP、GIF 和 AVIF。由于这是纯静态网页，浏览器不能自动读取文件夹目录，因此新增或移除照片时需要同步更新 `photos.json`。
