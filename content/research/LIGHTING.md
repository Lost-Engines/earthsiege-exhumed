# Original lighting

The analysis viewer uses the original persistent directional light, created by DBSIM `0x5a888`: intensity **256**, world direction **(-1099, -984, -1421)**. The initializer rotates (0, 2048, 0) by the original Euler/table routines with angles (-8000, 0, 24000); the resulting vector is retained unchanged. It is registered both with the active renderer and the persistent-light list. This replaces the viewer's earlier invented direction and ambient/brightness curve.

`check_lighting.py` executes original code with only host memory allocation. `check_lighting.js` independently checks the viewer implementation against **16,896** original intensity results and **512** light transforms. The data includes ambient, directional, positional and combined lights, forward/back normals, saturation, integer division and overflow edges. These probes isolate lighting. Complete native-frame comparisons are documented separately in PIXEL_FIDELITY.md.

## Light records and intensity

The packed renderer light has world position at +0 (three signed 32-bit coordinates), world direction at +12 (three signed 16-bit components), vtable at +18, type at +22 and intensity at +26. Object-local copies begin at +30 and +42. Positional lights additionally have attenuation offset at +52, attenuation scale at +56 and a cached intensity/scale product at +60.

The active renderer accepts at most **10** lights. `0x5ba84` rejects duplicates and additions when full; `0x5bad4` removes a light by replacing its slot with the last entry. The separately verified gameplay light manager owns twenty effect-source slots; the ten active renderer slots are not the total number of effects in the game.

`0x5c140` transforms lights into object coordinates using the inverse rigid object transform. `0x5b8b4` uses a 32-bit position transform and a rounded Q14 rotation of the signed-short direction. It does not renormalize the result.

- Type 0: add the ambient intensity.
- Type 1: model routine `0x5bc30` computes `q = (dot(normal, direction) - 4194304) >> 1`, then adds `-(intensity * q >> 22)` when q is negative. This wraps the directional response around the object: a perpendicular face still receives half the directional intensity.
- Type 1 in terrain/32-bit-position routine `0x5bdd8`: use the unmodified dot product, adding directional intensity only when that dot product is negative.
- Type 2: use the original fast distance estimate and positive normal/light dot product, then the original two integer divisions for attenuation. The unoriented consumer `0x5bb24` uses incidence 2047 and takes directional intensity directly.

The distance approximation is largest absolute component + 11/32 of the middle component + 1/4 of the smallest, with each shift performed separately. Multiplications and accumulation retain original signed 32-bit wrap behavior. The final accumulator has an upper clamp of 255 and returns its low byte; it is not a generic lower-and-upper floating-point clamp.

Back-facing polygons negate their original normal, including signed-short behavior, and run the same light calculation. Treating back-face brightness as `1 - front brightness` is incorrect when multiple lights, ambient terms, fixed-point rounding or saturation are present.

## Viewer and remaining boundaries

The model and scenery browsers apply this default directional light. Full-bright mode in the model browser uses an explicit 255 ambient light for examining artwork. The model browser also offers the original day, dusk and night mission conditions, described below. Gouraud polygons evaluate the original per-vertex normals; textures use the previously captured eight native remap tables. Palette-index interpolation retains the quantized palette.

The viewer still uses WebGL depth-buffer triangle rasterization. Dynamic effect-light selection is now independently checked below. Exact original spans/outlines and whole-scene painter ordering remain separate consumers. A default-lit inspection of an asset is therefore not presented as a pixel-perfect screenshot of the game.

## Dynamic effect-light selection

`tools/check_light_manager.py` checks 456 original object-dependent selections, allocation reuse, source release and both capacity limits. `0x4bb8` creates a twenty-source manager; `0x4dfc`, `0x4f34` and `0x4dc8` set source position, intensity and attenuation parameters. Default attenuation arguments 3000/2000 are each shifted right by five, retaining that quantization.

Before drawing an object, `0x4f78` uses the object's center and bounding radius. It removes sources outside their intensity-derived range. For sources in range, the original integer angle comparison at 8000 turn units selects a directional approximation when the object subtends a sufficiently small angle. Otherwise the source remains positional. Directional intensity is attenuated using the center distance; its direction is the object-minus-source vector scaled by 2048 over the original approximate distance. The point-light form retains the source position and the quantized attenuation values shifted back left by five. Neither form uses a normalized floating-point vector.

The manager reuses cached directional and positional renderer-light allocations as a source changes form. Source-list removal uses swap-with-last. The renderer still admits only ten lights: with the persistent light already registered, nine effect lights are admitted in the original source iteration order. No nearest-light sort is invented. The twenty-source limit is the allocated manager capacity; the allocator itself lacks an established safe overflow branch and fixtures do not write past it.

`0x20f40` invokes this selection before drawing a model. The separate `0x5194` consumer requests positional lights within an explicit range; its complete runtime use is not yet established. Explosion updates change intensity according to their authored cell frame. These findings describe the manager's original approximation, rather than a viewer approximation of an otherwise exact light model.

## Native integration

`capture_effect_lighting.py` adds 3,250 live original operations across allocation,
intensity/attenuation changes, release and repeated object selection. The C++
manager agrees with these and the 456 isolated selections. Game initialization
uses attenuation arguments **2000/10**, rather than the constructor's 3000/2000;
quantization makes the live game's offset zero. A zero source intensity skips
selection without unregistering an already cached light, and allocation writes
the short intensity before its separate selection cache is updated by the setter.
Source reuse and renderer saturation preserve those stateful details.

`capture_effect_render.py` supplies 72 complete original effect/scenery frames.
All eighteen explosion definitions, their authored texture banks, shared-random
debris, light ownership and changing animation cells are exercised. C++ matches
every VGA pixel. The secondary flat effects are drawn oldest-first **before**
the terrain/actor sorting pass, within a strict 30,000-unit camera distance. Their
draw method sets stored Z to zero; they are not sorted as ordinary explosions.

