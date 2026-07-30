# 词迹

词迹是一款为 iPhone 优先设计、可安装并离线使用的个人背单词 PWA。

主要功能包括 CEFR 分级词库、认识与拼写复习、自定义学习目标、语境练习，以及每天一篇可点词查义的英文新闻或名著分级阅读。

## 本地运行

```powershell
pnpm install
pnpm dev
```

打开 `http://localhost:3000`。

## 验证

```powershell
pnpm test
pnpm typecheck
pnpm build
```

## 数据

学习数据仅保存在当前浏览器的 `localStorage` 中，不上传服务器。清除 Safari 网站数据会删除本地词库。
