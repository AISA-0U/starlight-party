# 照片池

把照片放在这个目录，并在 `photos.json` 的 `photos` 数组中登记文件名：

```json
{
  "photos": ["photo-01.jpg", "photo-02.png", "旅行合照.webp"],
  "specialPhoto": "特别照片.jpg",
  "specialMessage": "这是看完所有回忆后，留给你的最后一颗星光。"
}
```

支持浏览器可显示的常见格式，例如 JPEG、PNG、WebP、GIF 和 AVIF。由于这是纯静态网页，浏览器不能自动读取文件夹目录，因此新增或移除照片时需要同步更新 `photos.json`。

普通照片在一轮中不会重复出现。全部普通照片都看完后，再抽取一次会固定显示 `specialPhoto`。特别照片每次打开页面只出现一次，随后普通照片会开始新一轮随机抽取。将 `specialPhoto` 保持为空字符串即可禁用该功能。
