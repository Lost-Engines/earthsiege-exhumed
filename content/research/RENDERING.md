# Original software rendering

The native renderer reproduces the original fixed-point projection, painter
ordering, palette shading and span drawing. Component captures and complete
recorded frames check the result; [PIXEL_FIDELITY.md](PIXEL_FIDELITY.md) records
the final image comparison. The WebGL browsers use the recovered geometry,
materials and lighting for inspection, with depth-buffer triangles in place of
the game rasterizer.

## Projection and near clipping

`check_projection.py` records 3,200 polygons through model projection
0x5c5d4/0x75a28 and camera-space terrain projection 0x5c9bc. Coordinates are X
horizontal, Y forward, Z up. Perspective uses a power-of-two focal scale;
shift zero selects parallel projection with a separate divisor. Signed shifts,
divisions and coordinate sums retain their native wrapping/rounding order.

Models classify depth equal to the near plane as clipped; terrain retains it.
Clippers 0x5cc4c, 0x5ce10 and 0x5d06c respectively preserve flat geometry, texture
coordinates and vertex-light intensities. Their intersection output assumes
near distance equals the focal scale: it adds the screen centre directly to
intersection X/-Z. The tests include nonstandard pairs to keep that assumption
visible rather than silently substituting a general projection.

## Flat polygon coverage

`check_viewport_clip.py` compares 6,000 results from 0x788e4. It clips an entire
horizontal slab, then a vertical slab. Each crossing is calculated from the
outside endpoint, with a 64-bit product and truncating division. Four independent
half-plane passes can change rounded corners. The original function expects at
least two input points; isolated points use a separate drawing path.

`check_polygon_edges.py` compares 5,999 edge tables from 0x76f54. Top and bottom
ties select opposite horizontal extremes. Each authored chain uses integer
Bresenham stepping, with different traversal directions for shallow left/right
edges. Span endpoints and the final row are inclusive. These details affect
shared edges and one-pixel silhouettes.

`check_solid_raster.py` runs the complete original polygon path through the VGA
adapter, including 0x68fdc/0x68be0/0x8aef8. All 64,000 indexed pixels match the
independent reconstruction in 360 cases, including both windings and viewport
crossings. C++ tests retain the resulting full-frame checksums.

## Texture mapping

Original 0x534ac uses affine interpolation with signed Q16 steps and nearest
magnitude division. It clips above the viewport first, retaining texture
coordinates, then walks paired monotone edges. Ordinary rectangular views use
columns; cockpit clipping-region mode uses rows. Both span directions sample
from a half-step offset, round texture coordinates and use inclusive spans.

`check_texture_raster.py` captures 600 complete original rasters in both modes;
`check_texture_math.py` independently reproduces all of them. C++ uses the same
verified rules. Row fixtures currently use a single rectangular clipping region;
the integrated environment, cockpit and full-frame comparisons cover multiple regions and cockpit masks separately.

Without a lighting translation, texture index zero is transparent. With a
translation, every texel is written, including translated zero. The browser
shader now preserves this distinction. This was confirmed in both original
writers, 0x7394a and 0x735a4.

## Gouraud palette bands

Original 0x7965c first maps each vertex intensity through its material's shade
ramp, then splits the polygon into a triangle fan. For each triangle, 0x78ccc
constructs solid-colour bands between successive palette indices. It samples
integer edge positions independently for each band; the ordinary flat-polygon
rasterizer fills each strip. Equal-colour triangles use one solid fill.

`check_gouraud_bands.py` matches every emitted primitive for 6,000 original
triangles, including equal-colour vertices and duplicate-point degenerates.
This is more specific than generic palette-index interpolation and can differ
at band boundaries. The browser's WebGL interpolation remains an inspection
approximation of those pixels.

## Complete models and auxiliary raster paths

`native_model.py` executes complete original model drawing, including original
resource readers, instance construction, articulated transforms, light transforms,
mesh/part BSPs, cell/detail selection, projection and pixel writers. Only file
transport, allocation and VGA memory/ports are host boundaries. Whole-object
bounding rejection is disabled for these isolated captures.

`check_model_render.py` captures all 401 roots across all 44 supplied model
resources from eight orientations: 3,208 complete 320×200 frames. Each frame
currently agrees with the integrated C++ renderer at every indexed pixel. These
use isolated default instances. Complete gameplay scenes are checked separately in PIXEL_FIDELITY.md.

