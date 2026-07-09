import Phaser from 'phaser';
import { APP_WIDTH } from '../game/config';
import { LEVELS } from '../game/levels';
import type { GameSave } from '../game/types';
import { addButton } from './ui';

export class LevelScene extends Phaser.Scene {
  constructor() {
    super('LevelScene');
  }

  create(): void {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0xeaf8ff, 0xeaf8ff, 0xfff5ca, 0xffffff, 1);
    bg.fillRect(0, 0, 900, 1200);

    this.add
      .text(APP_WIDTH / 2, 92, '甜甜关卡', {
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: '54px',
        color: '#2e4057',
        fontStyle: '900',
      })
      .setOrigin(0.5);

    const save = this.registry.get('save') as GameSave;
    for (const level of LEVELS) {
      const index = level.id - 1;
      const x = 160 + (index % 3) * 290;
      const y = 220 + Math.floor(index / 3) * 180;
      const progress = save.levels[level.id];
      const unlocked = progress?.unlocked ?? level.id === 1;
      const button = addButton(this, x, y, 190, 110, unlocked ? `${level.id}` : '锁', () => {
        if (unlocked) {
          this.scene.start('GameScene', { levelId: level.id });
        }
      });
      button.setAlpha(unlocked ? 1 : 0.45);
      this.add
        .text(x, y + 82, unlocked ? `${'★'.repeat(progress?.stars ?? 0)}${'☆'.repeat(3 - (progress?.stars ?? 0))}` : '未解锁', {
          fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
          fontSize: '24px',
          color: '#44627d',
          fontStyle: '800',
        })
        .setOrigin(0.5);
    }

    addButton(this, APP_WIDTH / 2, 1080, 260, 70, '返回', () => this.scene.start('MenuScene'));
  }
}
