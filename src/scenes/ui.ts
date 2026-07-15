import Phaser from 'phaser';

export type SoundToggle = {
  container: Phaser.GameObjects.Container;
  setEnabled: (enabled: boolean) => void;
};

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

export function addSoundToggle(
  scene: Phaser.Scene,
  x: number,
  y: number,
  enabled: boolean,
  onToggle: (enabled: boolean) => void,
): SoundToggle {
  const background = scene.add.graphics();
  const slash = scene.add.graphics();
  const note = scene.add
    .text(0, -1, '♪', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '34px',
      color: '#2e4057',
      fontStyle: '900',
    })
    .setOrigin(0.5);
  const hit = scene.add.zone(0, 0, 64, 58).setInteractive({ useHandCursor: true });
  const container = scene.add.container(x, y, [background, note, slash, hit]);
  let soundEnabled = enabled;

  const draw = () => {
    background.clear();
    background.fillStyle(0xffffff, 0.94);
    background.fillRoundedRect(-32, -29, 64, 58, 8);
    background.lineStyle(4, 0x2e4057, 0.16);
    background.strokeRoundedRect(-32, -29, 64, 58, 8);
    note.setAlpha(soundEnabled ? 1 : 0.42);
    slash.clear();
    if (!soundEnabled) {
      slash.lineStyle(5, 0xff6f91, 0.95);
      slash.lineBetween(-19, -19, 19, 19);
    }
  };

  hit.on('pointerdown', () => container.setScale(0.94));
  hit.on('pointerup', () => {
    container.setScale(1);
    soundEnabled = !soundEnabled;
    draw();
    onToggle(soundEnabled);
  });
  hit.on('pointerout', () => container.setScale(1));
  draw();

  return {
    container,
    setEnabled: (nextEnabled) => {
      soundEnabled = nextEnabled;
      draw();
    },
  };
}
