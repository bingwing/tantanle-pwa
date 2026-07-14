# 弹弹乐 PWA

原创儿童弹弓物理破坏游戏。玩法借鉴弹弓物理破坏品类的手感：拖拽糖果球、抛物线发射、撞倒积木、打飞糖果罐过关。项目不使用任何 Angry Birds 角色、美术、名称或关卡。

单个糖果球连续命中 4 次会触发“糖果狂热”，每关首次触发可获得 1 个额外糖果球和奖励分数。

## 本地运行

```bash
npm install
npm run dev
```

## 验证

```bash
npm test
npm run build
```

## 部署

项目已配置 GitHub Pages + GitHub Actions。仓库开启 Pages，并将 Source 设置为 GitHub Actions 后，push 到 `master` 或 `main` 会自动发布 `dist/`。

## 隐私

纯本地 PWA。没有广告、账号、内购、排行榜、统计埋点或后端接口。进度保存在浏览器 localStorage，key 为 `tantanle-save-v1`。
