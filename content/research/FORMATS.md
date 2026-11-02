# Earthsiege 1 resource formats

This describes the supplied **1.0** CD. Names and offsets refer to flat application addresses, not executable file offsets. GO and DBSIM application images begin at file offset `0x48fd`; PLAYFLIC at `0x47f2`. Earthsiege 2 is useful background research but differs materially from this version.

Original payloads, hashes and unknown fields are retained. Every reader checks its bounds; exceptions are recorded rather than repaired speculatively. Inspection viewers use decoded data and identify approximations.

| Family | Decoding and coverage | Independent original-code evidence |
|---|---|---|
| VOLN archives | Seven volumes, 2,484 entries. Null-separated directories, 18-byte name/directory/offset entries, 9-byte codec/size/DOS-stamp payload headers. All entries use uncompressed codec 2. | `tools/vol.py`; archive layout cross-checked with Open Siege |
| DTS/DGS shapes | 44 files, 401 roots, 47,575 nested objects. Tagged, length-bounded 3Space hierarchy, geometry, materials, BSPs, LODs, animation sequences and collision height fields. | `check_models.py`: native constructors/readers; every retained geometry and animation field compared; 140 collision fields and 107,394 cell codes |
| DPL palettes | 55 palettes. 4-byte RGB/flags colours, followed by variable-length shade ramps of palette indices. RGB channels use 0–63. | Native renderer research; all files consume exactly |
| DBM/DBA/DCI artwork | Tagged 8-bit raster objects and arrays, including both legacy and current DBM headers; cockpit DB0/1/2. 407 artwork resources, 4,578 frames including two LPF animations. | Format bounds and retained tails; viewer palettes remain selectable |
| DFN fonts | All 30 fonts, glyph raster, offsets, widths and metrics. | Native file structure; sample sentences, contact sheets and verified TTF/WOFF2 exports (FONTS.md) |
| RAW/SFX sound | 377 unsigned 8-bit mono samples, default 11,025 Hz, maximum-compression FLAC exports. Runtime effects may change pitch. | DBSIM sound manager `0x4ef8c`, rate global `0x959f0`; PLAYFLIC's explicit audio clock |
| HMP music | 20 songs including SOUNDSET.HMP outside the VOLs. Native deltas, 32 records of five device IDs, channel events, HMI control events, branch counts and six-word branch records retained. | Original delta reader `0x6ed60`, routing `0x6e4c1`, 120 Hz sound timer |
| BNK/DIG/386 audio | Three AdLib instrument banks; 19 original PCM percussion patches; 185 archived hardware modules. DRUM.DIG and DRUM32.DIG have different headers but identical PCM. | Original digital-bank loader `0x81cd3` and archive loader `0x81365`. GM melody auditions with native percussion are not hardware captures |
| MSN source missions | 75 of 77 version-5 sources consume exactly. Conditions, setting patches, points, headings, routes, areas, timers, HERCs, flyers, orders and groups retained. | GO `0x3276c`. Two legacy layouts are not referenced by supplied campaign/single-mission filename tables |
| Mission compilation | 300 complete native outputs: 75 missions under four explicit campaign/RNG fixtures. This does not imply zero flags are the initial campaign state. | GO writer `0x3445b`; independent condition/RNG evaluator and source compiler agree with the final state in all 300 cases |
| ENG briefing text | 79 revision-1 sectioned text resources; BRF/OBJ/DEB text alternatives exported. | Complete counter-selected text bytecode; 2,223 original results agree. Do not display all alternatives simultaneously |
| Zone placements | 106 files, 5,129 instances. 2-word header then 20-byte shape/position/angle records. | DBSIM `0x20238`. Caller chooses terrain set; file's stored kind is read but ignored |
| WLD environments | All 24 descriptors, sky/ground bands, distance ranges, palette/texture selections and names. | DBSIM `0x251c4`. Palette index `header[0]*6 + header[9]*2`; world adds `header[8]` |
| Damage/COL/GL/weapons | Chassis, damage components/dependencies, collision sphere states, mounts, 17 weapon records and 19 projectile definitions. Projectile trailer is a flat 19×36-byte table. | Native `0xbb8c`, `0x9930`, `0x94f0`, `0xc1d0`, `0xc2bc`, `0xc2d0`. HOVTANK.DMG is a legacy-layout exception that the original current reader also overreads |
| Shell/cockpit metadata | 195 STR/BIN/DLG/OFS/NAM/VUE/GAU/PDG/ED resources. All decode. | All 37 ED masks compared with original `0x24d44`. COLOSSUS.ED1 leaves 30 redundant legacy bytes unread in the original too |
| Data and campaign tables | 155 additional tables: campaign/stage lists, starting hangars and armories, loadout/damage diagrams, formations, terrain, effects, module records and others. | Strides/selection checked in original consumers; field meanings remain explicitly partial |
| TTM presentations | 123 complete 4.14 bytecode programs; page/label tables and all operands retained. | Original GO token lookup `0x47618`; every RLE stream compared with decoder `0x646c4` |
| SNC portraits | 718 lip-sync timelines: shell uses 16-bit count/pairs, simulation 32-bit byte count and 8-bit pairs. | GO `0x4589c`; original cumulative timing |
| DFL cinematics | 1,471 indexed frames. Custom type-20 delta codec, palette fades and sound-clock sync; ordinary FLC conversion omits most images. | All 885 custom delta chunks agree with PLAYFLIC `0x3e19`. Launcher passes `-S83`; clock advances 915 samples/frame at 11,025 Hz. Initial audio offsets 150/1,450 ms |
| TAP input recordings | Four bundles and 9,300 frame records, all to exact EOF. Seven u32-length files, then 14-byte input header, u32 mouse count, 14-byte mouse events. | Every input frame, axis, delta, button and mouse event agrees with original DBSIM `0x4cb14` |