## Preview material interpolation correction

The browser used interpolated floating shader attributes for flat palette
indices, texture IDs and texture-lighting rows. Truncation could turn an otherwise
constant value into the preceding integer, producing spurious stipple. These
attributes are now flat; only Gouraud palette-index shading and texture
coordinates interpolate. A constant-colour regression removes 15,573 incorrectly
coloured pixels from a 155,141-pixel test face. This changes only inspection
rendering; the original software raster and native C++ implementation did not use
this shader path. See MODEL_BROWSER.md.

## Mission-condition presets in the model browser

The Lighting selector now offers **Day**, **Dusk** and **Night**, alongside the
original directional and full-bright inspection modes. Mission modes expose
**Environment** (automatic, desert, temperate, ice or urban), **Visibility**
(normal or low), and **Shading distance**. These select actual game data; they
do not invent different sun directions or multiply the final RGB values.

The manual's single-mission options identify DAY/DUSK/NIGHT and NORMAL/LOW
visibility. In SCRIPT.DAT, word 9 selects the time palette and word 8 selects
visibility. DBSIM `0x251c4` chooses:

- DPL palette: `terrain * 6 + time * 2`.
- WLD descriptor: `terrain * 6 + time * 2 + visibility`.

Thus WORLD0/1 are desert day with normal/low visibility, WORLD2/3 desert dusk,
and WORLD4/5 desert night. The other environments repeat these six combinations.
The adjacent WLD files are **visibility variants, not day/night partners**;
earlier scenery notes mislabeled this distinction. The persistent directional
light remains intensity 256, direction (-1099, -984, -1421). Colour ramps and
native texture-lighting remaps come from the selected palette and descriptor.

Shading distance runs the original `0x25cb4`/`0x25d44` band selection and class
bindings, including the size-dependent offsets for buildings. HERCs and their
mounted weapons use class 7, flyers class 6, buildings class 5 and terrain
class 0. Original constructed-actor captures establish those numeric classes.
Standalone resources without a verified binding use the palette only and say
so; the viewer does not guess their gameplay parent. All sixteen shade bands
are available. The displayed distance scale follows the original waypoint
HUD (`0x34800`): 1,000 world units correspond to six metres, with the original
readout rounded to those increments.

The inspection camera, animation, selected LOD and displayed model size do not
change with distance. Beyond the original cutoff, a note says the model is
retained for inspection. Near distance is the default. Automatic environment
selection follows the terrain model, falling back to desert for other assets;
an explicit environment stays selected across model changes. Selecting a new
mission preset/environment restores its matching palette; the advanced palette
selector can then override it, with an explicit override note. Static thumbnails
retain their usual fixed daytime inspection settings.

`tools/build_browser_world_data.py` exports the original generated ranges and
checks **2,390** non-highlight-split native captures in all 24 worlds, plus the
144 previous near-distance bindings. `tools/check_browser_world_shading.js`
independently compares the browser consumer to those captures, including ramp
contents, band thresholds, building offsets and cutoff boundaries, and checks
that shared source palettes are unchanged. `tools/check_model_lighting_browser.py`
checks all 24 UI combinations through local-file and HTTP loading, actual GPU
brightness changes, camera preservation, palette overrides, HERC/flyer bindings
and restoration of both inspection modes. The retained hangar examples are
[day](../analysis/models/lighting-day.png),
[dusk](../analysis/models/lighting-dusk.png) and
[night](../analysis/models/lighting-night.png).

These modes reproduce the mission palette and distance treatment within the
existing inspection renderer. They do not add the mission's sky, clouds,
dynamic weapon/explosion lights or the original software raster coverage.

## Textures do not receive distance haze

The distance slider exposes an original renderer distinction: shaded and Gouraud
polygon colour ramps converge towards their far-distance colours, while textured
faces retain their ordinary light-level translation. Day/dusk/night palettes and
light direction still affect textures; object distance does not fade their pixels.

Original `0x20f40` calls `0x25d44` before the object's draw method. That routine
rewrites the SHADES.DAT-selected material ramps through `0x28044`/`0x280e4` and
`0x691f8`. Textured polygon method `0x5410c` instead chooses one of the eight
palette-derived translation tables at `0x973f0` using the result of `0x5bc30`:
`floor(7 * light_intensity / 255)`. It does not read the object's distance or those
modified material ramps. Table generation `0x28b28` is separate from the per-object
distance update.

`tools/check_distance_textures.py` executes the original world loader, distance
binding, complete model drawing and VGA writers. It holds geometry and camera
fixed while supplying distances selecting bands 0, 4, 8, 12 and 15, all within
their original draw cutoffs. Two auxiliary renders with marked texture translations
identify visible textured pixels; the measured renders restore the original tables.
Across all five bands, **914 hangar**, **2,785 listening-post** and **1,995 Samson**
texture pixels are individually identical, while untextured pixels change. The
texture tables themselves also remain byte-identical. This verifies 15 comparison
frames, not just the modern renderer's intended behaviour.

[Native results](../analysis/models/distance-textures/native-comparison.json)
retain the counts and checksums. Original hangar frames at
[near distance](../analysis/models/distance-textures/herc-hangar-band-0.png) and
[the final shade band](../analysis/models/distance-textures/herc-hangar-band-15.png)
show the decal retaining its colours. These are controlled original-executable
inspection renders, with projection deliberately held constant. Normal gameplay
also changes apparent size, selects detail levels where available and eventually
culls the object. The model inspector keeps size and detail fixed, making this
colour mismatch conspicuous. The browser deliberately retains the original
texture behaviour.
