/* Progressive enhancement: every illustration remains readable without JS. */
const asset = name => new URL('../graphics/' + name, location.href).href;
const read = async name => {
  const response = await fetch(asset(name));
  if (!response.ok) throw new Error('Could not load ' + name);
  return response.json();
};
const loadImage = name => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('Could not load ' + name));
  image.src = asset(name);
});
const report = (id, error) => {
  document.getElementById(id).textContent = 'The interactive example could not load. The original still image is shown.';
  console.error(error);
};

async function progress() {
  const data = await read('model-progress.json');
  await Promise.all(data.stages.map(stage => loadImage(stage.image)));
  const slider = document.getElementById('progress-range');
  const image = document.getElementById('progress-image');
  const output = document.getElementById('progress-count');
  slider.max = data.stages.length - 1;
  slider.value = slider.max;
  const update = () => {
    const stage = data.stages[Number(slider.value)];
    image.src = asset(stage.image);
    image.alt = 'Original Samson render after ' + stage.calls + ' of ' + data.total_calls + ' raster calls';
    output.textContent = stage.calls + ' / ' + data.total_calls + ' calls';
    slider.setAttribute('aria-valuetext', output.textContent);
  };
  slider.addEventListener('input', update);
  update();
  document.getElementById('progress-controls').hidden = false;
}

async function environment() {
  const descriptions = {
    bands: 'Temperate daylight sky and ground palette bands',
    ground: 'Perspective ground texture drawn under the sky',
    panorama: 'Distant panorama over the textured ground',
    clouds: 'Full temperate background with ground, panorama and clouds'
  };
  await Promise.all(Object.keys(descriptions).map(name => loadImage('world-' + name + '.png')));
  const selector = document.getElementById('environment-stage');
  const image = document.getElementById('environment-image');
  selector.addEventListener('change', () => {
    image.src = asset('world-' + selector.value + '.png');
    image.alt = descriptions[selector.value];
  });
  document.getElementById('environment-controls').hidden = false;
}

async function texture() {
  const [data, original] = await Promise.all([read('texture-quad.json'), loadImage('affine-quad.png')]);
  const canvas = document.getElementById('texture-comparison');
  const context = canvas.getContext('2d');
  const image = document.getElementById('texture-original');
  const mode = document.getElementById('texture-mode');
  const diagonal = document.getElementById('texture-diagonal');
  const triangles = context.createImageData(320, 200);
  for (let i = 3; i < triangles.data.length; i += 4) triangles.data[i] = 255;
  // Illustrative per-triangle affine UVs. This is deliberately independent of
  // the original column mapper and its integer coverage conventions.
  for (const indices of [[0, 1, 2], [0, 2, 3]]) {
    const [a, b, c] = indices.map(i => data.points[i]);
    const uv = indices.map(i => data.uv[i]);
    const area = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
    for (let y = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1]))); y <= Math.min(199, Math.ceil(Math.max(a[1], b[1], c[1]))); y++) {
      for (let x = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0]))); x <= Math.min(319, Math.ceil(Math.max(a[0], b[0], c[0]))); x++) {
        const p = ((b[1] - c[1]) * (x + .5 - c[0]) + (c[0] - b[0]) * (y + .5 - c[1])) / area;
        const q = ((c[1] - a[1]) * (x + .5 - c[0]) + (a[0] - c[0]) * (y + .5 - c[1])) / area;
        const r = 1 - p - q;
        if (p < 0 || q < 0 || r < 0) continue;
        const u = Math.max(0, Math.min(31, Math.round(p * uv[0][0] + q * uv[1][0] + r * uv[2][0])));
        const v = Math.max(0, Math.min(31, Math.round(p * uv[0][1] + q * uv[1][1] + r * uv[2][1])));
        const colour = data.texture[v * 32 + u] * 3, offset = (y * 320 + x) * 4;
        triangles.data.set(data.palette.slice(colour, colour + 3), offset);
      }
    }
  }
  const update = () => {
    const isOriginal = mode.value === 'original';
    canvas.hidden = isOriginal && !diagonal.checked;
    image.hidden = !canvas.hidden;
    if (canvas.hidden) return;
    if (isOriginal) context.drawImage(original, 0, 0); else context.putImageData(triangles, 0, 0);
    canvas.setAttribute('aria-label', (isOriginal ? 'Original whole-polygon texture mapping' : 'Illustrative two-triangle affine texture mapping') + (diagonal.checked ? ', with the diagonal overlaid' : ''));
    if (diagonal.checked) {
      context.beginPath();
      context.moveTo(...data.points[0]);
      context.lineTo(...data.points[2]);
      context.strokeStyle = '#ffffff'; context.lineWidth = 1;
      context.setLineDash([4, 3]); context.stroke(); context.setLineDash([]);
    }
  };
  mode.addEventListener('change', update);
  diagonal.addEventListener('change', update);
  document.getElementById('texture-controls').hidden = false;
}
progress().catch(error => report('progress-status', error));
texture().catch(error => report('texture-status', error));
environment().catch(error => console.error(error));
