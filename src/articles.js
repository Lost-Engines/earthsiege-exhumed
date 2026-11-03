// Each control explains a retained rule or selects a captured result. No game
// simulation runs here. Static figures and descriptions remain without JS.
const el = id => document.getElementById(id);
const load = async name => {
  const response = await fetch('../articles/' + name);
  if (!response.ok) throw Error('Could not load ' + name);
  return response.json();
};
const preload = async src => {
  const image = new Image();
  image.src = src;
  await image.decode();
  return image;
};
function contacts() {
  function update() {
    const distance = Number(el('contact-distance').value);
    const waiting = el('contact-waiting').checked;
    el('contact-result').textContent = waiting
      ? 'The recipient belongs to a waiting group. This sharing call skips it, regardless of distance.'
      : distance < 50000
        ? `At ${distance.toLocaleString('en-GB')} units, the recipient gains awareness. The closer alert and eligible trigger path also runs.`
        : distance < 120000
          ? `At ${distance.toLocaleString('en-GB')} units, the recipient gains awareness. The closer alert and trigger path does not run.`
          : 'At 120,000 units, the strict range test fails. This call adds no awareness and does not run the alert or trigger path.';
  }
  for (const id of ['contact-distance', 'contact-waiting']) el(id).addEventListener('change', update);
  update(); el('contact-controls').hidden = false;
}
async function launches() {
  const data = await load('launches.json');
  const images = await Promise.all(data.variations.map(v => preload('../articles/mission-' + v.seed + '.svg')));
  function update() {
    const i = data.variations.findIndex(v => String(v.seed) === el('launch-variation').value);
    const v = data.variations[i];
    const model = v.actors.hercs[0].model.split('/').pop();
    const name = model === 'SCORPION.DTS' ? 'Stingrays' : 'Mongooses';
    el('launch-map').src = images[i].src;
    el('launch-map').alt = `B0_C6_1A variation ${i ? 'B' : 'A'}: original positions, with two ${name} marked A and B`;
    el('launch-caption').textContent = `Variation ${i ? 'B' : 'A'}: the HERCs marked A and B are ${name}. All plotted positions are retained in the other variation.`;
    el('launch-result').textContent = `${v.counts.hercs} HERCs, ${v.counts.flyers} flyers, ${v.counts.ground} ground actors. A and B use ${model}. Across the two captures, ${data.changed_herc_slots.length} HERC entries change chassis or weapons.`;
  }
  el('launch-variation').addEventListener('change', update);
  update(); el('launch-controls').hidden = false;
}
async function branches() {
  const data = await load('branches.json');
  function update() {
    const node = Number(el('branch-node').value), branch = Number(el('branch-result').value);
    const dest = data.destinations[node][branch];
    const result = dest === 99 ? 'campaign victory' : dest === -1 ? 'campaign failure' : 'node ' + dest;
    el('branch-destination').textContent = `After the last step in node ${node}, a grade ${branch ? 'above' : 'at or below'} the threshold leads to ${result}.`;
  }
  for (const id of ['branch-node', 'branch-result']) el(id).addEventListener('change', update);
  update(); el('branch-controls').hidden = false;
}
async function radar() {
  const data = await load('radar.json');
  await Promise.all(data.frames.flatMap(f => ['original', 'native', 'difference', 'full'].map(kind => preload(`../articles/radar-${f.key}-${kind}.png`))));
  function update() {
    const f = data.frames.find(r => r.key === el('radar-frame').value);
    for (const kind of ['original', 'native', 'difference', 'full']) {
      const im = el('radar-' + kind);
      im.src = `../articles/radar-${f.key}-${kind}.png`;
      im.width = kind === 'full' ? 320 : f.width;
      im.height = kind === 'full' ? 200 : f.height;
      im.alt = `DEMO${f.demo}, frame ${f.frame}: ${kind === 'difference' ? 'changed pixels in red' : kind === 'full' ? 'complete original frame' : kind === 'native' ? 'native crop with radar repair' : 'original DOS crop'}`;
    }
    el('radar-result').textContent = `DEMO${f.demo}, frame ${f.frame}: ${f.pixels} pixels differ in the complete 320 by 200 frame. All are inside this crop.`;
  }
  el('radar-frame').addEventListener('change', update);
  update(); el('radar-controls').hidden = false;
}
async function fade() {
  const data = await load('fade.json');
  function update() {
    const row = data.rows[Number(el('fade-step').value)];
    el('fade-value').value = String(row.step);
    el('fade-result').textContent = row.piece === 'B'
      ? 'Update 8: the patrol piece stops and the encounter piece starts at volume 100.'
      : row.volume === 0
        ? 'Update 7: the patrol piece has reached volume zero. The encounter piece starts on the next update.'
        : `Update ${row.step}: the patrol piece is at volume ${row.volume}. The encounter piece has not started.`;
  }
  el('fade-step').addEventListener('input', update);
  update(); el('fade-controls').hidden = false;
}
for (const [id, start] of [['contact-example', contacts], ['launch-example', launches], ['branch-example', branches], ['radar-example', radar], ['fade-example', fade]]) {
  if (el(id)) Promise.resolve().then(start).catch(() => {
    const note = document.createElement('p');
    note.className = 'example-note';
    note.textContent = 'The interactive example could not load. The static figure and explanation remain available.';
    el(id).append(note);
  });
}