## Important rendering findings

`TSPoly` (`0x140001`) is helper geometry: its native render method `0x54038` returns without drawing. Rendering it as an ordinary face produces bogus planes around HERC weapon mounts. The ES1 render vtable slot is `+0x20`; `+0x1c` is the destructor.

Stored polygon normals have length approximately 2,048. Vertex winding is clockwise relative to the outward normal. Materials carry separate front/back fill/line slots, including disabled and texture selectors. The viewer uses a depth buffer for inspection. Original BSP/detail/cell selection has 28,632 recorded comparisons, and the preview now uses verified fixed-point rotation, hierarchy and pose interpolation. Original light setup and intensity arithmetic are now verified; dynamic light-controller selection is separately verified in LIGHTING.md; gameplay-driven attachment and animation consumers are documented in ACTORS.md, ANIMATION.md and RUNTIME.md. Billboards, authored lines/points and original starting-mission weapon assemblies are visible.

HERC texture bank selection uses profile word at byte 148 (LIGHT/MEDIUM/HEAVY/ENEMY). Weapons use WPNTEX and scenery BASETEX. World data and palette choice must follow the compiled mission header rather than a guessed filename or zone header.

## Retained ambiguities

Saved games, model attachment/splicing and native rendering now have original-code comparisons and live integration. Some retained table words still lack an identified semantic consumer; RESOURCE_AUDIT.md lists them. `B0_C1_20.MSN`, `B0_C1_30.MSN` and `HOVTANK.DMG` are preserved as layout exceptions. There is no evidence yet that their mismatching current-reader layouts are exercised by normal gameplay. Provisional inspector labels are marked separately from verified field meanings.

LPF/ANM presentations are decoded through FFmpeg as indexed PNGs: ESIEGE2 and ESIEGE3 have seven/eight displayed frames; the additional header frame is the closing ring delta. Legacy ICONS.DBA and some DBA arrays carry stale or trailing cached data, retained separately from complete pixel payloads.

