const upload = document.getElementById('upload');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const sliders = {
    size: document.getElementById('sizeSlider'),
    brightness: document.getElementById('brightnessSlider'),
    curve: document.getElementById('curveSlider'),
    black: document.getElementById('blackSlider'),
    white: document.getElementById('whiteSlider'),
    noise: document.getElementById('noiseSlider'),
    prenoise: document.getElementById('prenoiseSlider'),
    blur: document.getElementById('blurSlider'),
    low: document.getElementById('lowSlider'),
    mid: document.getElementById('midSlider'),
    high: document.getElementById('highSlider'),
};

const processBtn = document.getElementById('process');
const downloadBtn = document.getElementById('download');

let img = new Image();

upload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (event) {
        img.onload = function () {
            const scale = Math.max(3840 / img.width, 2160 / img.height, 1);
            canvas.width = Math.floor(img.width * scale);
            canvas.height = Math.floor(img.height * scale);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
        img.src = event.target.result;
    }
    reader.readAsDataURL(file);
});

processBtn.addEventListener('click', () => {
    applyDither();
});

downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'dithered.png';
    link.href = canvas.toDataURL();
    link.click();
});

function applyDither() {
    if (!img.src) return;

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    if (+sliders.blur.value > 0) applyBlur();

    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let data = imageData.data;

    const brightness = +sliders.brightness.value;
    const curve = +sliders.curve.value;
    const blackPoint = +sliders.black.value;
    const whitePoint = +sliders.white.value;
    const preNoise = +sliders.prenoise.value;
    const postNoise = +sliders.noise.value;
    const blockSize = +sliders.size.value;

    const lowFactor = +sliders.low.value;
    const midFactor = +sliders.mid.value;
    const highFactor = +sliders.high.value;

    // Preprocess: grayscale, blur, pre-noise
    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            let i = (y * canvas.width + x) * 4;
            let gray = (data[i] + data[i+1] + data[i+2]) / 3;

            if (preNoise > 0) {
                gray += (Math.random() - 0.5) * preNoise;
            }

            gray = Math.max(0, Math.min(255, gray));

            // Tone curve blend
            const norm = gray / 255;
            let lowWeight  = 1 - norm;
            let midWeight  = 1 - Math.abs(norm - 0.5) * 2;
            let highWeight = norm;
            let total = lowWeight + midWeight + highWeight;
            lowWeight /= total;
            midWeight /= total;
            highWeight /= total;

            gray *= (lowWeight * lowFactor + midWeight * midFactor + highWeight * highFactor);

            // Global brightness & curve
            gray = Math.max(0, Math.min(255, gray + brightness));
            gray = 255 * Math.pow(gray / 255, 1 / curve);

            // Crush blacks and whites
            if (gray < blackPoint) gray = 0;
            if (gray > whitePoint) gray = 255;

            data[i] = data[i+1] = data[i+2] = gray;
        }
    }

    // Dithering (Floyd–Steinberg on block-averaged image)
    for (let y = 0; y < canvas.height; y += blockSize) {
        for (let x = 0; x < canvas.width; x += blockSize) {
            let sum = 0, count = 0;

            for (let dy = 0; dy < blockSize; dy++) {
                for (let dx = 0; dx < blockSize; dx++) {
                    let px = x + dx, py = y + dy;
                    if (px >= canvas.width || py >= canvas.height) continue;
                    let i = (py * canvas.width + px) * 4;
                    sum += data[i];
                    count++;
                }
            }

            let avg = sum / count;
            let newPixel = avg < 128 ? 0 : 255;
            let error = avg - newPixel;

            for (let dy = 0; dy < blockSize; dy++) {
                for (let dx = 0; dx < blockSize; dx++) {
                    let px = x + dx, py = y + dy;
                    if (px >= canvas.width || py >= canvas.height) continue;
                    let i = (py * canvas.width + px) * 4;
                    data[i] = data[i+1] = data[i+2] = newPixel;
                }
            }
        }
    }

    // Add post noise
    if (postNoise > 0) {
        for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
                let i = (y * canvas.width + x) * 4;
                let noise = (Math.random() - 0.5) * postNoise;
                data[i] = clamp(data[i] + noise);
                data[i+1] = clamp(data[i+1] + noise);
                data[i+2] = clamp(data[i+2] + noise);
            }
        }
    }

    ctx.putImageData(imageData, 0, 0);
}

function applyBlur() {
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let data = imageData.data;

    for (let y = 1; y < canvas.height - 1; y++) {
        for (let x = 1; x < canvas.width - 1; x++) {
            let total = 0;
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    let i = ((y + dy) * canvas.width + (x + dx)) * 4;
                    total += (data[i] + data[i+1] + data[i+2]) / 3;
                }
            }
            let avg = total / 9;
            let i = (y * canvas.width + x) * 4;
            data[i] = data[i+1] = data[i+2] = avg;
        }
    }

    ctx.putImageData(imageData, 0, 0);
}

function clamp(val) {
    return Math.max(0, Math.min(255, val));
}