The original back-face helper reverses projected positions but leaves Gouraud
intensities and translated-texture UVs in place. Only its untranslated style-5
texture path reverses UVs. The C++ material consumer preserves that distinction.

`check_line_raster.py` records 6,000 complete line rasters and clip results. Line
clipping visits top, left, bottom and right, swapping the outside endpoint into
the first slot before calculating each rounded intersection. Native line pixels
use inclusive `(dx+1)/(dy+1)` stepping rather than a generic Bresenham substitute.

`check_bitmap_raster.py` records 500 scaled transparent bitmaps. The native
scaler adds one to its truncated Q16 sampling step, uses 65535 for the vertical
advance denominator, and includes bottom cropping in the initial fractional
carry when top-clipped. The C++ scaler preserves these original rules. Billboard
size/anchor calculations use the original radius, Q8 scaling and strict
near-plane test; billboards 200 pixels or larger are omitted by the original.

`check_animated_render.py` applies 512 retained original channel states through
0x62dfc/0x61810 before complete original drawing. All 512 match C++ at every
pixel. This caught a Roadrunner projected texture quad with a backward edge:
the original accepts negative edge lengths and keeps stepping until the other
edge ends, the spans cross or the viewport ends. Rejecting all nonmonotone
polygons was too strict; the C++ mapper now retains the original signed steps.

## Whole-scene painter order

`check_scene_order.py` independently reproduces 2,000 original `0x21bec`/`0x21c60` insertion trees. Extended scenery is inserted before ordinary point objects; nodes are then visited left/object/right. The per-terrain 24-byte records are two local line-segment endpoints, not arbitrary shading metadata. A negative first endpoint Z disables their use. Original `0x206c8` transforms both endpoints into world space. Overlapping objects use observer-relative separating planes, with original repeated integer halving and cross/dot operations; simple cases fall back to centre distance. The C++ implementation matches every captured order. This supplies the scene ordering boundary; environment shading and cockpit masks are verified separately and integrated in the complete-frame comparisons.

## Complete static-world integration

The native C++ scenery path now matches all 288 complete original frames and
painter orders across 24 environments. `tools/check_scenery_render.py` executes
`0x21008`, retaining the `0x20f40` callback order and all VGA pixel writers.
Mission headers select terrain; the stored zone terrain word is not authoritative.
The comparison includes world transforms, authored sorting segments, distance
culling and per-object palette ramps. It deliberately isolates scenery from the
sky/ground plane, moving actors, cockpit and whole-object bounds rejection.

The distance path has another 4,800 comparisons across all 24 WLD descriptors.
`0x25cb4` selects a shade band, `0x25f38` applies distance culling and `0x25d44`
changes only the palette slots mapped by SHADES.DAT. Class 0 uses the longer
terrain distances. Class 5 adjusts both shade and cutoff distances by the small
or large model offset (radius threshold 5000); class 8 adjusts only its cutoff
and always uses the small offset. A band boundary advances at equality, whereas
the final cutoff rejects only distances strictly beyond the last boundary.

## Sky and ground palette bands

Original `0x26264`/`0x26348`/`0x2650c`/`0x267d8` now have 2,400 retained
cases across all 24 environments, with original panorama and ground-texture
switches disabled to isolate the low-detail gradient path. The 2,111 defined
cases agree with native C++ horizon geometry and every emitted primitive;
503 also match all VGA pixels. `check_background_bands.py` captures commands;
`check_background_raster.py` executes the unchanged VGA writers as well.

The first eight WLD shorts are horizon band width, sky palette start, sky
step, sky band count, ground palette start, ground step, ground band count,
and horizon offset. Level views use clipped rectangles; rolled views use
quads plus a final viewport-corner polygon. Sky polygons reverse their
vertices through `0x68f43`; ground polygons keep their order through `0x68be0`.
The rectangle path shifts an offscreen horizontal edge along with its vertical
edge. The C++ implementation retains that behavior rather than normalizing
all gradients into one new raster algorithm.

Two original edge cases are explicit. The inversion test zero-extends pitch
then compares it with signed -16384, making its inversion branch unreachable.
At a zero cosine, the code samples pitch minus one native angle unit; rounding
can select the same zero table entry again. The original then divides by zero
at `0x26420`. The 289 such test cases are recorded as faults, not as valid
render references. C++ reports a domain error for that undefined input instead
of invoking undefined division. These deliberately extreme test angles do not
establish that ordinary HERC camera controls reach this boundary.

