import Phaser from 'phaser';
import { APP_WIDTH } from '../game/config';
import { LEVELS } from '../game/levels';
import type { GameSave } from '../game/types';
import { addButton } from './ui';

const LEVEL_PAGE_SIZE = 9;
const CHAPTER_NAMES = ['甜甜岛', '彩虹岛'];

export class LevelScene extends Phaser.Scene {
  private currentPage = 0;
  private save!: GameSave;
  private pageContainer?: Phaser.GameObjects.Container;
  private chapterTitle?: Phaser.GameObjects.Text;
  private pageText?: Phaser.GameObjects.Text;
  private previousPageButton?: Phaser.GameObjects.Container;
  private nextPageButton?: Phaser.GameObjects.Container;

  constructor() {
    super('LevelScene');
  }

  create(): void {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0xeaf8ff, 0xeaf8ff, 0xfff5ca, 0xffffff, 1);
    bg.fillRect(0, 0, 900, 1200);

    this.add
      .text(APP_WIDTH / 2, 78, '甜甜关卡', {
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: '50px',
        color: '#2e4057',
        fontStyle: '900',
      })
      .setOrigin(0.5);
    this.chapterTitle = this.add
      .text(APP_WIDTH / 2, 148, '', {
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: '30px',
        color: '#ff6f91',
        fontStyle: '900',
        stroke: '#ffffff',
        strokeThickness: 5,
      })
      .setOrigin(0.5);

    this.save = this.registry.get('save') as GameSave;
    const totalPages = Math.ceil(LEVELS.length / LEVEL_PAGE_SIZE);
    this.currentPage = Phaser.Math.Clamp(Math.floor((this.save.lastUnlockedLevel - 1) / LEVEL_PAGE_SIZE), 0, totalPages - 1);
    this.previousPageButton = addButton(this, 300, 970, 92, 72, '‹', () => this.changePage(-1));
    this.nextPageButton = addButton(this, 600, 970, 92, 72, '›', () => this.changePage(1));
    this.pageText = this.add
      .text(APP_WIDTH / 2, 970, '', {
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: '24px',
        color: '#44627d',
        fontStyle: '900',
      })
      .setOrigin(0.5);
    addButton(this, APP_WIDTH / 2, 1080, 260, 70, '返回', () => this.scene.start('MenuScene'));
    this.renderPage();
  }

  private changePage(delta: number): void {
    const totalPages = Math.ceil(LEVELS.length / LEVEL_PAGE_SIZE);
    const nextPage = Phaser.Math.Clamp(this.currentPage + delta, 0, totalPages - 1);
    if (nextPage === this.currentPage) {
      return;
    }
    this.currentPage = nextPage;
    this.renderPage();
  }

  private renderPage(): void {
    this.pageContainer?.removeAll(true);
    this.pageContainer?.destroy();
    this.pageContainer = this.add.container(0, 0);
    const totalPages = Math.ceil(LEVELS.length / LEVEL_PAGE_SIZE);
    const start = this.currentPage * LEVEL_PAGE_SIZE;
    const pageLevels = LEVELS.slice(start, start + LEVEL_PAGE_SIZE);
    this.chapterTitle?.setText(CHAPTER_NAMES[this.currentPage] ?? `第 ${this.currentPage + 1} 章`);
    this.pageText?.setText(`${this.currentPage + 1} / ${totalPages}`);
    this.previousPageButton?.setAlpha(this.currentPage === 0 ? 0.32 : 1);
    this.nextPageButton?.setAlpha(this.currentPage === totalPages - 1 ? 0.32 : 1);

    for (const [index, level] of pageLevels.entries()) {
      const x = 160 + (index % 3) * 290;
      const y = 260 + Math.floor(index / 3) * 220;
      const progress = this.save.levels[level.id];
      const unlocked = progress?.unlocked ?? level.id === 1;
      const button = addButton(this, x, y, 190, 108, unlocked ? `${level.id}` : '锁', () => {
        if (unlocked) {
          this.scene.start('GameScene', { levelId: level.id });
        }
      });
      button.setAlpha(unlocked ? 1 : 0.45);
      const label = this.add
        .text(x, y + 78, unlocked ? `${'★'.repeat(progress?.stars ?? 0)}${'☆'.repeat(3 - (progress?.stars ?? 0))}` : '未解锁', {
          fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
          fontSize: '24px',
          color: '#44627d',
          fontStyle: '800',
        })
        .setOrigin(0.5);
      this.pageContainer.add([button, label]);
    }
  }
}
