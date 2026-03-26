# CET6 App

一个面向英语六级备考的跨平台学习应用，当前以移动端体验为核心，支持：

- 词汇复习与掌握度记录
- 专项资料阅读
- 近年真题浏览与听力补全
- 本地音频导入与手动匹配
- Tauri Android 打包

## 技术栈

- React 18
- TypeScript
- Vite
- Tauri 2
- Rust

## 当前状态

这个仓库已经可以完成以下链路：

- Web / PWA 本地开发
- 内容数据生成
- Tauri Android 工程初始化
- Android APK 构建准备

如果你要直接发布到 GitHub，这个仓库已经适合作为主仓库继续维护。

## 快速开始

先安装依赖：

```bash
npm install
```

本地开发：

```bash
npm run dev
```

类型检查：

```bash
npm run typecheck
```

前端构建：

```bash
npm run build
```

## Tauri Android

初始化 Android 工程：

```bash
npm run tauri:android:init
```

构建 APK：

```bash
npm run tauri:android:build -- --apk
```

Windows 上打 Android 包时，建议注意这几个点：

- 项目路径尽量使用纯英文路径
- 开启 Windows 开发者模式，避免符号链接失败
- `JAVA_HOME` 优先指向 Android Studio 自带的 JBR
- 确保 `ANDROID_HOME`、`ANDROID_SDK_ROOT`、`NDK_HOME` 已设置

## 数据依赖

仓库根目录下需要这些内容源：

- `CET6_1.json`
- `CET6_2.json`
- `CET6_3.json`
- `CET6luan_1.json`
- `CET6-Resources/`

其中 `scripts/generate-content.mjs` 会读取这些资源，并生成：

- `apps/web/public/generated/`
- `apps/web/public/content-assets/`

这两个目录属于构建产物，不建议提交到 Git。

如果你选择把 `CET6-Resources/` 保持为独立仓库或子模块，克隆后记得补齐资源，否则 `npm run build` 会失败。

## 常用脚本

```bash
npm run dev
npm run build
npm run preview
npm run typecheck
npm run tauri:android:init
npm run tauri:android:build -- --apk
```

## 目录结构

```text
apps/web            前端应用
packages/           领域模型、内容、存储、UI 组件
scripts/            内容生成脚本
src-tauri/          Tauri 壳与 Android 工程
CET6-Resources/     原始资料与真题资源
```

## 发布前建议

在推到 GitHub 之前，建议你确认两件事：

1. `CET6-Resources/` 是要作为主仓库内容直接提交，还是作为独立仓库/子模块保留。
2. 是否要公开所有原始真题与音频资源；如果有版权顾虑，建议只保留结构化代码与脚本，不直接公开原始素材。

## License

仓库当前包含 `LICENSE` 文件。发布前请再确认其中是否覆盖了你要公开的代码与资源范围，尤其是第三方资料与原始真题资源。
