/**
 * 生成 ZeroDesk 应用图标
 * 设计：圆角方块 + 渐变背景(#635BFF → #8B5CF6) + 白色闪电(Lucide Zap)
 */
import { createRequire } from 'module';
import { mkdirSync } from 'fs';
import { join } from 'path';

const ICONS_DIR = join(import.meta.dirname, '..', 'src-tauri', 'icons');
const ROOT_DIR = join(import.meta.dirname, '..');
const require = createRequire(import.meta.url);
const sharp = require('sharp');

// Lucide Zap 路径 (24x24 viewBox) — 描边模式，和 Sidebar 一致
const ZAP_PATH = 'M13 2L3 14h9l-1 8 10-12h-9l1-8z';

/**
 * 生成指定尺寸的 SVG 图标
 * 还原 Sidebar 左上角样式。
 *
 * @param {number} size - 画布尺寸（像素）
 * @param {object} options
 * @param {boolean} options.opaque - 是否输出无透明背景（iOS/App Store）
 */
function createIconSvg(size, options = {}) {
  const { opaque = false } = options;

  // macOS 桌面图标需要在画布内保留安全留白，避免 Dock 中显得比系统图标大一圈。
  // iOS/App Store 源图由系统裁切，保持满画布且无透明。
  const iconScale = opaque ? 1 : 0.80;
  const iconSize = Math.round(size * iconScale);
  const iconOffset = Math.round((size - iconSize) / 2);

  // Zap 占图标形状的 50%（和 Sidebar 16px/32px 比例一致）
  const zapSize = iconSize * 0.50;
  const zapScale = zapSize / 24;
  const zapOffsetX = iconOffset + (iconSize - zapSize) / 2;
  const zapOffsetY = iconOffset + (iconSize - zapSize) / 2;

  const background = opaque
    ? `<rect width="${size}" height="${size}" fill="url(#bg)"/>`
    : `<path d="${createSquirclePath(iconOffset, iconOffset, iconSize)}" fill="url(#bg)"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#635BFF"/>
      <stop offset="100%" stop-color="#8B5CF6"/>
    </linearGradient>
  </defs>
  ${background}
  <g transform="translate(${zapOffsetX}, ${zapOffsetY}) scale(${zapScale})">
    <path d="${ZAP_PATH}" fill="white" stroke="white" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
  </g>
</svg>`;
}

/**
 * 生成接近 macOS/iOS 连续圆角的 squircle 路径。
 * 普通 SVG rect rx 会在直线和圆角连接处产生更硬的曲率变化；
 * cubic path 的连续圆角更接近现代 Apple app icon 外形。
 */
function createSquirclePath(x, y, size) {
  const c = size * 0.224;
  const e = size;
  const right = x + e;
  const bottom = y + e;

  return [
    `M ${x + c} ${y}`,
    `L ${right - c} ${y}`,
    `C ${right - c * 0.44} ${y} ${right} ${y + c * 0.44} ${right} ${y + c}`,
    `L ${right} ${bottom - c}`,
    `C ${right} ${bottom - c * 0.44} ${right - c * 0.44} ${bottom} ${right - c} ${bottom}`,
    `L ${x + c} ${bottom}`,
    `C ${x + c * 0.44} ${bottom} ${x} ${bottom - c * 0.44} ${x} ${bottom - c}`,
    `L ${x} ${y + c}`,
    `C ${x} ${y + c * 0.44} ${x + c * 0.44} ${y} ${x + c} ${y}`,
    'Z',
  ].join(' ');
}

