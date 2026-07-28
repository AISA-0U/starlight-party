# 星光派对

一个为手机屏幕设计的星星和彩带互动页面。网站运行时无第三方依赖；开发阶段使用 Pillow 生成轻量 WebP 照片。

## 本地运行

在项目目录执行：

```powershell
python -m http.server 8000
```

电脑访问 `http://localhost:8000`。手机和电脑连接同一 Wi-Fi 后，访问
`http://电脑的局域网IP:8000`。

直接双击 `index.html` 也能查看，但离线缓存功能需要通过 HTTP/HTTPS 访问。

## 添加照片

照片采用“原图 → 缩略图 + 放大图”的自动优化流程：

- `assets/photos/photos.source.json`：需要手工维护的源清单。
- `assets/photos/photos.json`：脚本自动生成的网页清单，不要手工编辑。
- `assets/photos/optimized/thumbs/`：弹窗使用的 640px WebP。
- `assets/photos/optimized/full/`：点击放大时使用的 1600px WebP。

### 第一次配置图片工具

在项目目录执行：

```powershell
python -m venv .venv-tools
.\.venv-tools\Scripts\python.exe -m pip install -r requirements-tools.txt
```

依赖只安装在 `.venv-tools` 中，不会污染系统 Python。

### 新增或替换照片

1. 将 JPEG、PNG、WebP、GIF 或 AVIF 原图放入 `assets/photos/`。
2. 编辑 `assets/photos/photos.source.json`，不要编辑生成的 `photos.json`。
3. 执行优化脚本：

```powershell
.\.venv-tools\Scripts\python.exe -B tools\optimize_photos.py
```

4. 启动本地服务器并检查效果：

```powershell
python -m http.server 8000
```

5. 确认无误后提交并推送，GitHub Pages 会自动更新：

```powershell
git add .
git commit -m "Optimize website photos"
git push
```

源清单示例：

示例：

```json
{
  "photos": ["photo-01.jpg", "photo-02.png", "旅行合照.webp"],
  "specialPhoto": "特别照片.jpg",
  "specialMessage": "这是看完所有回忆后，留给你的最后一颗星光。"
}
```

`messages` 数组用于配置照片下方随机出现的文案。浏览器出于安全限制不能直接枚举本地文件夹，因此照片文件和清单需要保持同步。

普通照片在一轮浏览中不会重复。全部普通照片看完后，下一次抽取会显示 `specialPhoto`；特别照片在本次页面会话中只出现一次，之后普通照片会开启新一轮。

优化脚本默认参数：

```text
缩略图：最长边 640px，WebP 质量 76
放大图：最长边 1600px，WebP 质量 82
```

如需调整，可传入参数：

```powershell
.\.venv-tools\Scripts\python.exe -B tools\optimize_photos.py `
  --thumb-size 720 `
  --full-size 1920 `
  --thumb-quality 78 `
  --full-quality 84
```

生成文件带有内容指纹。替换原图后重新执行脚本，文件 URL 会自动变化，从而绕过浏览器和 Service Worker 的旧图片缓存。

## 图片加载策略

1. 点击抽取时立即确定下一张照片并开始下载缩略图。
2. 转盘动画和图片请求同时进行，而不是动画结束后才请求。
3. 弹窗只下载约 20–110 KB 的缩略图。
4. 点击放大时立即显示已有缩略图，高清图加载完成后无闪烁替换。
5. 已访问图片由 Service Worker 缓存，后续查看可离线命中。

当前 18 张原图合计约 18.42 MB；生成的全部缩略图约 1.18 MB，单张特别照片缩略图由 3.37 MB 降至约 31 KB。

## 彩蛋流程

- 第一层：打开分层礼物卡片。
- 第二层：点击按钮启动转盘，并轮播抽取文案。
- 第三层：展示随机照片，可继续抽取或真实关闭。
- 右上角关闭和背景点击前两次会触发假关闭提示；第三次会关闭。按 `Esc` 始终立即关闭。
