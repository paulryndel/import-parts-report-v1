const accentIconChoices = ['★', '✿', '☕', '🍃', '⚓', '♻', '🍷', '🌿', '∞', '✦'];

const designState = {
    shape: 'circle',
    size: 520,
    borderWidth: 18,
    baseColor: '#d09a6c',
    borderColor: '#8a5c2e',
    corkIntensity: 0.55,
    pattern: 'none',
    patternColor: '#b17a45',
    patternOpacity: 0.25,
    centerText: {
        text: 'RYNDEL',
        font: 'Playfair Display',
        size: 96,
        color: '#3a2a14',
        letterSpacing: 6
    },
    arcText: {
        enabled: true,
        text: 'Hand Crafted With Love',
        font: 'Inter',
        size: 28,
        color: '#4d3420',
        letterSpacing: 4,
        offset: 48,
        position: 'top'
    },
    accents: [],
    corkSeed: Math.floor(Math.random() * 1_000_000)
};

const patternCache = new Map();

const canvas = document.getElementById('coaster-canvas');
const ctx = canvas.getContext('2d');

const rangeDisplays = document.querySelectorAll('.range-value');
const accentsContainer = document.getElementById('accents-container');

function mulberry32(seed) {
    return function () {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

function hexToRgb(hex) {
    const sanitized = hex.replace('#', '');
    const bigint = parseInt(sanitized.length === 3 ? sanitized.split('').map(v => v + v).join('') : sanitized, 16);
    return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255
    };
}

function adjustRgb({ r, g, b }, amount) {
    const clamp = (value) => Math.max(0, Math.min(255, value));
    return `rgba(${clamp(r + amount)}, ${clamp(g + amount)}, ${clamp(b + amount)}, 1)`;
}

function createCorkPattern(color, seed) {
    const key = `${color}-${seed}`;
    if (patternCache.has(key)) {
        return patternCache.get(key);
    }

    const offCanvas = document.createElement('canvas');
    offCanvas.width = offCanvas.height = 240;
    const offCtx = offCanvas.getContext('2d');
    const rgb = hexToRgb(color);
    const rand = mulberry32(seed);

    offCtx.fillStyle = adjustRgb(rgb, 18);
    offCtx.fillRect(0, 0, offCanvas.width, offCanvas.height);

    for (let i = 0; i < 320; i += 1) {
        const radius = 2 + rand() * 10;
        const x = rand() * offCanvas.width;
        const y = rand() * offCanvas.height;
        const tone = rand() > 0.5 ? adjustRgb(rgb, -36) : adjustRgb(rgb, -12);
        offCtx.fillStyle = tone.replace(', 1)', `, ${0.15 + rand() * 0.35})`);
        offCtx.beginPath();
        offCtx.arc(x, y, radius, 0, Math.PI * 2);
        offCtx.fill();
    }

    for (let i = 0; i < 120; i += 1) {
        const width = 6 + rand() * 18;
        const height = 2 + rand() * 6;
        const x = rand() * offCanvas.width;
        const y = rand() * offCanvas.height;
        offCtx.fillStyle = adjustRgb(rgb, -52).replace(', 1)', `, ${0.08 + rand() * 0.25})`);
        offCtx.save();
        offCtx.translate(x, y);
        offCtx.rotate(rand() * Math.PI);
        offCtx.fillRect(-width / 2, -height / 2, width, height);
        offCtx.restore();
    }

    const pattern = ctx.createPattern(offCanvas, 'repeat');
    patternCache.set(key, pattern);
    return pattern;
}

function createShapePath(shape, radius) {
    const path = new Path2D();
    if (shape === 'circle') {
        path.arc(0, 0, radius, 0, Math.PI * 2);
    } else if (shape === 'square') {
        const corner = Math.max(14, radius * 0.12);
        path.moveTo(-radius + corner, -radius);
        path.lineTo(radius - corner, -radius);
        path.quadraticCurveTo(radius, -radius, radius, -radius + corner);
        path.lineTo(radius, radius - corner);
        path.quadraticCurveTo(radius, radius, radius - corner, radius);
        path.lineTo(-radius + corner, radius);
        path.quadraticCurveTo(-radius, radius, -radius, radius - corner);
        path.lineTo(-radius, -radius + corner);
        path.quadraticCurveTo(-radius, -radius, -radius + corner, -radius);
        path.closePath();
    } else if (shape === 'hexagon') {
        for (let i = 0; i < 6; i += 1) {
            const angle = Math.PI / 3 * i - Math.PI / 6;
            const x = radius * Math.cos(angle);
            const y = radius * Math.sin(angle);
            if (i === 0) {
                path.moveTo(x, y);
            } else {
                path.lineTo(x, y);
            }
        }
        path.closePath();
    }
    return path;
}

function drawPatternOverlay(path) {
    if (designState.pattern === 'none' || designState.patternOpacity <= 0) return;
    ctx.save();
    ctx.clip(path);
    ctx.globalAlpha = designState.patternOpacity;
    ctx.strokeStyle = designState.patternColor;
    ctx.fillStyle = designState.patternColor;

    const step = 48;
    if (designState.pattern === 'grid') {
        ctx.lineWidth = 1.2;
        for (let x = -canvas.width; x <= canvas.width; x += step) {
            ctx.beginPath();
            ctx.moveTo(x, -canvas.height);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = -canvas.height; y <= canvas.height; y += step) {
            ctx.beginPath();
            ctx.moveTo(-canvas.width, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
    } else if (designState.pattern === 'dots') {
        const dotRadius = 3;
        for (let x = -canvas.width; x <= canvas.width; x += step) {
            for (let y = -canvas.height; y <= canvas.height; y += step) {
                ctx.beginPath();
                ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    } else if (designState.pattern === 'waves') {
        ctx.lineWidth = 2;
        const amplitude = 12;
        const wavelength = 80;
        for (let y = -canvas.height; y <= canvas.height; y += step) {
            ctx.beginPath();
            for (let x = -canvas.width; x <= canvas.width; x += 8) {
                const waveY = y + Math.sin((x / wavelength) * Math.PI * 2) * amplitude;
                if (x === -canvas.width) {
                    ctx.moveTo(x, waveY);
                } else {
                    ctx.lineTo(x, waveY);
                }
            }
            ctx.stroke();
        }
    }

    ctx.restore();
}

function drawTextWithSpacing(text, y, { font, size, color, letterSpacing }) {
    if (!text) return;
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = `${size}px ${font}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    if (!letterSpacing) {
        ctx.fillText(text, 0, y);
        ctx.restore();
        return;
    }

    const letters = [...text];
    let totalWidth = -letterSpacing;
    const widths = letters.map(char => ctx.measureText(char).width);
    widths.forEach(width => {
        totalWidth += width + letterSpacing;
    });
    let currentX = -totalWidth / 2;

    letters.forEach((char, index) => {
        const charWidth = widths[index];
        const charCenter = currentX + charWidth / 2;
        ctx.fillText(char, charCenter, y);
        currentX += charWidth + letterSpacing;
    });

    ctx.restore();
}

function drawArcText(text, radius, { font, size, color, letterSpacing, position }) {
    if (!text) return;
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = `${size}px ${font}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    const letters = [...text];
    const widths = letters.map(letter => ctx.measureText(letter).width);
    const spacing = letterSpacing || 0;
    const totalWidth = widths.reduce((sum, width) => sum + width, 0) + spacing * (letters.length - 1);
    const anglePerPixel = 1 / radius;
    const totalAngle = totalWidth * anglePerPixel;
    const centerAngle = position === 'bottom' ? Math.PI / 2 : -Math.PI / 2;
    const startAngle = centerAngle - totalAngle / 2;

    let offset = 0;
    letters.forEach((letter, index) => {
        const letterWidth = widths[index];
        const letterAngle = startAngle + (offset + letterWidth / 2) * anglePerPixel;
        ctx.save();
        ctx.rotate(letterAngle);
        const translateY = position === 'bottom' ? radius : -radius;
        ctx.translate(0, translateY);
        ctx.rotate(position === 'bottom' ? Math.PI / 2 : -Math.PI / 2);
        ctx.fillText(letter, 0, 0);
        ctx.restore();
        offset += letterWidth + spacing;
    });

    ctx.restore();
}

function drawAccents(radius) {
    const accentRadius = Math.max(60, radius - 60);
    designState.accents.forEach(accent => {
        ctx.save();
        ctx.rotate((accent.angle * Math.PI) / 180);
        ctx.translate(0, -accentRadius);
        ctx.fillStyle = accent.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `${accent.size}px 'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', 'Inter', sans-serif`;
        ctx.fillText(accent.icon, 0, 0);
        ctx.restore();
    });
}

function drawCoaster() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);

    const radius = designState.size / 2;
    const path = createShapePath(designState.shape, radius);

    ctx.save();
    ctx.fillStyle = designState.baseColor;
    ctx.fill(path);

    const corkPattern = createCorkPattern(designState.baseColor, designState.corkSeed);
    if (corkPattern) {
        ctx.globalAlpha = designState.corkIntensity;
        ctx.fillStyle = corkPattern;
        ctx.fill(path);
        ctx.globalAlpha = 1;
    }

    drawPatternOverlay(path);

    ctx.restore();

    ctx.lineWidth = designState.borderWidth;
    ctx.strokeStyle = designState.borderColor;
    ctx.lineJoin = 'round';
    ctx.stroke(path);

    drawAccents(radius);
    drawTextWithSpacing(designState.centerText.text, 0, designState.centerText);

    if (designState.arcText.enabled) {
        const safeRadius = Math.max(80, radius - 40 - designState.arcText.offset);
        drawArcText(designState.arcText.text, safeRadius, designState.arcText);
    }

    ctx.restore();
}

function updateRangeDisplay(target, value, suffix = 'px') {
    const span = Array.from(rangeDisplays).find(el => el.dataset.target === target);
    if (!span) return;
    span.textContent = `${value} ${suffix}`.trim();
}

function setActiveButton(group, value, attr = 'shape') {
    group.querySelectorAll('button').forEach(btn => {
        if (btn.dataset[attr] === value) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function resolveFont(select) {
    const selectedOption = select.options[select.selectedIndex];
    return selectedOption.value || selectedOption.dataset.fallback || 'Inter';
}

function createAccent() {
    const id = crypto.randomUUID ? crypto.randomUUID() : `accent-${Date.now()}-${Math.random()}`;
    return {
        id,
        icon: accentIconChoices[0],
        size: 48,
        color: '#3a2a14',
        angle: 0
    };
}

function renderAccentControls() {
    accentsContainer.innerHTML = '';
    if (!designState.accents.length) {
        const empty = document.createElement('p');
        empty.className = 'hint';
        empty.textContent = 'No accents yet. Use the “Add accent” button to place symbols around the border.';
        accentsContainer.appendChild(empty);
        return;
    }

    designState.accents.forEach((accent, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'accent-item';
        wrapper.innerHTML = `
            <h3>Accent ${index + 1}</h3>
            <button type="button" class="remove-accent" aria-label="Remove accent">×</button>
            <label>Icon
                <select>
                    ${accentIconChoices.map(icon => `<option value="${icon}" ${icon === accent.icon ? 'selected' : ''}>${icon}</option>`).join('')}
                </select>
            </label>
            <div class="field-grid">
                <label>Size
                    <input type="range" min="24" max="96" value="${accent.size}">
                </label>
                <label>Angle
                    <input type="range" min="-180" max="180" value="${accent.angle}">
                </label>
                <label class="color-picker">Color
                    <input type="color" value="${accent.color}">
                </label>
            </div>
        `;

        const [iconSelect] = wrapper.getElementsByTagName('select');
        const [sizeRange, angleRange] = wrapper.querySelectorAll('input[type="range"]');
        const colorInput = wrapper.querySelector('input[type="color"]');
        const removeBtn = wrapper.querySelector('.remove-accent');

        iconSelect.addEventListener('change', () => {
            accent.icon = iconSelect.value;
            drawCoaster();
        });

        sizeRange.addEventListener('input', () => {
            accent.size = Number(sizeRange.value);
            drawCoaster();
        });

        angleRange.addEventListener('input', () => {
            accent.angle = Number(angleRange.value);
            drawCoaster();
        });

        colorInput.addEventListener('input', () => {
            accent.color = colorInput.value;
            drawCoaster();
        });

        removeBtn.addEventListener('click', () => {
            designState.accents = designState.accents.filter(item => item.id !== accent.id);
            renderAccentControls();
            drawCoaster();
        });

        accentsContainer.appendChild(wrapper);
    });
}

function setupControls() {
    const shapeButtons = document.querySelectorAll('#shape-select button');
    shapeButtons.forEach(button => {
        button.addEventListener('click', () => {
            designState.shape = button.dataset.shape;
            setActiveButton(document.getElementById('shape-select'), designState.shape);
            drawCoaster();
        });
    });

    const sizeSlider = document.getElementById('size-slider');
    sizeSlider.addEventListener('input', () => {
        designState.size = Number(sizeSlider.value);
        updateRangeDisplay('size', designState.size);
        drawCoaster();
    });

    const borderSlider = document.getElementById('border-slider');
    borderSlider.addEventListener('input', () => {
        designState.borderWidth = Number(borderSlider.value);
        updateRangeDisplay('border', designState.borderWidth);
        drawCoaster();
    });

    document.getElementById('base-color').addEventListener('input', (event) => {
        designState.baseColor = event.target.value;
        drawCoaster();
    });

    document.getElementById('border-color').addEventListener('input', (event) => {
        designState.borderColor = event.target.value;
        drawCoaster();
    });

    const textureSlider = document.getElementById('texture-slider');
    textureSlider.addEventListener('input', () => {
        designState.corkIntensity = Number(textureSlider.value) / 100;
        updateRangeDisplay('texture', textureSlider.value, '%');
        drawCoaster();
    });

    const patternSelect = document.getElementById('pattern-select');
    patternSelect.addEventListener('change', () => {
        designState.pattern = patternSelect.value;
        drawCoaster();
    });

    document.getElementById('pattern-color').addEventListener('input', (event) => {
        designState.patternColor = event.target.value;
        drawCoaster();
    });

    const patternOpacity = document.getElementById('pattern-opacity');
    patternOpacity.addEventListener('input', () => {
        designState.patternOpacity = Number(patternOpacity.value) / 100;
        updateRangeDisplay('pattern', patternOpacity.value, '%');
        drawCoaster();
    });

    const centerTextInput = document.getElementById('center-text');
    centerTextInput.addEventListener('input', () => {
        designState.centerText.text = centerTextInput.value.toUpperCase();
        drawCoaster();
    });

    const centerFontSelect = document.getElementById('center-font');
    centerFontSelect.addEventListener('change', () => {
        designState.centerText.font = resolveFont(centerFontSelect);
        drawCoaster();
    });

    const centerSize = document.getElementById('center-size');
    centerSize.addEventListener('input', () => {
        designState.centerText.size = Number(centerSize.value);
        updateRangeDisplay('centerSize', centerSize.value, 'pt');
        drawCoaster();
    });

    const centerColor = document.getElementById('center-color');
    centerColor.addEventListener('input', () => {
        designState.centerText.color = centerColor.value;
        drawCoaster();
    });

    const centerSpacing = document.getElementById('center-spacing');
    centerSpacing.addEventListener('input', () => {
        designState.centerText.letterSpacing = Number(centerSpacing.value);
        updateRangeDisplay('centerSpacing', centerSpacing.value, 'px');
        drawCoaster();
    });

    const arcToggle = document.getElementById('arc-enabled');
    const arcControls = document.getElementById('arc-controls');
    arcToggle.addEventListener('change', () => {
        designState.arcText.enabled = arcToggle.checked;
        arcControls.classList.toggle('hidden', !arcToggle.checked);
        drawCoaster();
    });

    const arcText = document.getElementById('arc-text');
    arcText.addEventListener('input', () => {
        designState.arcText.text = arcText.value;
        drawCoaster();
    });

    const arcFont = document.getElementById('arc-font');
    arcFont.addEventListener('change', () => {
        designState.arcText.font = resolveFont(arcFont);
        drawCoaster();
    });

    const arcSize = document.getElementById('arc-size');
    arcSize.addEventListener('input', () => {
        designState.arcText.size = Number(arcSize.value);
        updateRangeDisplay('arcSize', arcSize.value, 'pt');
        drawCoaster();
    });

    const arcColor = document.getElementById('arc-color');
    arcColor.addEventListener('input', () => {
        designState.arcText.color = arcColor.value;
        drawCoaster();
    });

    const arcSpacing = document.getElementById('arc-spacing');
    arcSpacing.addEventListener('input', () => {
        designState.arcText.letterSpacing = Number(arcSpacing.value);
        updateRangeDisplay('arcSpacing', arcSpacing.value, 'px');
        drawCoaster();
    });

    const arcOffset = document.getElementById('arc-offset');
    arcOffset.addEventListener('input', () => {
        designState.arcText.offset = Number(arcOffset.value);
        updateRangeDisplay('arcOffset', arcOffset.value, 'px');
        drawCoaster();
    });

    const arcPositionButtons = document.querySelectorAll('#arc-position button');
    arcPositionButtons.forEach(button => {
        button.addEventListener('click', () => {
            designState.arcText.position = button.dataset.position;
            setActiveButton(document.getElementById('arc-position'), designState.arcText.position, 'position');
            drawCoaster();
        });
    });

    document.getElementById('add-accent').addEventListener('click', () => {
        designState.accents.push(createAccent());
        renderAccentControls();
        drawCoaster();
    });

    document.getElementById('download-btn').addEventListener('click', () => {
        const link = document.createElement('a');
        link.download = 'cork-coaster-design.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
}

function initialise() {
    updateRangeDisplay('size', designState.size);
    updateRangeDisplay('border', designState.borderWidth);
    updateRangeDisplay('texture', Math.round(designState.corkIntensity * 100), '%');
    updateRangeDisplay('pattern', Math.round(designState.patternOpacity * 100), '%');
    updateRangeDisplay('centerSize', designState.centerText.size, 'pt');
    updateRangeDisplay('centerSpacing', designState.centerText.letterSpacing, 'px');
    updateRangeDisplay('arcSize', designState.arcText.size, 'pt');
    updateRangeDisplay('arcSpacing', designState.arcText.letterSpacing, 'px');
    updateRangeDisplay('arcOffset', designState.arcText.offset, 'px');
    setActiveButton(document.getElementById('shape-select'), designState.shape);
    setActiveButton(document.getElementById('arc-position'), designState.arcText.position, 'position');
    renderAccentControls();
    drawCoaster();
}

setupControls();
initialise();
