# Environment rendering

[The environment browser](../analysis/worlds/index.html) contains 240 recorded
320 × 200 frames produced by the original DBSIM renderer: ten views/layer
combinations for each of the 24 supplied WLD descriptors. They are controlled
background captures, without cockpit, terrain models, buildings or actors.
`tools/native_environment.py` supplies the established resource/VGA harness,
original Mode-X dispatch table, explicit camera and preference inputs.
`tools/capture_environment.py` regenerates the frames and cloud sequence.

The original background entry `0x25b68` draws sky/ground and the horizon
panorama, then clouds, then optional ground marks, then updates the view-dependent
palette band. Ordinary scenery and actors follow in a separate pass.

## Resource selection

`0x251c4` selects `WORLD(terrain*6 + time*2 + visibility).WLD` and the even
`WORLD(terrain*6 + time*2).DPL` palette. Terrain is desert, temperate, ice or urban;
time is day, dusk or night; visibility is normal or low. These are selected
mission conditions, not a continuous day/night cycle.

The WLD's five strings bind, in order:

| String | Consumer/resource |
|---|---|
| Horizon name, or empty | `DBA/WORLD*.DBA`, loaded by `0x26dc8` |
| Cloud bank | `DBA/CLOUDS2.DBA`, cloud constructor `0x271c0` |
| Impact palette | `DPL/IMPACT1.DPL`, loader `0x63584` |
| Ground image | `DBA/TRENCHES.64K`, raw 65,536-byte indexed texture |
| Ground distance table | `DAT/TEX.DAT` or `DAT/TEX_LO.DAT`, count followed by 32-bit thresholds |

Low-visibility descriptors omit the horizon panorama. All supplied descriptors
request twenty clouds and 250 ground-mark slots. `worlds.json` preserves every
field and the full resource names. The twelve opening signed words contain
horizon-band width; sky palette start, step and count; ground palette start,
step and count; horizon offset; ground-mark colour; a retained word at offset
18; and the two palette endpoints used by the view-dependent reflection band.
The word at offset 18 is passed to `0x6cf8`, which selects the secondary ground-effect model
`FLAT.DTS` (zero) or `FLAT2.DTS` (nonzero); it is not part of the background palette-cycle pointer.

## Sky and distant horizon

`0x26264`/`0x2627f` build the rolled horizon from camera pitch, roll and viewport
settings. `0x2650b` and `0x267d7` draw the palette bands. The lower-detail
polygons already have independent full-frame checks in `check_background_raster.py`.

`0x26ac5` scrolls the panorama's bitmap strip according to unsigned heading,
wrapping across the DBA's frames. It uses plain bitmap drawing for zero roll
and rotated bitmap drawing otherwise. The panorama overlays the background
bands/ground texture; it is not terrain geometry placed at a finite distance.
Preference byte `0xbd565` independently enables it.

## Ground detail

The preference initializer `0x4afe8` establishes threshold **240** at `0x956be`.
Ground-detail byte `0xbd567` selects three cases:

- **Below 240:** gradient ground plus a fraction of the 250 generated marks.
  The active count is `floor(250 * detail / 240)`.
- **Exactly 240:** gradient ground, without marks or the ground texture.
- **Above 240:** the projected `TRENCHES.64K` texture, when the sky object's
  texture-enable flag is set. Values 241–255 select the same texture path.

`0x29120`, `0x28fbc` and assembly sampler `0x2991d` perform the high-detail
projection and palette translation. The 256 × 256 source uses indices F0–FF.
Camera heading rotates its sampling axes; camera height and horizon position
control perspective. World X/Y wrap to their low sixteen bits. Translating the
camera by 65,536 units in both axes produces an identical cloud-disabled
background in **all 24** native captures.

The texture has its own fifteen distance-translation rows. `0x28de8` builds
these from the WLD ground band; `TEX`/`TEX_LO` select the row by distance. This
is separate from the model textures discussed in LIGHTING.md: those retain
brightness with object distance, whereas this ground texture does receive its
own distance treatment.

