# WordLens 词镜 · 发布指南

本文档说明如何把 WordLens 发布到 GitHub 并上架 Obsidian 社区插件商店。

> 重要前提：本机沙箱无法替你执行 `git push`（需要你的 GitHub 凭证）。
> 第 2 步的命令请在**你自己电脑的终端**里跑（项目目录 `D:\wordlens`）。

---

## 第 0 步（已代填）：作者信息

本项目 `manifest.json` 的 `"author"` 已设为 GitHub 用户名 `TongFisher`（即你 `ssh -T git@github.com` 返回的账号）。发布前确认它和你的 GitHub 登录名一致即可，无需再改。若以后换号，直接改这一行并重新提交：

```bash
git add manifest.json
git commit -m "chore: set author"
```

---

## 第 1 步：在 GitHub 网页端创建仓库

1. 登录 https://github.com ，点右上角 **New repository**（或 `+` → New repository）。
2. Repository name 填 `wordlens`（建议与此一致）。
3. **不要**勾选 "Add a README file" / "Add .gitignore" / "Choose a license" —— 本地已经有了，勾了会冲突。
4. 其余默认（Public），点 **Create repository**。
5. 创建后页面会显示仓库地址，复制 **HTTPS** 那一行，形如：
   ```
   https://github.com/TongFisher/wordlens.git
   ```

---

## 第 2 步：本地连接并推送

在自己电脑的终端进入项目目录并执行（仓库地址已自动填好 `TongFisher/wordlens`）：

```bash
cd D:\wordlens
git remote add origin https://github.com/TongFisher/wordlens.git
git push -u origin main
```

### 认证方式（push 时要登录）

GitHub 早已不支持账号密码登录，二选一：

**方式 A：HTTPS + Personal Access Token（PAT，最简单）**
- GitHub → 右上角头像 → **Settings** → 左侧 **Developer settings**（最底部）
  → **Personal access tokens** → **Tokens (classic)** → **Generate new token (classic)**
- 勾选 `repo` 权限，其他默认，生成后**复制那串 token**（只显示一次）。
- 终端 push 时：用户名填你的 GitHub 用户名，密码**粘贴这串 token**（粘贴时屏幕不显示，正常）。

**方式 B：SSH（配一次永久免密，推荐长期使用）**
> 你已经在本机执行过 `ssh-keygen` 并成功通过 `ssh -T git@github.com` 认证，直接用此方式即可，无需 PAT。
- 本机生成密钥：`ssh-keygen -t ed25519 -C "TongFisher"`，一路回车。
- 把公钥内容（`cat ~/.ssh/id_ed25519.pub`）复制到 GitHub → Settings → **SSH and GPG keys** → New SSH key。
- 然后把远程地址换成 SSH 形式：
  ```bash
  git remote set-url origin git@github.com:TongFisher/wordlens.git
  git push -u origin main
  ```

---

## 第 3 步：打 Release（上架的前置条件）

Obsidian 社区商店依赖 GitHub Release 来分发 `main.js` / `manifest.json` / `styles.css`。

1. 打开你的仓库页面 → 右侧 **Releases** → **Draft a new release**。
2. **Choose a tag**：输入 `0.1.0`（必须与 `manifest.json` 里的 `version` 完全一致）。
3. **Release title**：`WordLens 词镜 v0.1.0`。
4. 描述随便写（README 内容即可）。
5. 页面会自动把仓库里的文件作为附件，确保包含 `main.js`、`manifest.json`、`styles.css` 三个文件。
6. 勾选 **Set as the latest release**，点 **Publish release**。

---

## 第 4 步：提交社区插件审核 PR（这一步才能在商店搜到）

1. 打开 https://github.com/obsidianmd/obsidian-releases
2. 点 **community-plugins.json** 文件 → 右上角铅笔图标 **Edit**。
3. 在 JSON 数组里**按 `id` 字母序**插入一条（不要破坏格式、末尾逗号）：

```json
{
  "id": "wordlens",
  "name": "WordLens 词镜",
  "author": "TongFisher",
  "description": "划词即译的 Obsidian 翻译与词典插件：悬停 / 划词翻译、一词多译、双向智能方向，支持有道智云、百度、腾讯云、阿里云、Bing、Google 七种翻译源。",
  "repo": "TongFisher/wordlens"
}
```

4. 拉到底填 commit 说明（如 `Add WordLens 词镜`），选 **Create a new branch for this commit**（默认即可）→ **Propose changes** → **Create pull request**。
5. 等 Obsidian 官方审核合并（通常几天到一两周）。合并后，**设置 → 第三方插件 → 浏览 → 搜索 "WordLens"** 即可安装。

---

## 审核通过前的安装方式（Beta）

不想等审核，自己或朋友想先用：

- **BRAT（推荐）**：在 Obsidian 装社区插件 **Beta Reviewer's Auto-update Tool**，添加你的仓库 `TongFisher/wordlens`，即可一键安装并自动更新。
- **手动安装**：下载仓库的 `main.js`、`manifest.json`、`styles.css` 三个文件，放进 `.obsidian/plugins/wordlens/` 目录，重启 Obsidian 后在第三方插件里启用。

---

## ⚠️ 注意事项

- **id 唯一性**：`wordlens` 作为插件 id 需全局唯一。提交 PR 时若官方提示冲突，需换一个（同时改 `manifest.json` 的 `id` 和本地文件夹名），然后重新打 Release + 改 PR 里的 `id`。
- **三引擎未实测**：百度 / 腾讯云 / 阿里云 的签名代码按官方文档实现，但未用真实 key 跑过。建议你开通后各选一个引擎试一下；若报错（腾讯常见 `AuthFailure.SignatureFailure`），把报错发回来我来修。
- **密钥安全**：仓库里**不含** `data.json`，用户的翻译源密钥都在各自本地，不会泄露。
