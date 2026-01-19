
export const drawMultilineText = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): void => {
    const words = text.split(' ');
    let line = '';
    let currentY = y;
    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
            ctx.fillText(line, x, currentY);
            line = words[n] + ' ';
            currentY += lineHeight;
        } else { line = testLine; }
    }
    ctx.fillText(line, x, currentY);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const renderCustomNode = (node: any, ctx: CanvasRenderingContext2D, globalScale: number, options: {
    centerNodeSize: number;
    groupNodeSize: number;
    baseFontSize: number;
    fontColor: string;
    showUserLabel: boolean;
    enableShadows: boolean;
    shadowColor: string;
    shadowBlur: number;
    shadowOffsetX: number;
    shadowOffsetY: number;
    fixedScreenSize?: boolean;
}): void => {
    const label = node.displayName || '';
    let size = node.isUser ? (options.centerNodeSize || 20) : (options.groupNodeSize || 6);

    // Billboarding: If enabled, size is divided by scale to remain constant on screen
    if (options.fixedScreenSize) {
        size = size / globalScale;
    }

    const fontSize = (options.baseFontSize || 12) / globalScale;

    // Image Preloading check (handled by parent usually, but good to check)
    if (node.photoBlobUrl && !node.img) {
        node.img = new Image();
        node.img.src = node.photoBlobUrl;
        node.imgLoaded = false;
        node.img.onload = () => { node.imgLoaded = true; };
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);

    if (options.enableShadows) {
        ctx.shadowColor = options.shadowColor || 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = options.shadowBlur || 10;
        ctx.shadowOffsetX = options.shadowOffsetX || 3;
        ctx.shadowOffsetY = options.shadowOffsetY || 3;
    }

    if (node.img && node.imgLoaded) {
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        // Clear shadow for clip
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        ctx.clip();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        try { ctx.drawImage(node.img, node.x - size, node.y - size, size * 2, size * 2); } catch (e) { /* ignore */ }
    } else {
        ctx.fillStyle = node.isUser ? 'orange' : '#0078d4';
        ctx.fill();
    }
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    if (node.isUser) {
        if (options.showUserLabel) {
            ctx.font = `bold ${fontSize}px "Segoe UI", sans-serif`;
            ctx.fillStyle = options.fontColor || '#333';
            ctx.fillText(label, node.x, node.y + size + 5);
        }
    } else {
        ctx.font = `${fontSize}px "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
        ctx.fillStyle = options.fontColor || '#000000'; // Changed to use fontColor
        drawMultilineText(ctx, label, node.x, node.y + size + 2, 80, fontSize * 1.2);
    }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const renderNodeHitArea = (node: any, color: string, ctx: CanvasRenderingContext2D, globalScale: number, options: {
    centerNodeSize: number;
    groupNodeSize: number;
    fixedScreenSize?: boolean;
}): void => {
    let size = node.isUser ? (options.centerNodeSize || 20) : (options.groupNodeSize || 6);

    // Billboarding Logic (Match Visuals)
    if (options.fixedScreenSize) {
        size = size / globalScale;
    }

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
    ctx.fill();
};