## Armed HERC models

`check_assemblies.py` now retains complete weapon trees: 808 nodes and 10,513 points across 32 starting external weapons. Geometry translation includes invisible helper polygons; their vertices still move even though they are not drawn. Normals remain unchanged. The runtime substitutes a weapon wrapper into the body placeholder; that wrapper owns its cell indices and switches to WPNTEX before drawing its shape. Body and weapon skeleton state are shared, while template geometry is cloned for each mount.

`check_armed_model_render.py` runs these original constructors, node bindings, replacements and complete VGA drawing for all eight playable chassis. C++ matches 384 complete frames: starting and empty loadouts, eight default views and sixteen recorded animated poses per combination. World culling, combat damage and firing remain outside these isolated assembled-model captures.

Top-level actor model selection (`0x2b30`) is distinct from nested 3Space detail parts. HERC thresholds are 75, 60, 45, 25, 18, 12 and 6 projected units. Radius-adjusted approximate eye distance, Q10 quality scaling and a minimum-detail bias choose the root; the bias advances the initial model index without advancing the threshold pointer. `check_actor_detail_render.py` captures 768 original selections and complete frames, all matched by C++, including original cross-detail skeleton bindings and mounted weapons.

## Mixed scenery and roster HERCs

`check_mixed_scene.py` runs complete original world drawing for 64 views over the four demo starts, with their constructed and armed player-roster HERCs explicitly in the draw list. The native C++ path matches all pixels and painter orders, combining scenery segment ordering, actor distance/LOD selection, texture switching and per-object palette ramps. This isolates drawing; it does not treat every constructed actor as active or replace group activation.

The scene harness now uploads the full DPL ramp table using `0x691f8` (the palette-install step used by `0x6931c`) before drawing. The earlier static-only harness installed only ramps rebound by distance shading. On HERC material 200, that omission read a null ramp pointer and returned byte 0x55 from executable address zero instead of the DPL's black. This was a reference-setup defect, not an original material or a C++ lighting discrepancy. The corrected captures retain the actual DPL entry.

Runtime class 5 is a fixed ground target; HERCs use class 7. The size-dependent distance offsets apply to class 5. Earlier C++ code named that numeric constant incorrectly; the behavior was unchanged.

## Native cockpit masks and view projection

The C++ port now matches 96 complete model rasters through all 32 cockpit ED
masks (`analysis/cockpits/masked-models.json`). A rectangular region clips solid
polygon vertices before constructing Bresenham edges; a curved region intersects
the completed row spans. Replacing both with final pixel clipping changes edge
rounding and Gouraud palette bands. Textures use row traversal in mask mode;
their rectangular regions clip spans, not polygon vertices.

All eight GAU layouts, 32 artwork selections, chassis palette overrides and view
projection centres are checked against original consumers. `0x5bf68` computes
centre = viewport top-left minus (VUE projection origin + canvas origin).
Side windows therefore continue the forward perspective plane instead of yawing
the camera. `check_cockpit_scene.py` captures another 64 complete native scenery
frames through every view; backgrounds and live instruments are separate here.

## Analysis-browser texture distinction

The WebGL inspector now uses whole-polygon column interpolation for texture
coordinates instead of interpolating independently across triangle diagonals.
This fixes the bent stripe textures on BASES_AE's gun tower and listening post.
A small textured-face depth priority avoids coplanar decal conflicts such as
BASES variant 4's “11”. Browser coverage remains WebGL/depth-based, and span
coordinates remain continuous rather than the integer VGA sampler described
above. The authentic native renderer required no corresponding change.
See [MODEL_BROWSER.md](MODEL_BROWSER.md) for captures and verification scope.


## Retained external cameras and world draw ownership

All four complete demo comparisons now include 24 camera components on every
observed initial/frame/exit state: 7,032 states in total. ESRPLY09 stores these
expected results separately from the TAP inputs. They are checked after native
execution, never supplied to the camera. The captures are
demo1-camera-playback-v3 through demo4-camera-playback-v3, made with the unchanged
game and passive DOSBox observer, sound enabled and startup/radio clocks retained.

