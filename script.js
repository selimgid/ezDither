const upload = document.getElementById('upload');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const sizeSlider = document.getElementById('sizeSlider');
const brightnessSlider = document.getElementById('brightnessSlider');
const sizeVal = document.getElementById('sizeVal');
const brightVal = document.getElementById('brightVal');
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

sizeSlider.addEventListener('input', () => {
    sizeVal.textContent = sizeSlider.value;
    applyDither();
});
brightnessSlider.addEventListener('input', () => {
    brightVal.textContent = brightnessSlider.value;
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
    ctx.drawImage(img, 0, 0);
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let data = imageData.data;
    const brightness = parseInt(brightnessSlider.value);
    const size = parseInt(sizeSlider.value);

    for (let y = 0; y < canvas.height; y += size) {
        for (let x = 0; x < canvas.width; x += size) {
            let i = (y * canvas.width + x) * 4;
            let oldPixel = (data[i] + data[i+1] + data[i+2]) / 3 + brightness;
            oldPixel = Math.max(0, Math.min(255, oldPixel));
            let newPixel = oldPixel < 128 ? 0 : 255;
            let error = oldPixel - newPixel;

            for (let dy = 0; dy < size; dy++) {
                for (let dx = 0; dx < size; dx++) {
                    let ni = ((y + dy) * canvas.width + (x + dx)) * 4;
                    if (ni >= data.length) continue;
                    data[ni] = data[ni+1] = data[ni+2] = newPixel;
                }
            }

            // Floyd-Steinberg Dithering
            distributeError(x+1, y,     error * 7 / 16, data, canvas.width, brightness);
            distributeError(x-1, y+1,   error * 3 / 16, data, canvas.width, brightness);
            distributeError(x,   y+1,   error * 5 / 16, data, canvas.width, brightness);
            distributeError(x+1, y+1,   error * 1 / 16, data, canvas.width, brightness);
        }
    }
    ctx.putImageData(imageData, 0, 0);
}

function distributeError(x, y, error, data, width, brightness) {
    if (x < 0 || y < 0 || x >= width || y >= canvas.height) return;
    let i = (y * width + x) * 4;
    let gray = (data[i] + data[i+1] + data[i+2]) / 3 + error + brightness;
    gray = Math.max(0, Math.min(255, gray));
    data[i] = data[i+1] = data[i+2] = gray;
}
