const upload = document.getElementById('upload');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const sizeSlider = document.getElementById('sizeSlider');
const brightnessSlider = document.getElementById('brightnessSlider');
const curveSlider = document.getElementById('curveSlider');
const blackSlider = document.getElementById('blackSlider');
const whiteSlider = document.getElementById('whiteSlider');
const noiseSlider = document.getElementById('noiseSlider');
const blurSlider = document.getElementById('blurSlider');

const sizeVal = document.getElementById('sizeVal');
const brightVal = document.getElementById('brightVal');
const curveVal = document.getElementById('curveVal');
const blackVal = document.getElementById('blackVal');
const whiteVal = document.getElementById('whiteVal');
const noiseVal = document.getElementById('noiseVal');
const blurVal = document.getElementById('blurVal');

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
            applyDither();
        }
        img.src = event.target.result;
    }
    reader.readAsDataURL(file);
});

[
    sizeSlider, brightnessSlider, curveSlider,
    blackSlider, whiteSlider, noiseSlider, blurSlider
].forEach(slider => {
    slider.addEventListener('input', () => {
        sizeVal.textContent = sizeSlider.value;
        brightVal.textContent = brightnessSlider.value;
        curveVal.textContent = curveSlider.value;
        blackVal.textContent = blackSlider.value;
        whiteVal.textContent = whiteSlider.value;
        noiseVal.textContent = noiseSlider.value;
        blurVal.textContent = blurSlider.value;
        applyDither();
    });
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
    if (blurSlider.value > 0) applyBlur();

    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let data = imageData.data;

    const brightness = parseInt(brightnessSlider.value);
    const curve = parseFloat(curveSlider.value);
    const blackPoint = parseInt(blackSlider.value);
    const whitePoint = parseInt(whiteSlider.value);
    const noiseLevel = parseFloat(noiseSlider.value);
    const size = parseInt(sizeSlider.value);

    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            let i = (y * canvas.width + x) * 4;
            let gray = (data[i] + data[i+1] + data[i+2]) / 3;
            gray = Math.max(0, Math.min(255, gray + brightness));
            gray = 255 * Math.pow(gray / 255, 1 / curve);
            gray = Math.max(blackPoint, Math.min(whitePoint, gray));

            let newPixel = gray < 128 ? 0 : 255;
            let error = gray - newPixel;

            data[i] = data[i+1] = data[i+2] = newPixel;

            distributeError(x+1, y,     error * 7 / 16, data, canvas.width, brightness, curve, blackPoint, whitePoint);
            distributeError(x-1, y+1,   error * 3 / 16, data, canvas.width, brightness, curve, blackPoint, whitePoint);
            distributeError(x,   y+1,   error * 5 / 16, data, canvas.width, brightness, curve, blackPoint, whitePoint);
            distributeError(x+1, y+1,   error * 1 / 16, data, canvas.width, brightness, curve, blackPoint, whitePoint);
        }
    }

    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            let i = (y * canvas.width + x) * 4;
            let noise = (Math.random() - 0.5) * noiseLevel;
            data[i] = clamp(data[i] + noise);
            data[i+1] = clamp(data[i+1] + noise);
            data[i+2] = clamp(data[i+2] + noise);
        }
    }

    ctx.putImageData(imageData, 0, 0);
}

function applyBlur() {
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let data = imageData.data;
    let radius = parseInt(blurSlider.value);

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

function distributeError(x, y, error, data, width, brightness, curve, blackPoint, whitePoint) {
    if (x < 0 || y < 0 || x >= width || y >= canvas.height) return;
    let i = (y * width + x) * 4;
    let gray = (data[i] + data[i+1] + data[i+2]) / 3;
    gray = Math.max(0, Math.min(255, gray + error + brightness));
    gray = 255 * Math.pow(gray / 255, 1 / curve);
    gray = Math.max(blackPoint, Math.min(whitePoint, gray));
    data[i] = data[i+1] = data[i+2] = gray;
}

function clamp(val) {
    return Math.max(0, Math.min(255, val));
}