Ground marks (`0x26edd`, `0x26fdd`) are generated with the secondary RNG around
the initial camera, at Z=0. Points more than 70,000 units away after camera
movement are reflected around the old/new camera midpoint to recycle the field.
Within 30,000 units a mark gains a second pixel; within 20,000 it gains three
more, with two darker palette entries. They are not authored map objects.

The banked full-screen inspection fixtures retain some pixels that the original
background routine leaves untouched (counts are recorded per frame). The
capture clears these to black, so their gaps remain visible. This establishes
the isolated routine's coverage under this viewport; it does not establish that
the same pixels are visible through the actual cockpit or in every game view.

## Clouds and update clocks

The cloud object uses vtable `0x928f6`; `0x27c00` initializes its random field and
wind, and `0x27d78` advances/draws it. Cloud-detail byte `0xbd566` controls the
active count: `floor(20 * (detail + 1) / 256)`. Initialization still takes place
when that count is zero, so disabling clouds does not remove all their initial
secondary-RNG consumption.

Wind is chosen once using the secondary RNG. The native code chooses a speed
from 50–149 and an angle, then produces the horizontal fixed-point components.
Each draw adds that vector to the active clouds. It does **not** multiply by
the simulation's Q8 frame ratio. Clouds recycle around a moving camera with
hysteresis. Texture choice and visibility/distance behavior remain original
methods, not browser particle approximations.

The retained animation records 120 calls, sampling every fourth. Its 100 ms
GIF delay is chosen for inspection and is explicitly not a measured game rate.
All gallery comparisons restore the initialized cloud/point field so that
changing layers does not accidentally advance the wind. Capture seed 17 means
17 warm-up steps of the original secondary generator, not a recovered TAP seed.

## Palette changes and optional cycles

`0x25fe1` changes palette entries **64–79** with camera pitch when its gate is
enabled. It interpolates sixteen endpoints between the WLD's two selected
colours, chooses `min(15, uint16(pitch + 8192) >> 10)`, and builds a ramp from
the cached original colour 64 to that endpoint. The override at `0x928ee` can
supply one band directly, after which it resets to -1. Damage's impact mode uses
colour 98 instead, alongside the separate impact palette swap.

The original fixed-point interpolation truncates signed Q8 component increments
and shifts each accumulated component separately. `check_environment_palette.py`
independently matches ten pitch inputs, the one-shot override and impact mode
for all twelve supplied palettes. These are palette responses to view and damage,
not a clock that changes the mission's time of day.

`0x2e17c` starts the player's impact flash for 60 UI-clock units; `0x2e1d7` toggles
it at secondary-RNG intervals below ten and displaces the cockpit panel. View
mode 4 suppresses it. The palette paths are also gated while the separate
cockpit/view fade routines own the palette.

The renderer retains optional `WORLD*.CYC` support, but **none of these files
exists in the supplied volumes**. Each six-byte record contains start index,
colour count and period; `0x281cc` registers at most five. `0x28260`, called at
frame presentation, acts only when `next_due < clock`, then schedules
`clock + period`, discarding overshoot. It rotates from the current mutable
palette by an increasing offset; its first event uses offset zero. A labelled
synthetic four-colour record independently verifies that behavior and removal.
No artificial cycles are added to the real world previews. The unused file
loader advances its record pointer by twelve while allocating six bytes per
record; this legacy inconsistency is retained in the notes, not exercised with
invented multi-record game content.

Remaining composition work concerns moving actors, effects and full recorded
mission replay. These environment captures do not claim that end-to-end loop.

## Main-view cloud animation and complete horizon inspection

The world browser now animates the selected camera view directly, with pause
and frame scrubbing. export_environment_browser.py records thirty frames for
each of eight cloud-enabled views/layer settings in all 24 worlds: 5,760 frames.
Each displayed frame represents four original cloud draws; the chosen 100 ms
playback delay remains an inspection speed, not a measured game rate.

