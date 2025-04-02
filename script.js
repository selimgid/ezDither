const upload = document.getElementById('upload');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const sizeSlider = document.getElementById('sizeSlider');
const brightnessSlider = document.getElementById('brightnessSlider');
const curveSlider = document.getElementById('curveSlider');
const sizeVal = document.getElementById('sizeVal');
const brightVal = document.getElementById('brightVal');
const curveVal = document.getElementById('curveVal');
const downloadBtn = document.getElementById('download');

let img = new Image();

upload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (event) {
        img.onload = function () {
            canvas.width = img.width;
            canvas.height = img.height;
            applyDither();
        }
        img.src = event.target.result;
    }
    reader.readAsDataURL(file);
});

[sizeSlider, brightnessSlider, curveSlider].forEach(slider => {
    slider.addEventListener('input', () => {
        sizeVal.textContent = sizeSlider.value;
        brightVal.textContent = brightnessSlider.value;
        curveVal.textContent = curveSlider.value;
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
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let data = imageData.data;
    const brightness = parseInt(brightnessSlider.value);
    const curve = parseFloat(curveSlider.value);

    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            let i = (y * canvas.width + x) * 4;
            let gray = (data[i] + data[i+1] + data[i+2]) / 3;
            gray = Math.max(0, Math.min(255, gray + brightness));
            gray = 255 * Math.pow(gray / 255, 1 / curve);

            let newPixel = gray < 128 ? 0 : 255;
            let error = gray - newPixel;

            data[i] = data[i+1] = data[i+2] = newPixel;

            distributeError(x + 1, y,     error * 7 / 16, data, canvas.width, brightness, curve);
            distributeError(x - 1, y + 1, error * 3 / 16, data, canvas.width, brightness, curve);
            distributeError(x,     y + 1, error * 5 / 16, data, canvas.width, brightness, curve);
            distributeError(x + 1, y + 1, error * 1 / 16, data, canvas.width, brightness, curve);
        }
    }

    // Add grain layer
    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            let i = (y * canvas.width + x) * 4;
            let noise = (Math.random() - 0.5) * 20;
            data[i] = clamp(data[i] + noise);
            data[i+1] = clamp(data[i+1] + noise);
            data[i+2] = clamp(data[i+2] + noise);
        }
    }

    ctx.putImageData(imageData, 0, 0);
}

function distributeError(x, y, error, data, width, brightness, curve) {
    if (x < 0 || y < 0 || x >= width || y >= canvas.height) return;
    let i = (y * width + x) * 4;
    let gray = (data[i] + data[i+1] + data[i+2]) / 3;
    gray = Math.max(0, Math.min(255, gray + error + brightness));
    gray = 255 * Math.pow(gray / 255, 1 / curve);
    data[i] = data[i+1] = data[i+2] = gray;
}

function clamp(val) {
    return Math.max(0, Math.min(255, val));
}