Original 5894c changes camera ownership after player controls and before the
camera transform. 58a44 retains an existing camera for its target. The first
orbit starts at distance zero and clamps to 2,500 on update; later cockpit/orbit
switches retain distance, orbit angles and rates. The previous integration
recreated it at distance 10,000 and switched one presentation too early.
Player control routing also finishes after a Q dialog accepts exit; the outer
frame then leaves before perception/power. This includes the final camera-rate
update even though no further camera transform or world draw occurs.

The external viewport is (0,30)-(319,170), with projection centre (160,105).
Its rectangular clip region selects row-based texture traversal, just like the
cockpit masks. Using column traversal caused visible texture and cloud
differences. Original 58b68 places GREEN6X8 labels at x=50/215, baseline 189,
using STRINGS0 groups 14 and 32. Both control-owner label rasters match.

Original 59c8f skips environment and scene rendering while lower-panel view 1
is stable, and resumes it during the prepared transition. Advancing hidden
clouds on those frames had displaced the entire cloud field by the time the
player returned to the forward view. Native camera and cloud diagnostics are
available through EARTHSIEGE_REPLAY_DIAGNOSTICS.

A projected folded quad exposed an additional original column-mapper boundary:
with a 40x40 texture it reads offsets 2,215 and 2,805, outside 1,600 bitmap bytes.
The actual mission uses the row mapper, which stays in range for this quad.
capture_folded_texture.py isolates both original modes with sentinel guard
bytes. The native safety rule leaves undefined samples untouched; all defined
pixels remain exact. Four captures test this boundary, in addition to the 600
ordinary texture rasters. This does not emulate arbitrary adjacent heap bytes.

The full sampled-frame investigation is complete: 114 of 120 images match
exactly after controlling presentation timing. The other six differ only at the
intentionally repaired malformed radar model, and match when the same repair is
applied to the original renderer. See [PIXEL_FIDELITY.md](PIXEL_FIDELITY.md) for
all 230 affected pixels, original instructions and reference boundaries.

Vertical cockpit pans reuse their existing pages and do not invoke the full
shield painter. Horizontal preparations and a return from external view do.
The original VGA upload routine first zeroes the next DAC entry's red component;
an unnecessary shield upload of entries 80–85 therefore changed entry 86 on the
following upload. This accounted for most of DEMO4's earlier 4,552-pixel maximum.
capture_view_palette.py observes unchanged original camera/draw/present routines
through 48 controlled transition frames; view-palette.json retains every palette
upload. The native correction removes that extra upload rather than patching
the resulting colour.


## Weapon display ordering and cockpit-engine transitions

Original 59c08 calls 2cf28 to paint cockpit widgets before 155a8/cf78 exchanges
weapon state. The previous native presentation painted the new selection and
capacitor values immediately. It now retains the values for that paint while
keeping the independently verified simulation exchange in order. An original
DEMO1 frame-1320 memory capture confirms that bank selection, charges and widget
state already agree even though the displayed highlight belongs to the prior
exchange. Repeated draw-only calls advance to the already exchanged values.

The replay tests additionally compare 584 original 18x7 weapon-name rectangles
in stable forward views. Positions are taken from live original widget objects;
eight rectangles near the recorded software pointer are excluded explicitly.
These are expected RGB outputs, never inputs to the game. The final complete-frame results are recorded in PIXEL_FIDELITY.md, including
software cursor ownership and independently timed presentation layers.

Original 58574 gates cockpit-engine sound 45 on cockpit view 4, not on camera
ownership. During a prepared transition those change on different frames.
Reading the view state restores the original stop timing, including a frozen
options preview. ESREQ002 now checks 4,474 non-engine starts and all 2,599 stops
in exact combined frame/call order (7,073 requests), including engine stops.
Engine starts/retries remain separately reported because they depend on the PCM
completion and voice-allocation timeline: current differing-frame counts for
cockpit engine 45 are 17/5/1/10, and flyer engine 16 differs in two DEMO3 frames.


## Original transform-cache lighting behaviour

The model renderer now reproduces an original multiple-light cache defect.
528ab caches local transforms by articulated transform index, with index -1
representing the object root. A newly computed transform calls 5c140 and
transforms every active light. A cached transform calls 5d470; 5298c is a no-op,
so this is not a recursive push/pop stack.

Both 5d3d0 (save) and 5d470 (restore) repeatedly access the pointer at bdba6
without advancing through the registered light array. They therefore save and
restore the first light repeatedly. Later lights retain the local coordinates
of the most recently computed transform. Null model parts do not change this
state. Weapon replacements share the enclosing model's transform cache.