The exporter restores a cached native background, sets the original camera and
calls native cloud entry 0x27d78. Unsampled calls execute the original movement
and omit drawing only; the camera is stationary. First and last images of every
sequence are compared pixel-for-pixel with the complete environment entry.
The first also matches its existing capture. check_environment_browser.py
verifies every saved atlas frame and checks the original stills and palettes.

The full 360° option unfolds the four 320-pixel horizon sections, over original
level sky/ground bands, into a 1,280 × 200 strip. Original heading scroll moves
the strip right as heading increases, so the contiguous stored order is captured
at headings 0°, 270°, 180° and 90°. It is an inspection layout, not a perspective
camera stretched across 360°. Clouds and perspective ground remain in the camera
views; low-visibility worlds correctly show bands without a horizon bitmap.

The old quarter-turn choices were a small set of recorded viewpoints, not a
limit imposed by the game. The earlier temperate-only cloud GIF remains an
archived reference, but has been removed as a separate viewer panel.


## Native horizon integration

The C++ flight view now draws the original panorama over the established sky/
ground bands and respects the shell's horizon-detail setting. Its placement
retains unsigned-heading wrap, the original fixed 320-pixel strip walk, pitch/
roll offsets and separate level/rotated bitmap paths. Rotated quads use geometric
width/height but source texture endpoints width-1/height-1; the original affine
mapper handles their transparency and cockpit scan direction.

capture_panorama.py records 576 original full frames and every bitmap placement
across all 24 worlds, varied heading/pitch/roll and rectangular viewports.
capture_cockpit_panorama.py adds 96 complete frames through all 32 original
cockpit windows/masks. Native C++ matches all pixels and recorded placements.
The captures run original background and bitmap code with file/heap/VGA
transport supplied; cloud, ground-mark and high-detail ground-texture layers
are excluded from this fixture and covered by the combined environment
comparisons below.

The original panorama loop assumes a positive horizontal stride. Inverted or
exact quarter-turn roll can make its progression invalid; native placement
reports that domain rather than looping indefinitely. These probes cover the
ordinary positive-stride roll range, not that invalid original endpoint.

## Native cloud and mark integration

The native implementation now preserves the original cloud and mark fields,
not just their appearance. capture_ground_marks.py records 224 complete frames
and every point/anchor/RNG state across four terrain families. capture_clouds.py
records 144 full frames / 501 draws, with positions, hysteresis flags, wind,
texture choice and complete RNG states. Native output matches every record,
including both cloud faces, near clipping and original cockpit masks.

Clouds consume eight random ring offsets inherited from their base class, but
the derived distance callback at 0x25a50 is empty. These offsets do not change
their geometry. All twenty slots recycle with camera movement even when inactive;
wind moves only the active subset. Marks differ: only active slots recycle, and
detail >= 240 retains their previous anchor and active count. Both fields still
initialize at zero detail, so their initial random draws must be preserved.

## Ground projection context correction

The high-detail ground sampler reads the viewport's stored origin directly,
whereas sky, horizon and clouds use the derived projection centre. Original
0x5bf68 establishes centre = bounds.top_left - origin. The earlier isolated
environment harness supplied the derived centre but left that origin zero;
this compressed the ground perspective in its high-detail previews. The harness
now supplies the matching (-160,-100) origin for its full-screen camera, and
all 24 complete horizons and 5,760 original cloud-animation frames have been regenerated and verified. Cockpit captures additionally
derive the origin from each authored window. Geometry/model analysis is separate.

The new ground-texture comparison also preserves the original cached scanlines:
height, pitch, row-count growth and horizontal scroll invalidate the cache;
viewport, projection shift and shorter row counts do not. Its scratch-bitmap
stride survives a return from banked to level view. These are renderer state,
not an opportunity to replace the original with a generic perspective texture.

## Complete native environment comparison

capture_environment_composition.py executes the entire original 0x25b68
environment draw with all layers and reflection updates enabled. Native output
matches all 288 frames across 24 worlds, full visual RNG state and palette
entries 64..79. Cameras, viewport masks, detail thresholds, panorama toggles and
projection offsets vary sequentially. The isolated ground sampler additionally
matches 480 full frames and scratch bitmaps. Reflection checks cover 144 original
pitch, one-shot override and impact palettes. Impact timing, camera disturbance and the full simulator frame owner are
integrated; see the impact checks below and RUNTIME.md.