## Compiled mission handoff update

ES1 SCRIPT.DAT contains a 20-byte header followed by nine count-prefixed blocks: points (12 bytes), headings (2), variable routes (count then 16-bit point references), areas (6), triggers (24), HERCs (98), flyers (56), fixed ground objects (16), groups (82). All 300 freshly captured compiler outputs consume exactly; the four original tapes' bundled SCRIPT.DATs contain stale tails, which the original count-driven reader does not use.

The source table provisionally called `orders` in early exports is the **fixed ground-object roster** (24 bytes in MSN, 16 in SCRIPT). DBSIM's world loader reads its object type, builds its live-slot map and loads the matching ground-object definition via `0x045a4`. Source `timers` are the 30-byte trigger/action records, exported as 24 bytes. Earlier JSON keys are retained for continuity until all consumers have been migrated; prefer these semantic names in new implementation code.

## Verified mission text bytecode

All 79 ENG files now decode completely (`tools/mission_text.py`). BRF/DEB bodies start with a 16-bit text-allocation hint, followed by bytecode: 1 appends a u16-length NUL-terminated string, 2 selects a phrase using a mission counter, 0x10 ends the program. A choice contains a counter index, offset count, signed 16-bit relative offsets, inclusive signed ranges and counted phrase strings. The final offset is the end sentinel; its final range is unused. The **last** matching range wins. Literal spacing is preserved during concatenation.

OBJ bodies have the allocation hint, u16 objective count, then marker-byte/count/string entries and a final 0x10. This is a separate layout rather than a text program.

All **2,223** BRF/DEB results agree with original GO interpreter 0x19453 under zero, one and patterned mission-counter fixtures. Native checking stops at0x19856 before font-dependent wrapping; chunk selection and counter-file reads are explicit host boundaries. Previous heuristic fragment extraction is superseded. The mission browser shows selected text and retains every phrase alternative.

Source mission compilation now has **300** complete original captures over four explicit campaign/RNG fixtures, including final generator state. The native C++ compiler agrees with every output table and final RNG state in all 300 cases.

## Inspection and coverage updates

The [file-by-file inventory](../analysis/resources/index.html) audits every VOL member against actual extraction catalogues. It separates complete byte layouts, provisional field meanings, legacy-layout exceptions and unclassified files. A decoded file does not imply fully reproduced gameplay semantics.

Direct file opening and HTTP serving are both supported. JSON exports have adjacent classic-script transports; indexed bitmap banks avoid canvas tainting from file origins. Bitmap export directories retain the original extension, preventing same-name DBM and DBA previews from overwriting one another.

Model playback uses authored durations: every sequence's total tick field equals the sum of its frame durations. At nominal simulation pacing, `0x14148` passes `0x63fa4(100)` into the animation instance; the channel applies its independent signed Q8 rate (`0x62718`). This establishes nominal millisecond units at unity rate, not a fixed universal gameplay FPS. All 16,850 captured forward channel updates agree, including cyclic/clamped boundaries and varying frame durations/rates. Ordinary queued cross-sequence requests and reverse playback are now verified separately (ANIMATION.md); movement-dependent rate selection remains gameplay behavior.

Starting weapon assemblies use SM_INIT.DAT, GL mount orientation/position and WEAPONS.DAT's four template indices. The original loader selects MECHWPNS; both it and MECHWPN2 use WPNTEX. Thirty-two external weapon placements in the eight starting loadouts match original `0xb916`/`0xbbd4`; empty/internal slots bring the total to 45 mounts. The bare chassis contains flat placeholder polygons that the runtime substitutes. Inspection defaults to the highest authored detail, with a selector for lower levels.