function createZapOnlySvg(size) {
  const zapSize = size * 0.42;
  const zapScale = zapSize / 24;
  const zapOffsetX = (size - zapSize) / 2;
  const zapOffsetY = (size - zapSize) / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <g transform="translate(${zapOffsetX}, ${zapOffsetY}) scale(${zapScale})">
    <path d="${ZAP_PATH}" fill="white" stroke="white" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
  </g>
</svg>`;
}

// 需要生成的所有尺寸
const sizes = [
  { name: '32x32.png', size: 32 },
  { name: '64x64.png', size: 64 },
  { name: '128x128.png', size: 128 },
  { name: '128x128@2x.png', size: 256 },
  { name: 'icon.png', size: 512 },
  // Windows Store logos
  { name: 'StoreLogo.png', size: 50 },
  { name: 'Square30x30Logo.png', size: 30 },
  { name: 'Square44x44Logo.png', size: 44 },
  { name: 'Square71x71Logo.png', size: 71 },
  { name: 'Square89x89Logo.png', size: 89 },
  { name: 'Square107x107Logo.png', size: 107 },
  { name: 'Square142x142Logo.png', size: 142 },
  { name: 'Square150x150Logo.png', size: 150 },
  { name: 'Square284x284Logo.png', size: 284 },
  { name: 'Square310x310Logo.png', size: 310 },
];

const iosSizes = [
  { name: 'AppIcon-20x20@1x.png', size: 20 },
  { name: 'AppIcon-20x20@2x.png', size: 40 },
  { name: 'AppIcon-20x20@2x-1.png', size: 40 },
  { name: 'AppIcon-20x20@3x.png', size: 60 },
  { name: 'AppIcon-29x29@1x.png', size: 29 },
  { name: 'AppIcon-29x29@2x.png', size: 58 },
  { name: 'AppIcon-29x29@2x-1.png', size: 58 },
  { name: 'AppIcon-29x29@3x.png', size: 87 },
  { name: 'AppIcon-40x40@1x.png', size: 40 },
  { name: 'AppIcon-40x40@2x.png', size: 80 },
  { name: 'AppIcon-40x40@2x-1.png', size: 80 },
  { name: 'AppIcon-40x40@3x.png', size: 120 },
  { name: 'AppIcon-60x60@2x.png', size: 120 },
  { name: 'AppIcon-60x60@3x.png', size: 180 },
  { name: 'AppIcon-76x76@1x.png', size: 76 },
  { name: 'AppIcon-76x76@2x.png', size: 152 },
  { name: 'AppIcon-83.5x83.5@2x.png', size: 167 },
  { name: 'AppIcon-512@2x.png', size: 1024 },
];

const androidSizes = [
  { dir: 'mipmap-mdpi', launcher: 48, foreground: 108 },
  { dir: 'mipmap-hdpi', launcher: 49, foreground: 162 },
  { dir: 'mipmap-xhdpi', launcher: 96, foreground: 216 },
  { dir: 'mipmap-xxhdpi', launcher: 144, foreground: 324 },
  { dir: 'mipmap-xxxhdpi', launcher: 192, foreground: 432 },
];

async function main() {
  mkdirSync(ICONS_DIR, { recursive: true });

  // 生成所有 PNG
  for (const { name, size } of sizes) {
    const svg = createIconSvg(size);
    const outPath = join(ICONS_DIR, name);
    await sharp(Buffer.from(svg)).png().toFile(outPath);
    console.log(`✓ ${name} (${size}x${size})`);
  }

  const iosDir = join(ICONS_DIR, 'ios');
  mkdirSync(iosDir, { recursive: true });
  for (const { name, size } of iosSizes) {
    const svg = createIconSvg(size, { opaque: true });
    const outPath = join(iosDir, name);
    await sharp(Buffer.from(svg)).removeAlpha().png().toFile(outPath);
    console.log(`✓ ios/${name} (${size}x${size})`);
  }

  const previewSvg = createIconSvg(1024, { opaque: true });
  await sharp(Buffer.from(previewSvg))
    .removeAlpha()
    .png()
    .toFile(join(ROOT_DIR, 'icon-preview.png'));
  console.log('✓ icon-preview.png (1024x1024)');

  await generateAndroidIcons();

  // 生成 icon.ico (包含多个尺寸，用最大的 256 生成)
  // sharp 不直接支持 ico，我们用 png2ico 或手动方式
  // 先生成一个 256x256 的 png 作为 ico 的来源
  // 用多尺寸生成 ico
  // sharp 不支持 ico，我们生成各尺寸 png 然后组合
  const icoSizes = [16, 24, 32, 48, 64, 128, 256];
  const icoBuffers = [];
  for (const s of icoSizes) {
    const svg = createIconSvg(s);
    const buf = await sharp(Buffer.from(svg)).png().toBuffer();
    icoBuffers.push({ size: s, buffer: buf });
  }

  // 手动构建 ICO 文件
  const icoBuffer = buildIco(icoBuffers);
  const { writeFileSync } = await import('fs');
  writeFileSync(join(ICONS_DIR, 'icon.ico'), icoBuffer);
  console.log('✓ icon.ico');

  // 生成 icon.icns (macOS)
  // 使用 iconutil（macOS 自带）
  await generateIcns();
  console.log('✓ icon.icns');

  console.log('\n图标生成完成！');
}

async function generateAndroidIcons() {
  const { writeFileSync } = await import('fs');
  const androidDir = join(ICONS_DIR, 'android');

  for (const { dir, launcher, foreground } of androidSizes) {
    const densityDir = join(androidDir, dir);
    mkdirSync(densityDir, { recursive: true });

    const launcherSvg = createIconSvg(launcher, { opaque: true });
    await sharp(Buffer.from(launcherSvg))
      .removeAlpha()
      .png()
      .toFile(join(densityDir, 'ic_launcher.png'));
    await sharp(Buffer.from(launcherSvg))
      .removeAlpha()
      .png()
      .toFile(join(densityDir, 'ic_launcher_round.png'));

    const foregroundSvg = createZapOnlySvg(foreground);
    await sharp(Buffer.from(foregroundSvg))
      .png()
      .toFile(join(densityDir, 'ic_launcher_foreground.png'));
  }

  const anydpiDir = join(androidDir, 'mipmap-anydpi-v26');
  mkdirSync(anydpiDir, { recursive: true });
  writeFileSync(
    join(anydpiDir, 'ic_launcher.xml'),
    `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
  <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
  <background android:drawable="@color/ic_launcher_background"/>
</adaptive-icon>
`,
  );

  const valuesDir = join(androidDir, 'values');
  mkdirSync(valuesDir, { recursive: true });
  writeFileSync(
    join(valuesDir, 'ic_launcher_background.xml'),
    `<?xml version="1.0" encoding="utf-8"?>
<resources>
  <color name="ic_launcher_background">#7468F9</color>
</resources>
`,
  );

  console.log('✓ android icons');
}

/**
 * 构建 ICO 文件格式
 */
function buildIco(images) {
  const numImages = images.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = dirEntrySize * numImages;

  let offset = headerSize + dirSize;
  const entries = [];

  for (const { size, buffer } of images) {
    entries.push({
      width: size >= 256 ? 0 : size,
      height: size >= 256 ? 0 : size,
      offset,
      buffer,
    });
    offset += buffer.length;
  }

  const totalSize = offset;
  const ico = Buffer.alloc(totalSize);

  // ICO 头部
  ico.writeUInt16LE(0, 0);      // reserved
  ico.writeUInt16LE(1, 2);      // type (1 = ICO)
  ico.writeUInt16LE(numImages, 4); // count

  // 目录
  let dirOffset = headerSize;
  for (const entry of entries) {
    ico.writeUInt8(entry.width, dirOffset);
    ico.writeUInt8(entry.height, dirOffset + 1);
    ico.writeUInt8(0, dirOffset + 2);   // palette
    ico.writeUInt8(0, dirOffset + 3);   // reserved
    ico.writeUInt16LE(1, dirOffset + 4); // planes
    ico.writeUInt16LE(32, dirOffset + 6); // bits per pixel
    ico.writeUInt32LE(entry.buffer.length, dirOffset + 8);
    ico.writeUInt32LE(entry.offset, dirOffset + 12);
    dirOffset += dirEntrySize;
  }

  // 图像数据
  for (const entry of entries) {
    entry.buffer.copy(ico, entry.offset);
  }

  return ico;
}

/**
 * 直接构建 .icns 文件，避免 iconutil 在部分 macOS 环境下误报 Invalid Iconset。
 */
async function generateIcns() {
  const icnsSizes = [
    { type: 'icp4', size: 16 },
    { type: 'icp5', size: 32 },
    { type: 'icp6', size: 64 },
    { type: 'ic07', size: 128 },
    { type: 'ic08', size: 256 },
    { type: 'ic09', size: 512 },
    { type: 'ic10', size: 1024 },
    { type: 'ic11', size: 32 },
    { type: 'ic12', size: 64 },
    { type: 'ic13', size: 256 },
    { type: 'ic14', size: 512 },
  ];

  const chunks = [];
  for (const { type, size } of icnsSizes) {
    const svg = createIconSvg(size);
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    const chunk = Buffer.alloc(8 + png.length);
    chunk.write(type, 0, 4, 'ascii');
    chunk.writeUInt32BE(8 + png.length, 4);
    png.copy(chunk, 8);
    chunks.push(chunk);
  }

  const totalLength = 8 + chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const icns = Buffer.alloc(totalLength);
  icns.write('icns', 0, 4, 'ascii');
  icns.writeUInt32BE(totalLength, 4);

  let offset = 8;
  for (const chunk of chunks) {
    chunk.copy(icns, offset);
    offset += chunk.length;
  }

  const { writeFileSync, rmSync, existsSync } = await import('fs');
  writeFileSync(join(ICONS_DIR, 'icon.icns'), icns);

  const iconsetDir = join(ICONS_DIR, 'icon.iconset');
  if (existsSync(iconsetDir)) {
    rmSync(iconsetDir, { recursive: true });
  }
}

main().catch(console.error);