## Cockpit impact flash and displacement

Player torso/head damage that changes its condition band calls DBSIM 0x2e17c.
This is a cockpit effect, not a general world-camera rotation: the outside
projection stays fixed while the retained panel, clipping spans and widgets move
vertically. Initial displacement stays within five pixels (upward on the forward
and side views, downward on the lower panel). Forward/lower views expose adjacent
artwork in the shared VGA surface; side views clear the exposed strip to index 63.
Original frames for all four views are in analysis/cockpits/impact/index.html.

The effect owns a 60-unit UI-clock deadline. Repeated damage extends it without
restarting the random sequence. Each active update chooses an unsigned 16-bit
secondary-RNG value modulo five for motion. A strict clock > next-toggle test
swaps palettes and draws a new modulo-ten interval. Expiry is cleared first;
restoration happens on the next update. Mode 4 suppresses the effect. The authored
IMPACT1.DPL is loaded unchanged; reflection entries 64–79 still use the separately
cached base/impact endpoint, and shield indicator colours continue to update.

Original 0x243d4/0x24564/0x24750 move the two VGA page origins, subtract displacement
from both rectangular and span-list scene clips, and translate the widget owner.
View changes restore the old view (0x222c0), then resume with a ten-pixel range
(0x242f6); external view cancels that resumption. Palette ownership and a pending
view transition have separate gates.

capture_cockpit_impact.py records 5,005 original calls over 50 scenarios. The native
owner agrees on both clocks, palette identities/flags, page origins, clip regions,
widget translation and every secondary-RNG word, including repeated hits, view
changes, suppressed effects, zero-clock sentinels and unsigned wrap. Graphical
page save/copy and widget translation are explicit capture boundaries; original
clip mutation executes unchanged. Separate initialized-original captures show
complete images in each view. Whole-game frame scheduling is compared in the complete replays described
in RUNTIME.md, alongside these controlled impact updates.

## Cockpit layout offset at the environment call

Original 25b68 passes afa9c/afaa0 to 26264. These are the authored VUE
instrument origins, independently of the already shifted world projection
centre. Forward uses (0,0), side panels use (+320,0) and (-320,0), and lower
views retain their authored vertical offset. The side-view camera capture in
analysis/cockpits/view-camera.json records both fields. Supplying only the
shifted projection centre leaves part of the side-panel sky unpainted; the
native mission caller has been corrected to supply both original inputs.


## World-selected ground-effect models

World descriptor word 18 selects FLAT.DTS when zero and FLAT2.DTS otherwise
(original loader 6cf8). The mission effect owner now uses that selector for both
HERC ground attachments and secondary explosion models. Previously it always
loaded FLAT.DTS, leaving bright orange shadows in worlds that require FLAT2's
palette index 224 instead of 240.

Three independent original DEMO2 regions cover the corrected shadow in the
centre and at both viewport edges (frames 900, 960 and 1740). They match exactly;
the largest complete sampled DEMO2 difference falls from 195 to 90 RGB pixels.
These regions join the existing original replay scene fixtures.


## Ground projection at lookup-table boundaries

Original 28fbc builds a negative-pitch rotation with 694b8 and transposes that
same quantized matrix with 63df0 for the inverse. Recomputing a positive-pitch
matrix instead changes the result at the cosine table's rounding ties. This
caused 61 different scratch-texture pixels at the DEMO3 frame-1320 camera pose.

The native ground projector now transposes the existing coefficients. The
independent capture_ground_replay_precision.py fixture checks 66 complete
original ground frames and sampler bitmaps, covering that replay pose and
neighbouring positive/negative rounding boundaries at several headings.
All agree. The complete sampled frame now differs by only three RGB pixels;
that count includes other scene elements and is not a whole-frame equality claim.