The four `zones/DAT/WORLD*.DAT` files retain a predecessor format, structurally decoded separately. They are not interchangeable with the current WLD descriptors loaded by `0x251c4`. SKIMMER.DAT is the native 34-byte flyer profile copied by `0x1c6c8`, not a truncated 192-byte HERC profile. The supplied NAMES.LOG is an empty career index. CAREER1.MEC and CONFIG.DAT have structural legacy interpretations with no established current consumer; TEST.DAT remains unclassified after a bounded consumer search; RESOURCE_AUDIT.md records its endpoint and the legacy distinctions. All are exposed in the coverage browser.

## Model cell state and attachment corrections

The serialized per-cell shorts are **cycle frame counts**, exported as `cell_frame_counts` (previously the provisional name `sequence_indices`). Native `0x65d04` reads them into shape+0x20; it allocates and zeroes a distinct default-state array at shape+0x1c. Constructors copy that zero state. Effect updater `0x5d74` advances its selected cell modulo the stored count. Cell-object rendering `0x52fd0` then selects the child modulo that object's own child count; different detail variants can have different child counts.

HERC roots use the full-detail pose/cell instance, with native cross-LOD transform remapping through the profile's part IDs. Runtime exports are separate from raw stored roots, and all 16 remapping sets agree with original execution.

Weapon mount orientation >= 4 denotes no external model attachment. Native `0xbefc` emits -1 for its replacement part ID; the chassis geometry must remain visible even if the mount's raw numeric ID coincides with an ordinary body part. External mount IDs, template selection and offsets are checked against original code for all eight starting loadouts.

Texture bindings come from native loaders, not a generic effects bank. EXPLOS.DAT chooses EXPLO0–EXPLO8 per explosion root; SMOKE and BULLETS each use their own DBA, SKIMMER uses ENEMY, MECHWPNS/MECHWPN2 use WPNTEX, and fixed scenery uses BASETEX. Original explosion, smoke and bullet loaders confirm 34 root bindings through a read-only multi-stream native fixture.

## Recorded starting state and native preload planning

PLAYER.MEC starts with selected-roster index and count, then variable records: four shorts (portrait identity, single-mission crew index or campaign rank, chassis, weapon count); weapon IDs and weapon-value arrays; an extra short; 13 component values; two ten-short module arrays. Seventeen flag bytes follow. Native `0x1d850` expands each record to 126 bytes. The independent parser agrees with all four tapes and is exercised again in 300 explicit compiled-mission fixtures.

MISSION.VAR is 100 signed shorts. The loader resets counter 7 to zero after reading it. Headings in SCRIPT are quarter-turn selectors, expanded to unsigned word angles by shifting 14. Source actors are retained only when referenced by groups after group zero; the player's roster is appended separately. The resulting source-to-live maps and resource requests are verified. These facts describe preload selection, not live activation, formation offsets or physical placement.

RESTORE.DAT contains two shorts followed by two counted, NUL-terminated paths (source mission and ENG text). PREFS.CFG is 17 bytes; OBJECT.STR uses the normal grouped string/attribute encoding. The demo inspector preserves neutral names for unproven state fields.

GL mount byte 23 maps each mount to its equipment slot. Record order is usually a permutation. The assembly preview follows this mapping; all starting weapon constructors, drawable vertex shifts and parent-node bindings are checked against native code.

Cockpit DB0, DB1 and DB2 contain forward, lower and shared side artwork. Original `0x22184` loads three unique bitmaps; `0x22558` reuses DB2 with blit flag 2 for the left view. VUE's last two integers locate panels in the virtual instrument layout; the viewport remains 320×200. All 24 unique decoded bitmaps match the original class reader's pixel arrays. The cockpit browser displays these panels and clipping masks without claiming a running instrument simulation.

## Verified shade lookup and texture lighting

Shaded materials with high byte 4 carry a **ramp number**; the intensity occupies bits 16–23. Native span setup chooses `ramp[(intensity * length) >> 8]`. Intensity 255 selects the last entry; intermediate thresholds use the full length, not length minus one. Gouraud setup selects palette indices at the vertices before its gradient rasterization. Native material checks cover 32,256 lookups across the 18 palettes that contain ramps.

