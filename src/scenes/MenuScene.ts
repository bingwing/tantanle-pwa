import Phaser from 'phaser';
import type { CandyAudio } from '../game/audio';
import { APP_HEIGHT, APP_WIDTH } from '../game/config';
import { updateSoundPreference, writeSave } from '../game/save';
import type { GameSave } from '../game/types';
import { addButton, addSoundToggle } from './ui';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create(): void {
    this.addBackground();
    this.addSoundControl();
    this.add
      .text(APP_WIDTH / 2, 168, '弹弹乐', {
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: '88px',
        color: '#2e4057',
        fontStyle: '900',
        stroke: '#ffcf4d',
        strokeThickness: 10,
      })
      .setOrigin(0.5);
    this.add
      .text(APP_WIDTH / 2, 260, '拉动糖果弹弓，打倒甜甜堡垒', {
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: '30px',
        color: '#44627d',
        fontStyle: '800',
      })
      .setOrigin(0.5);

    this.add.image(210, 600, 'candy-ball').setScale(1.45);
    this.add.image(710, 610, 'target-jar').setScale(1.25);
    this.drawSampleTower();
    addButton(this, APP_WIDTH / 2, APP_HEIGHT - 180, 360, 84, '开始游戏', () => this.scene.start('LevelScene'));
  }

  private addSoundControl(): void {
    const save = this.registry.get('save') as GameSave;
    const audio = this.registry.get('audio') as CandyAudio | undefined;
    addSoundToggle(this, 820, 60, save.soundEnabled, (enabled) => {
      const updatedSave = updateSoundPreference(this.registry.get('save') as GameSave, enabled);
      this.registry.set('save', updatedSave);
      writeSave(window.localStorage, updatedSave);
      audio?.setEnabled(enabled);
      if (enabled) {
        audio?.play('combo');
      }
    });
  }

  private addBackground(): void {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x8ed8ff, 0xb8ecff, 0xfff0b5, 0xfef8df, 1);
    bg.fillRect(0, 0, APP_WIDTH, APP_HEIGHT);
    bg.fillStyle(0xffffff, 0.28);
    for (let i = 0; i < 9; i += 1) {
      bg.fillCircle(80 + i * 96, 110 + (i % 3) * 96, 26 + (i % 2) * 16);
    }
    bg.fillStyle(0xffcf4d, 0.22);
    bg.fillCircle(755, 290, 90);
  }

  private drawSampleTower(): void {
    const colors = [0xd99545, 0x87e8ff, 0x7fe3a1];
    for (let i = 0; i < 3; i += 1) {
      const g = this.add.graphics();
      g.fillStyle(colors[i], 1);
      g.fillRoundedRect(535 - i * 18, 722 - i * 78, 240 - i * 28, 34, 10);
      g.fillRoundedRect(558 - i * 15, 610 - i * 78, 32, 120, 10);
      g.fillRoundedRect(730 - i * 15, 610 - i * 78, 32, 120, 10);
      g.lineStyle(5, 0x2e4057, 0.14);
      g.strokeRoundedRect(535 - i * 18, 722 - i * 78, 240 - i * 28, 34, 10);
    }
  }
}
