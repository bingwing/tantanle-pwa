import type { BlockDefinition, LevelDefinition } from './types';

const wood = 'wood';
const glass = 'glass';
const stone = 'stone';
const jelly = 'jelly';

function tower(x: number, floorY: number, materials: Array<BlockDefinition['material']>): BlockDefinition[] {
  return materials.flatMap((material, index) => {
    const y = floorY - index * 72;
    return [
      { id: `${x}-${index}-left`, x: x - 54, y, width: 28, height: 112, material },
      { id: `${x}-${index}-right`, x: x + 54, y, width: 28, height: 112, material },
      { id: `${x}-${index}-cap`, x, y: y - 58, width: 150, height: 28, material },
    ];
  });
}

export const LEVELS: LevelDefinition[] = [
  {
    id: 1,
    name: '糖果木塔',
    shots: 5,
    starScores: [1600, 2600, 3600],
    targets: [{ id: 'jar-1', x: 735, y: 660 }],
    collectibles: [{ id: 'star-1', x: 620, y: 720, kind: 'star' }],
    blocks: [...tower(735, 760, [wood]), { id: 'base-1', x: 735, y: 842, width: 190, height: 28, material: wood }],
  },
  {
    id: 2,
    name: '糖霜爆爆',
    shots: 5,
    starScores: [1800, 3000, 4300],
    targets: [{ id: 'jar-1', x: 760, y: 590 }],
    collectibles: [{ id: 'star-1', x: 625, y: 745, kind: 'star' }],
    hazards: [{ id: 'bomb-1', x: 700, y: 735, kind: 'frosting-bomb' }],
    blocks: [
      ...tower(760, 760, [jelly]),
      { id: 'ramp-1', x: 660, y: 820, width: 210, height: 26, angle: -14, material: wood },
    ],
  },
  {
    id: 3,
    name: '弹力饼干',
    shots: 5,
    starScores: [2200, 3600, 5200],
    targets: [{ id: 'jar-1', x: 740, y: 520 }],
    collectibles: [{ id: 'star-1', x: 650, y: 640, kind: 'star' }],
    bumpers: [{ id: 'bumper-1', x: 570, y: 810, angle: -16, kind: 'bounce-pad' }],
    blocks: tower(740, 760, [glass, wood]),
  },
  {
    id: 4,
    name: '双塔甜心',
    shots: 6,
    starScores: [2200, 3600, 5000],
    targets: [
      { id: 'jar-1', x: 670, y: 665 },
      { id: 'jar-2', x: 820, y: 665 },
    ],
    hazards: [{ id: 'bomb-1', x: 745, y: 710, kind: 'frosting-bomb' }],
    blocks: [...tower(670, 765, [wood]), ...tower(820, 765, [wood])],
  },
  {
    id: 5,
    name: '石头护栏',
    shots: 6,
    starScores: [2400, 3900, 5400],
    targets: [{ id: 'jar-1', x: 790, y: 590 }],
    blocks: [
      ...tower(790, 760, [wood, glass]),
      { id: 'stone-rail', x: 700, y: 770, width: 34, height: 170, material: stone },
    ],
  },
  {
    id: 6,
    name: '彩糖桥',
    shots: 6,
    starScores: [2850, 4500, 6200],
    targets: [
      { id: 'jar-1', x: 675, y: 575 },
      { id: 'jar-2', x: 810, y: 575 },
    ],
    bumpers: [
      { id: 'bumper-1', x: 575, y: 820, angle: -20, kind: 'bounce-pad' },
      { id: 'bumper-2', x: 860, y: 810, angle: 18, kind: 'bounce-pad' },
    ],
    blocks: [
      ...tower(675, 760, [glass]),
      ...tower(810, 760, [jelly]),
      { id: 'bridge', x: 742, y: 590, width: 190, height: 26, material: wood },
    ],
  },
  {
    id: 7,
    name: '奶油高塔',
    shots: 7,
    starScores: [3000, 4800, 6500],
    targets: [{ id: 'jar-1', x: 760, y: 450 }],
    blocks: tower(760, 790, [wood, glass, jelly]),
  },
  {
    id: 8,
    name: '星星堡垒',
    shots: 7,
    starScores: [3300, 5200, 7000],
    targets: [
      { id: 'jar-1', x: 650, y: 610 },
      { id: 'jar-2', x: 825, y: 540 },
    ],
    blocks: [...tower(650, 780, [stone]), ...tower(825, 760, [glass, wood])],
  },
  {
    id: 9,
    name: '软糖迷宫',
    shots: 7,
    starScores: [3500, 5600, 7600],
    targets: [
      { id: 'jar-1', x: 720, y: 505 },
      { id: 'jar-2', x: 830, y: 690 },
    ],
    blocks: [
      ...tower(720, 760, [jelly, jelly]),
      { id: 'wall', x: 835, y: 760, width: 32, height: 180, material: wood },
      { id: 'shelf', x: 790, y: 625, width: 150, height: 24, angle: 12, material: glass },
    ],
  },
  {
    id: 10,
    name: '糖果城堡',
    shots: 8,
    starScores: [4200, 6500, 8800],
    targets: [
      { id: 'jar-1', x: 640, y: 640 },
      { id: 'jar-2', x: 765, y: 520 },
      { id: 'jar-3', x: 850, y: 680 },
    ],
    blocks: [...tower(640, 790, [wood, glass]), ...tower(790, 790, [stone, jelly]), ...tower(850, 760, [glass])],
  },
  {
    id: 11,
    name: '彩虹捷径',
    shots: 6,
    starScores: [3000, 4700, 6500],
    targets: [{ id: 'jar-1', x: 810, y: 620 }],
    collectibles: [{ id: 'star-1', x: 585, y: 690, kind: 'star' }],
    portals: [
      {
        id: 'rainbow-1',
        kind: 'rainbow-portal',
        entry: { x: 500, y: 820, angle: -15 },
        exit: { x: 655, y: 610, angle: 8 },
      },
    ],
    blocks: [...tower(810, 780, [glass, wood]), { id: 'base-1', x: 810, y: 850, width: 176, height: 26, material: jelly }],
  },
  {
    id: 12,
    name: '彩虹爆爆',
    shots: 6,
    starScores: [3300, 5200, 7100],
    targets: [{ id: 'jar-1', x: 790, y: 520 }],
    hazards: [{ id: 'bomb-1', x: 735, y: 665, kind: 'frosting-bomb' }],
    portals: [
      {
        id: 'rainbow-1',
        kind: 'rainbow-portal',
        entry: { x: 480, y: 815, angle: -20 },
        exit: { x: 645, y: 720, angle: -48 },
      },
    ],
    blocks: [...tower(790, 770, [jelly, glass]), { id: 'ramp-1', x: 650, y: 825, width: 190, height: 26, angle: -12, material: wood }],
  },
  {
    id: 13,
    name: '彩虹弹跳',
    shots: 7,
    starScores: [3600, 5600, 7600],
    targets: [{ id: 'jar-1', x: 780, y: 480 }],
    collectibles: [{ id: 'star-1', x: 620, y: 590, kind: 'star' }],
    bumpers: [{ id: 'bumper-1', x: 780, y: 825, angle: -16, kind: 'bounce-pad' }],
    portals: [
      {
        id: 'rainbow-1',
        kind: 'rainbow-portal',
        entry: { x: 490, y: 825, angle: -18 },
        exit: { x: 650, y: 690, angle: 24 },
      },
    ],
    blocks: tower(780, 790, [wood, glass, jelly]),
  },
  {
    id: 14,
    name: '双门甜心',
    shots: 8,
    starScores: [4100, 6300, 8500],
    targets: [
      { id: 'jar-1', x: 675, y: 610 },
      { id: 'jar-2', x: 825, y: 545 },
    ],
    hazards: [{ id: 'bomb-1', x: 750, y: 705, kind: 'frosting-bomb' }],
    portals: [
      {
        id: 'rainbow-1',
        kind: 'rainbow-portal',
        entry: { x: 455, y: 810, angle: -12 },
        exit: { x: 610, y: 540, angle: 18 },
      },
    ],
    blocks: [...tower(675, 785, [glass, wood]), ...tower(825, 770, [jelly, glass])],
  },
  {
    id: 15,
    name: '彩虹嘉年华',
    shots: 9,
    starScores: [5000, 7600, 10200],
    targets: [
      { id: 'jar-1', x: 640, y: 650 },
      { id: 'jar-2', x: 760, y: 510 },
      { id: 'jar-3', x: 850, y: 655 },
    ],
    collectibles: [{ id: 'star-1', x: 575, y: 610, kind: 'star' }],
    hazards: [{ id: 'bomb-1', x: 760, y: 700, kind: 'frosting-bomb' }],
    bumpers: [{ id: 'bumper-1', x: 855, y: 830, angle: 18, kind: 'bounce-pad' }],
    portals: [
      {
        id: 'rainbow-1',
        kind: 'rainbow-portal',
        entry: { x: 480, y: 820, angle: -18 },
        exit: { x: 655, y: 455, angle: 24 },
      },
    ],
    blocks: [...tower(640, 790, [wood, glass]), ...tower(760, 780, [jelly, stone]), ...tower(850, 780, [glass])],
  },
  {
    id: 16,
    name: '宝箱初遇',
    shots: 8,
    starScores: [3600, 5600, 7600],
    targets: [{ id: 'chest-1', x: 760, y: 650, kind: 'treasure-chest', durability: 3 }],
    collectibles: [{ id: 'star-1', x: 600, y: 690, kind: 'star' }],
    hazards: [{ id: 'bomb-1', x: 670, y: 745, kind: 'frosting-bomb' }],
    blocks: [...tower(760, 780, [wood]), { id: 'base-1', x: 760, y: 850, width: 210, height: 28, material: jelly }],
  },
  {
    id: 17,
    name: '爆爆宝藏',
    shots: 9,
    starScores: [4300, 6500, 8700],
    targets: [
      { id: 'jar-1', x: 650, y: 665 },
      { id: 'chest-1', x: 805, y: 625, kind: 'treasure-chest', durability: 3 },
    ],
    hazards: [{ id: 'bomb-1', x: 730, y: 735, kind: 'frosting-bomb' }],
    blocks: [...tower(650, 785, [glass]), ...tower(805, 780, [jelly])],
  },
  {
    id: 18,
    name: '弹跳宝库',
    shots: 9,
    starScores: [4700, 7100, 9500],
    targets: [
      { id: 'jar-1', x: 655, y: 670 },
      { id: 'chest-1', x: 805, y: 600, kind: 'treasure-chest', durability: 3 },
    ],
    collectibles: [{ id: 'star-1', x: 590, y: 590, kind: 'star' }],
    bumpers: [{ id: 'bumper-1', x: 555, y: 825, angle: -18, kind: 'bounce-pad' }],
    blocks: [...tower(655, 790, [wood]), ...tower(805, 790, [glass, jelly])],
  },
  {
    id: 19,
    name: '彩虹宝藏',
    shots: 10,
    starScores: [5200, 7900, 10600],
    targets: [
      { id: 'jar-1', x: 690, y: 650 },
      { id: 'chest-1', x: 820, y: 565, kind: 'treasure-chest', durability: 3 },
    ],
    hazards: [{ id: 'bomb-1', x: 755, y: 710, kind: 'frosting-bomb' }],
    portals: [
      {
        id: 'rainbow-1',
        kind: 'rainbow-portal',
        entry: { x: 480, y: 820, angle: -18 },
        exit: { x: 635, y: 605, angle: -18 },
      },
    ],
    blocks: [...tower(690, 785, [jelly]), ...tower(820, 785, [wood, glass])],
  },
  {
    id: 20,
    name: '糖果金库',
    shots: 12,
    starScores: [6500, 9800, 13100],
    targets: [
      { id: 'chest-1', x: 640, y: 640, kind: 'treasure-chest', durability: 3 },
      { id: 'jar-1', x: 770, y: 540 },
      { id: 'jar-2', x: 850, y: 665 },
    ],
    collectibles: [{ id: 'star-1', x: 575, y: 560, kind: 'star' }],
    hazards: [
      { id: 'bomb-1', x: 710, y: 730, kind: 'frosting-bomb' },
      { id: 'bomb-2', x: 810, y: 735, kind: 'frosting-bomb' },
    ],
    bumpers: [{ id: 'bumper-1', x: 560, y: 830, angle: -18, kind: 'bounce-pad' }],
    portals: [
      {
        id: 'rainbow-1',
        kind: 'rainbow-portal',
        entry: { x: 470, y: 820, angle: -16 },
        exit: { x: 620, y: 520, angle: 12 },
      },
    ],
    blocks: [...tower(640, 790, [wood]), ...tower(770, 790, [glass, jelly]), ...tower(850, 785, [jelly])],
  },
];
