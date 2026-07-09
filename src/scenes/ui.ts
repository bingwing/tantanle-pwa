import Phaser from 'phaser';

export function addButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  onClick: () => void,
): Phaser.GameObjects.Container {
  const bg = scene.add.graphics();
  bg.fillStyle(0xffffff, 0.94);
  bg.fillRoundedRect(-width / 2, -height / 2, width, height, 22);
  bg.lineStyle(4, 0x2e4057, 0.16);
  bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 22);

  const text = scene.add
    .text(0, 0, label, {
      fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
      fontSize: '30px',
      color: '#2e4057',
      fontStyle: '900',
    })
    .setOrigin(0.5);

  const hit = scene.add.zone(0, 0, width, height).setInteractive({ useHandCursor: true });
  const container = scene.add.container(x, y, [bg, text, hit]);

  hit.on('pointerdown', () => {
    container.setScale(0.96);
  });
  hit.on('pointerup', () => {
    container.setScale(1);
    onClick();
  });
  hit.on('pointerout', () => {
    container.setScale(1);
  });

  return container;
}
