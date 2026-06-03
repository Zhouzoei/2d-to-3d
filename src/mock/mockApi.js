// 模拟生成 API，每次返回不同样式的图片
// 启用后无需后端即可测试生成流程、变体切换、重新生成

let callCount = 0;

const COLOR_THEMES = [
    { bg: '#4A90D9', accent: '#FFD700', label: '蔚蓝' },
    { bg: '#E74C3C', accent: '#FFFFFF', label: '赤红' },
    { bg: '#2ECC71', accent: '#FFFFFF', label: '翠绿' },
    { bg: '#9B59B6', accent: '#FFD700', label: '紫晶' },
    { bg: '#F39C12', accent: '#FFFFFF', label: '琥珀' },
    { bg: '#1ABC9C', accent: '#FFFFFF', label: '翡翠' },
];

function generateMockImage(prompt, style) {
    const theme = COLOR_THEMES[callCount % COLOR_THEMES.length];
    const bgColor = theme.bg;
    const accentColor = theme.accent;
    const size = 256;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(size * 0.3, size * 0.3, 0, size * 0.5, size * 0.5, size * 0.8);
    grad.addColorStop(0, accentColor);
    grad.addColorStop(0.4, bgColor);
    grad.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 80; i++) {
        ctx.beginPath();
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = Math.random() * 6 + 2;
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.3 + 0.1})`;
        ctx.fill();
    }

    for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        const cx = size * (0.2 + Math.random() * 0.6);
        const cy = size * (0.2 + Math.random() * 0.6);
        const r = Math.random() * 40 + 20;
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${Math.random() * 0.2 + 0.1})`;
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${Math.floor(size * 0.12)}px "Noto Serif SC", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(style || '角色', size / 2, size * 0.35);

    ctx.font = `${Math.floor(size * 0.045)}px sans-serif`;
    ctx.shadowBlur = 10;
    ctx.fillStyle = `rgba(255, 255, 255, 0.85)`;
    ctx.fillText(`「${theme.label}」· 第 ${callCount + 1} 版`, size / 2, size * 0.52);

    ctx.shadowBlur = 0;
    ctx.font = `${Math.floor(size * 0.035)}px sans-serif`;
    ctx.fillStyle = `rgba(255, 255, 255, 0.5)`;
    const lines = wrapText(ctx, prompt, size * 0.8, 60);
    lines.forEach((line, i) => {
        ctx.fillText(line, size / 2, size * 0.65 + i * 22);
    });

    const labelX = size - 10;
    const labelY = size - 10;
    ctx.fillStyle = `rgba(0, 0, 0, 0.3)`;
    ctx.beginPath();
    ctx.arc(labelX - 20, labelY - 10, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${Math.floor(size * 0.04)}px sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`#${callCount + 1}`, labelX - 8, labelY - 4);

    return canvas.toDataURL('image/png').split(',')[1];
}

function wrapText(ctx, text, maxWidth, maxCharsPerLine) {
    if (!text) return ['未输入描述'];
    const lines = [];
    let current = '';
    for (const char of text) {
        if (current.length >= maxCharsPerLine) {
            lines.push(current);
            current = '';
        }
        current += char;
    }
    if (current) lines.push(current);
    return lines.length ? lines : ['未输入描述'];
}

export async function mockGenerate(prompt, style) {
    const delay = 800 + Math.random() * 1200;
    await new Promise(resolve => setTimeout(resolve, delay));

    const b64_1 = generateMockImage(prompt, style);
    callCount++;
    const b64_2 = generateMockImage(prompt, style);
    callCount++;
    const b64_3 = generateMockImage(prompt, style);
    callCount++;

    return { images: [b64_1, b64_2, b64_3] };
}

export function resetMockCount() {
    callCount = 0;
}

// 3D Mock 生成器：每次生成不同颜色的 3D 占位图
let modelCount = 0;
const MODEL_COLORS = ['#4A90D9', '#E74C3C', '#2ECC71', '#9B59B6', '#F39C12', '#1ABC9C', '#E67E22', '#3498DB'];

function generateMock3DPreview(confirmedImage) {
    const color = MODEL_COLORS[modelCount % MODEL_COLORS.length];
    const size = 300;
    modelCount++;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(size * 0.5, size * 0.4, 0, size * 0.5, size * 0.5, size * 0.7);
    grad.addColorStop(0, '#FFFFFF');
    grad.addColorStop(0.3, color);
    grad.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // 如果传入了确认的2D图片，叠加在中心作为贴图预览
    if (confirmedImage) {
        try {
            const overlaySize = size * 0.35;
            ctx.save();
            ctx.beginPath();
            ctx.arc(size * 0.5, size * 0.4, overlaySize * 0.6, 0, Math.PI * 2);
            ctx.clip();
            // 同步方式绘制：Canvas 已存在时可直接 drawImage
            // 使用已缓存的 img 对象
            const tempImg = new Image();
            tempImg.src = confirmedImage;
            if (tempImg.complete) {
                ctx.drawImage(tempImg, size * 0.5 - overlaySize, size * 0.4 - overlaySize, overlaySize * 2, overlaySize * 2);
            }
            ctx.restore();
        } catch (e) {}
    }

    // 3D 球体高光
    const cx = size * 0.5, cy = size * 0.4;
    for (let r = 60; r > 0; r -= 4) {
        const alpha = 0.05 + (r / 60) * 0.3;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();
    }

    // 光环
    ctx.beginPath();
    ctx.arc(cx, cy, 72, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 255, 255, 0.4)`;
    ctx.lineWidth = 2;
    ctx.stroke();

    // 模型编号标签
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = `bold ${Math.floor(size * 0.055)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`3D 模型 #${modelCount}`, size / 2, size - 14);

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = `${Math.floor(size * 0.035)}px sans-serif`;
    ctx.fillText('基于确认的2D角色重建', size / 2, size - 2);

    return canvas.toDataURL('image/png');
}

export function mockGenerate3D(confirmedImage) {
    const delay = 1000 + Math.random() * 1000;
    return new Promise(resolve => {
        setTimeout(() => {
            resolve({ modelUrl: generateMock3DPreview(confirmedImage) });
        }, delay);
    });
}

export function resetModelCount() {
    modelCount = 0;
}