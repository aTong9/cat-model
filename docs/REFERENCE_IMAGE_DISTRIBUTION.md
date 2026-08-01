# Liberty Cats 参考图分发策略

生成器运行时只加载当前可见的 NFT 原图。9,901 张本地图片位于 `public/liberty_cats_download/images/`，会进入 Web 生产包，但不进入角色 GLB。

## 配置模式

通过构建环境变量 `VITE_REFERENCE_IMAGE_MODE` 选择：

- `remote`：仅使用 metadata 中的远程地址。生产 Web 默认值。
- `hybrid`：远程优先，失败后读取本地目录。开发环境默认值。
- `local`：仅读取宿主提供的本地资源。离线 WebView 使用。

本地资源根地址通过 `VITE_REFERENCE_IMAGE_BASE_URL` 指定，目录内文件名必须保持 `{tokenId}.{extension}`。

## 推荐部署

- 公网 Web / GitHub Pages：使用 `local`，从构建结果的 `liberty_cats_download/images/` 读取。
- 本地开发：默认使用 `local`，路径由 Vite `BASE_URL` 自动适配。
- 离线 WebView：宿主应用单独打包图片目录，设置 `local` 和宿主可访问的资源根地址。

图片授权、缓存期限和 CDN 再分发权限目前不确定，公开部署前必须单独确认。