`0x28b28` builds eight 256-entry texture-lighting maps from the current palette and its ramps. It adjusts each ramp colour relative to a reference shade, then searches the palette for a nearest match using the game's integer distance helper. The 144 original generated maps are retained in models/material-shading.json. Texture polygon renderer `0x5410c` chooses map `floor(7 * intensity / 255)`. This lighting translation was absent from the earlier inspection preview. Billboards remain outside this polygon-specific remap.

The preview applies original ramp thresholds, texture maps and vertex-normal Gouraud palette-index gradients. It now also uses the original directional light and integer intensity rules (see LIGHTING.md). Native BSP order, dynamic effect-light integration, clipping and exact span pixels remain distinct from this depth-buffer inspection renderer.

See MUSIC.md for native HMI scheduling, hardware routing, archived OPL modules, original PCM command handling, FLAC auditions and explicit audio-emulation limits.

Original actor construction, formation placement and loadouts now have 304 world captures (ACTORS.md). Spatial trigger/action semantics and objective decisions have independent native checks (MISSION_RUNTIME.md). The mission browser displays constructed actors, activation boundaries and counter actions alongside the compiler-reference data.

Weapon control states, shield/capacitor scheduling and projectile motion consumers now have independent original-code comparisons (WEAPONS.md). Special weapon selectors and per-update timers must not be inferred as ordinary table indices or elapsed milliseconds.

Initialized runtime snapshots, native frame ordering and original-renderer captures are documented in REFERENCE_CAPTURE.md. Actor recognition, shared contacts and visibility caching are documented in PERCEPTION.md.

Texture transparency differs by draw path: native 0x7394a/0x735a4 skips source
index zero only without a lighting remap. With a remap, every texel writes its
translated index, including zero. The inspection shader now retains this
distinction; billboard transparency is unchanged.

## Mounted volume precedence

The initialized DOSBox snapshot retains the simulator volume search list at global `0x96838`: SIMSOUND, SIMVOICE, SIMVOL0, then ZONES. Native lookup `0x566b8` visits that list in ascending order and returns the first match. Therefore SIMVOL0 wins duplicate zone paths. Eight zone names occur in both archives; ZONE6 and ZONE8 have different contents, while the other six are identical. Both copies remain exposed in the analysis catalogue. The native mission loader uses the SIMVOL0 copies. `check_zone_loading.py` captures all 106 files separately using explicit file overrides, comparing all 5,129 original constructor placements and the per-shape metadata bindings.


### LPF menu doors

The two ANM resources are the closing (ESIEGE2) and opening (ESIEGE3) menu-door
transitions, not a looping main-menu background. GO 0x13aa8/0x13d9e/0x13c46
loads, locates and decodes their LPF pages. Its native counterpart now matches
all 60 captured complete frames, over both resources, two background patterns
and opaque/saved-screen modes. The final ring delta is excluded. Written zero
pixels restore the saved screen in transition mode; skip spans retain the prior
frame. ESIEGE3's page directory is not in frame order.

Normal standalone playback uses the header's 15 fps. Menu calls at 0x3c2a4 and
0x3c734 instead select background restoration and omit that clock wait; their
speed depends on decoding and VGA writes. Exact transition scheduling is separate
from the verified decoder. The two call sites request digital sounds 10/11.


The expansion confirms the general priority rule: VOL header bytes 4-7 are a
usage mask, byte 8 is priority, and byte 9 is the directory count. Insertion
sorts descending priority and retains encounter order for ties. Simulator mask
1 selects PZONES1 (20), SIMPATCH/PZONES (10), and inherited volumes (5).
See [SIMULATOR_VERSIONS.md](SIMULATOR_VERSIONS.md) for original consumer addresses
and the controlled insertion probe.
