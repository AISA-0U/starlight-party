# 照片池

把原始照片放在这个目录，并在 `photos.source.json` 的 `photos` 数组中登记文件名：

```json
{
  "photos": ["photo-01.jpg", "photo-02.png", "旅行合照.webp"],
  "specialPhoto": "特别照片.jpg",
  "specialMessage": "这是看完所有回忆后，留给你的最后一颗星光。"
}
```

支持 JPEG、PNG、WebP、GIF 和 AVIF。由于浏览器不能自动读取文件夹目录，新增或移除照片时需要同步更新 `photos.source.json`。

更新源清单后，在项目根目录运行：

```powershell
.\.venv-tools\Scripts\python.exe -B tools\optimize_photos.py
```

脚本会生成：

```text
photos.json                 网页实际读取的清单
optimized/thumbs/*.webp    弹窗缩略图
optimized/full/*.webp      点击放大的清晰图
```

不要手工编辑 `photos.json`，因为下次运行优化脚本时会重新生成它。原始照片会保留，脚本不会删除源文件。

普通照片在一轮中不会重复出现。全部普通照片都看完后，再抽取一次会固定显示 `specialPhoto`。特别照片每次打开页面只出现一次，随后普通照片会开始新一轮随机抽取。将 `specialPhoto` 保持为空字符串即可禁用该功能。
