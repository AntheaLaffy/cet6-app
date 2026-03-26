# CET6 App

一个面向英语六级备考的跨平台应用（当前重点是移动端）。  
它不是“题库浏览器”，而是完整的学习工作台：词汇、专项、真题、错题与听力补全一体化。

> [!WARNING]
> 当前版本为测试版（Beta）。如果你在使用中遇到问题、异常或体验不佳的地方，欢迎提交 Issue 或反馈，我们会持续改进。

## 功能亮点

- 词汇复习与掌握度记录
- 专项资料阅读（支持 Markdown 渲染）
- 真题按场次/套卷浏览
- 听力资源补全（本地导入 + 手动匹配）
- 移动端分页交互与底部导航

## 技术栈

- React 18 + TypeScript + Vite
- Tauri 2（Android 打包）
- Rust（Tauri Runtime）

## 3 分钟跑起来

```bash
npm install
npm run dev
```

浏览器打开 `http://localhost:5173`。

## 必要数据文件

根目录需要有这些数据源，否则构建会失败：

- `CET6_1.json`
- `CET6_2.json`
- `CET6_3.json`
- `CET6luan_1.json`
- `CET6-Resources/`

`npm run build` 会自动执行内容生成脚本，把结构化内容输出到前端资源目录。

## 资源来源与致谢

本项目使用的六级资料原始来源：

- [YinsinSirius/CET6-Resources](https://github.com/YinsinSirius/CET6-Resources)
- [kajweb/dict](https://github.com/kajweb/dict)（JSON 词典数据）

当前仓库通过 `CET6-Resources` 目录（可作为子模块）读取并生成可运行内容。
如果你发布或二次分发本项目，请同时遵守上游仓库的许可证与资源使用约束。

## 常用命令

```bash
npm run dev
npm run typecheck
npm run build
npm run preview
npm run tauri:android:init
npm run tauri:android:build -- --apk --target aarch64 --split-per-abi
```

## Android 打包（推荐路径）

1. 确保项目路径是纯英文（非常重要）
2. 安装 Android Studio，并配置好 SDK / NDK
3. 在 Windows 终端设置环境变量后执行打包

示例（cmd）：

```cmd
set ANDROID_HOME=C:\Users\%USERNAME%\AppData\Local\Android\Sdk
set ANDROID_SDK_ROOT=%ANDROID_HOME%
set NDK_HOME=%ANDROID_HOME%\ndk\27.3.13750724
set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
npm.cmd run tauri:android:build -- --apk --target aarch64 --split-per-abi
```

`aarch64` 对应 Android 的 `arm64-v8a`，适用于大多数现代手机（含多数 vivo 机型）。

## APK 签名（可安装到真机）

生成 keystore（只做一次）：

```cmd
"C:\Program Files\Java\jdk-25.0.2\bin\keytool.exe" -genkeypair -v -keystore "%CD%\android-release.keystore" -storetype PKCS12 -keyalg RSA -keysize 2048 -validity 10000 -alias cet6release
```

签名：

```cmd
set BUILD_TOOLS=%ANDROID_HOME%\build-tools\36.1.0
set APK_IN=%CD%\src-tauri\gen\android\app\build\outputs\apk\arm64\release\app-arm64-release-unsigned.apk
set APK_ALIGNED=%CD%\app-arm64-release-aligned.apk
set APK_SIGNED=%CD%\app-arm64-release-signed.apk
"%BUILD_TOOLS%\zipalign.exe" -p -f 4 "%APK_IN%" "%APK_ALIGNED%"
"%BUILD_TOOLS%\apksigner.bat" sign --ks "%CD%\android-release.keystore" --ks-key-alias cet6release --out "%APK_SIGNED%" "%APK_ALIGNED%"
"%BUILD_TOOLS%\apksigner.bat" verify --print-certs "%APK_SIGNED%"
```

## Release 说明

当前推荐发布的 Android 包：

- `app-arm64-release-signed.apk`：已签名，可直接安装到 ARM64（`arm64-v8a`）手机

本地打包目录（默认）：

- `src-tauri/gen/android/app/build/outputs/apk/arm64/release/`

根目录常见文件说明：

- `app-arm64-release-unsigned.apk`：未签名，不能直接安装
- `app-arm64-release-aligned.apk`：仅对齐，未签名
- `app-arm64-release-signed.apk`：最终安装包
- `app-arm64-release-signed.apk.idsig`：签名附属文件，不是安装包
- `app-universal-release-unsigned.apk`：多架构未签名包，通常体积很大，不建议日常分发

安装建议：

1. 分发时只提供 `app-arm64-release-signed.apk`
2. 若手机提示“签名不一致”，先卸载旧版本再安装
3. 若仅做个人测试，优先使用 `arm64` 单架构包，避免 universal 包体积过大

## 常见问题

- 打包报 `non-ASCII path`：项目目录含中文，迁移到纯英文目录。
- APK 太大：资源文件本身很大，尽量打 `aarch64` 单架构，避免 universal 包。
- 手机安装失败：通常是未签名或签名不一致；先签名，必要时先卸载旧版本再装。

## 目录结构

```text
apps/web            前端应用
packages/           领域模型、内容、存储、UI 组件
scripts/            内容生成脚本
src-tauri/          Tauri 壳与 Android 工程
CET6-Resources/     原始资料与真题资源
```

## Git 与发布建议

- `dist/`、`apps/web/public/generated/`、`apps/web/public/content-assets/` 都是构建产物，不建议提交。
- `android-release.keystore` 是私钥文件，绝对不要上传到公共仓库。
- `CET6-Resources` 如作为子模块维护，克隆后记得执行：

```bash
git submodule update --init --recursive
```

## License

项目包含 `LICENSE`。发布公开版本前，请再次确认第三方资料与真题资源的版权范围。
