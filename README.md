# 弹弹乐 PWA

原创儿童弹弓物理破坏游戏。玩法借鉴弹弓物理破坏品类的手感：拖拽糖果球、抛物线发射、撞倒积木、打飞糖果罐过关。项目不使用任何 Angry Birds 角色、美术、名称或关卡。

单个糖果球连续命中 4 次会触发“糖果狂热”，每关首次触发可获得 1 个额外糖果球和奖励分数。

糖果球飞行时，右下角会出现一次性技能按钮：普通球冲刺、重球下坠、弹力球跃起、爆爆球空中引爆。

当前包含 20 个关卡，分为“甜甜岛”“彩虹岛”“宝藏岛”三个章节。第 11–15 关加入双向彩虹传送门；第 16–20 关加入需要连续命中三次、逐步裂开并喷出奖励的糖果宝箱。

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