This explains a 300-pixel building face discrepancy in DEMO3 frame 840:
the world-space lights agree, but the original face has intensity 98 while
independently recomputing every local light gives 160. The native renderer now
retains the original stateful result. A corrected lighting implementation would
be a deliberate change for a future enhanced version.

capture_model_light_cache.py executes the unchanged original renderer for all
401 model roots with two additional light/view arrangements each, including
directional and positional lights. All 802 complete 320x200 raster CRCs match.
Existing single-light and armed-model comparisons also remain exact.

The passive scene diagnostics expose selected world-space lights, position,
distance and detail through EARTHSIEGE_SCENE_DIAGNOSTICS, optionally limited by
EARTHSIEGE_SCENE_FRAME. They do not supply expected state to the renderer.
The independent four-replay comparisons still agree on all 7,032 captured
states, 584 weapon-label rasters and 7,073 ordered sound requests. Across 120
sampled full frames the largest RGB differences are now 385/285/408/444 pixels;
these counts include pointer, clock-phase and remaining scene differences.


## Authored HERC ground models

HERC profile bytes 112–116 select FLAT.DTS roots; bytes 117–121 bind them to
articulated model parts. These are the feet/body shadows, not just footstep
sound markers. Constructor 11330 creates the flat objects at Z=-100000 until
their first update. Routine 144dc places each at its part's world-space origin
and copies the HERC's heading. Routine 11988 sets Z=0 when drawing, after the
ground-pass 30,000-distance test. The ground pass precedes terrain and actors.

The native mission now retains and draws those objects for all HERCs, including
the player's own shadow. Destroyed legs permanently lose their corresponding
attachments; destruction of a chassis configured to disappear removes all of
them, matching 13250. Explosion ground flashes share the pass and retain their
existing update/draw behaviour.

The extended ESFOOT02 fixture checks 1,800 unchanged original attachment
placement, heading and footstep/latch cases. The four independent replays still
match all captured states, label rasters and sound requests. Across 120 sampled
full frames, largest RGB differences are now 159/285/108/444 pixels. The former
large DEMO1/3 external-view discrepancies were these missing ground models.
The full 249-test suite passes.


## Original whole-object visibility

Original 529bc rejects a model using its stored root centre/radius before
drawing children. Its integer FOV expansion, near-plane test and three-pixel
screen margin now match 4,096 independent original classifications. The native
mission enables that check. Standalone component-raster tests retain their
explicit original no-object-culling setup.

All SMOKE.DTS outer bounds have radius zero. This makes the original hide a
puff when its centre leaves the rectangle, even while its expanded bitmap would
overlap the viewport. DEMO4 frame 1260 contained nine correctly positioned
native smoke objects that the original rejected this way. Their lifetimes and
positions were already correct; the missing object test caused the difference.

Fourteen additional replay raster fixtures cover eleven complete 320x200 frames
and three scene regions (sky, an animated ground shadow, and the smoke boundary).
They are captured RGB output, never simulation input. The regions avoid the
original software cursor. These selected exact comparisons do not imply that
every frame is identical. Across all 120 sampled frames the largest remaining
RGB differences are 159/285/108/137 pixels in demos 1–4.

All 250 tests pass. A private SDL-window run also verifies pause freezing,
options, status, quit cancellation and mission return with isolated saves.


## Line pixels in clip-region lists

Original 6a064 has two raster paths. Plain rectangular viewports call the VGA
writer 8cb90, which accumulates endpoint-inclusive (delta + 1) steps. Clip-region
lists instead build centred Bresenham spans with 7d358, then intersect those
spans with each rectangular or curved region. The paths differ on shallow
diagonals. Clipping the direct writer's pixels afterwards does not reproduce
the span writer.

Native model outlines now select the span path when drawing through those
regions. Two-dimensional briefing routes retain their original direct path;
a framebuffer clip alone does not identify the original drawing context.
The independent masked-lines fixture covers 3,000 original complete rasters
through full rectangles, curved masks and overlapping rectangles, in addition
to the existing 6,000 direct-line comparisons.

This accounts for all three remaining scene pixels in DEMO3 frame 1320.
Together with the quantized ground-projection correction, the complete
320x200 RGB image now agrees exactly. It joins the replay fixtures, which now
cover twelve complete frames and six scene regions.
