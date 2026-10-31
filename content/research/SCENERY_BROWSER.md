# Mission scenery inspection

The mission browser opens in **3D scenery**, using a coherent **Game launch** capture
from the original launcher and simulator. Context and Variation select explicit
campaign stages, single missions or original recordings. Compiler diagnostics
and unresolved source alternatives remain available under advanced inspection. Routes, waypoints, actor/group
markers and activation-area outlines use the same projection as the 3D scene;
they are inspection overlays and remain visible through geometry.

Drag to orbit, Shift-drag or right-drag to pan, and use the wheel to zoom.
Panning moves across the X/Y ground plane and keeps the orbit pivot at Z = 0,
so repeated drags cannot move the pivot above or below the ground. The
focus selector offers the whole map, the building group, individual buildings
the player start, and the first placement of each terrain variant. Double-clicking a waypoint or actor marker focuses that
position. Top view puts X to the right and Y upwards. Compilation, terrain-set, scenery-file and visibility controls preserve the exact
camera centre, distance, angle and zoom. Selecting a different mission establishes
its initial framing; Focus and Reset are deliberate camera actions. The original 2D waypoint map remains available.

## Mission list and launch contexts

The list shows file ID, campaign family / role, and a short, consistently worded
summary of the original briefing and objective list. These are inspection
descriptions, not original mission titles; tooltips identify their source. The
complete original text and its conditional alternatives remain below the view.
Summaries are maintained in `tools/mission_summaries.json`; the previous
first-action-verb extraction could select useless fragments such as “DESTROY
THEM.” and has been removed. No authored mission-title field is identified.
Role names come from WATEXT.BIN (Reconnaissance, Scout, Patrol, Raid, Scramble,
Search and Rescue, Strike, Escort, Convoy Raid, Assault), indexed by the compiled
mission header. C0…C7 identify filename families; the battle-set graph determines
actual order and branching. They are not eight sequential campaigns. Only the
two source-reader exceptions receive `!` badges; the tooltip gives the error.
Search includes roles and objective text as well as filenames.

Compilation is the original GO interpreter's resolution of a mission template,
including campaign conditions, random branches, record merging and reference
remapping. Game launch includes the caller’s counter preparation, original RNG and terrain
selection, and uses the corresponding player roster. Campaign examples have
explicit fresh history; original recordings and imported saves provide actual
state. See [MISSION_LAUNCH.md](MISSION_LAUNCH.md) for exact boundaries and import
commands. The advanced compiler diagnostics retain these artificial inputs:

| Preset | Campaign values | Random state |
|---|---|---|
| Source: all alternatives | Not resolved | Not resolved |
| Zero flags / zero RNG | All 100 shorts are zero | All-zero additive generator; every random result is zero |
| Zero flags / seeded RNG | All zero | Synthetic nonzero 56-word state for the original generator |
| All-one flags / seeded RNG | All one | Same nonzero state |
| Patterned flags / seeded RNG | Repeating 0, 1, 2, 3, 4 | Same nonzero state |

These are reproducible research inputs, not difficulties, releases or authentic
saved campaigns. `compile_missions.py` records the exact state. These captures bypass the original
launcher's counter preparation and terrain/options overrides; even the seeded
fixture is not a complete game launch. [MISSION_LAUNCH.md](MISSION_LAUNCH.md)
records the implemented setup and layout differences.
In source mode the browser now
explicitly says that it shows only terrain and waypoint alternatives. **Show
buildings and actors** switches to Game launch and preserves
the camera. Hidden actor geometry also receives a visible notice and show button.

## Why buildings were missing

ZONE*.DAT lists terrain placements, not the mission's complete scenery. The
previous 3D browser rendered only that list. Buildings are separately constructed
ground actors. Their types refer to BASES.DAT and select roots from BASES.DGS or
BASES_AN.DTS, their alternate-side banks, or BHULKS.DGS for an initially destroyed
building. The browser now combines those models with their original captured
positions and headings. HERCs and flyers are included as well; HERC equipment
uses the captured loadout with GL equipment-slot mapping.

For B0_C1_61 the old zero-counter fixture contains 62 terrain placements, four buildings
(factory, hangar, listening post and gun tower), nine HERCs and five flyers. The
buildings occupy (0,0), (0,30000), (-22500,-15000) and (22500,-15000). Source
records, constructed positions and links to the correct building variant are
available by clicking their markers.

B0_C3_2A contains thirteen buildings in all four fixtures: four friendly buildings
(a listening post, two HERC hangars and a supply depot), two enemy listening posts,
six enemy radar towers and one enemy generator. Player group 0 targets ground
group 11, whose eight members are the enemy listening posts and radar towers.
Mission kind 6 checks that target group's destruction. The generator belongs to
group 12. These are ordinary destructible base actors, with BASES.DAT capacities
and the destruction/wreck lifecycle documented in [ACTORS.md](ACTORS.md).
Focus labels distinguish allegiance, source ID and objective membership.
[Listening-post view](../analysis/missions/b0-c3-2a-listening-post.png).

This is a static starting-state inspector. It shows constructed actors even when
their groups have not activated. Game launch equipment comes from that launch’s own player file. Only advanced
compiler diagnostics retain the separate DEMO1 test roster. Body meshes use their default pose; subsequent AI,
locomotion, combat damage and effects are not simulated. Unavailable models are
listed, not substituted. Source-alternatives mode does not silently invent
constructed positions or combine mutually exclusive actors.

## Environment colours

The terrain resources contain coloured/shaded polygons, not bitmap terrain
textures. Most visible slopes reference material **14**. Its stored DPL ramp is
a one-entry placeholder, `[255]`. At runtime DBSIM `0x25d44` uses SHADES.DAT to
replace that slot from the selected WLD's eighth colour range. Omitting this
binding made every terrain set look uniformly beige in the browser.

The shared browser now applies the original near-distance bindings per object
class. The model inspector automatically chooses WORLD0 for desert, WORLD6 for
temperate, WORLD12 for ice and WORLD18 for urban scenery; manual palette selection
remains possible. The mission scene uses its header's visibility and time-of-day
settings. The game selects an even-numbered DPL palette for both adjacent
normal/low-visibility WLD variants: the old B0_C1_61 zero fixture loaded WORLD6.DPL with WORLD7.WLD, whereas its
campaign launch uses ICE (seed 17: WORLD14.DPL with WORLD15.WLD). Stored zone
kind and unmodified compiler headers do not override the launcher’s terrain
selection.
Resource lookup also follows the original SIMVOL0-before-ZONES precedence.

`build_browser_world_data.py` checks all 144 exported class/world bindings against
the existing original-executable captures in `native-distance-shading.json`.
The mission scene intentionally uses the nearest band rather than dimming or culling
objects according to an inspection camera. The model browser now also offers
explicit day/dusk/night presets and distance shading, documented in
[Lighting](LIGHTING.md#mission-condition-presets-in-the-model-browser). The optional ground plane is a flat
inspection backdrop. Textured ground, panorama and full environment simulation
remain separate work; see [the analysis audit](ANALYSIS_STATUS.md).

## North-edge pattern in B0_C1_61

The pattern is present in the original `zones/DAT/ZONE1161.DAT`. Records 44–61
(zero-based), the final eighteen placements, arrange terrain shape 5 into a
lettering-like cluster at X −19,922…35,859, Y 379,492…418,671. Those same placements
do not recur in the other retained zone files. Their arrangement looks deliberate:
the lettering reads visually as **“Jö”**, with the two separate upper pieces
forming the umlaut. This is a reading of placed geometry, not a stored text label.
Its author and intended reference remain unknown.

Choose **North-edge terrain pattern** in the mission browser's focus selector.
[Placement evidence](../analysis/missions/north-edge-pattern.json),
[browser view](../analysis/missions/north-edge-pattern.png) and
[original-renderer capture](../analysis/missions/north-edge-pattern-original.png)
are retained. The original image runs unmodified static scenery drawing in the
executable harness, with no sky/ground, moving actors or gameplay; it is not a
DOSBox gameplay screenshot. Reproduce it with `tools/capture_scenery_pattern.py`.

`check_mission_browser.py` exercises all 75 decoded mission scenes, constructed
buildings, overlay projection and visibility, stable framing, source mode and
resource precedence. The two source-layout exceptions remain explicitly labelled.

## SM_ESC50's test briefing

SM_ESC50.ENG literally contains “This is a mission.”, “Case: (0)” through
“Case: (11)”, overlapping range cases (0–9, 10–11, 1–5), and objectives labelled
“temp step 1” through “temp step 3”. Its eight debrief variants repeat the same
case machinery with a “.....” prefix. Both choice blocks read mission counter 4.
The last matching range wins: counter 1 produces
`This is a mission. Case: (1)Case: (1,5)`, whereas counter 8 produces
`This is a mission. Case: (0,9)`.

This text is present in the original bytes, and all 27 retained original GO
text-interpreter comparisons for this resource agree with the decoder. The
briefing is not a browser-generated diagnostic. Its placeholder prose and
systematic range tests strongly indicate a retained text-system test/template.
SM_ESC50 is absent from SING_MSN.DAT, the campaign tables and their random pool;
no literal filename reference occurs in GO or DBSIM. This bounds the supplied
selection paths without asserting that no development launcher could use it.
Its actual compiled objective kind is Scout (1), despite the ESC filename.
The browser labels and preserves it under Retained missions.

## Urban variants and incompatible sources

Campaign nodes C5, C6 and C7 select URBAN through the launcher's terrain table.
The old compiler-only preview missed that override in C5 and C6. Geometry bank
and palette are distinct selections; the ground colour alone is not proof of
which bank is in use. ZONE placement indices select roots directly from the
chosen bank. They are not detail levels or arbitrary preview substitutions.

URBAN variant 5 is placed **19 times in ZONE1500**, shared by B0_C5_00 and
B0_C5_20. Select B0_C5_00 and **Focus → Terrain variant 5 · first of 19**; the
first instance is at `(1406, -94375, 0)`. C6 maps also use it; B0_C6_0A's ZONE607
contains ten instances. None of the C7 maps uses variant 5. Its thin bent lines
are part of the authored geometry and are visible in the original renderer.
[Original capture](../analysis/missions/urban-variant5-original.png) and
[browser capture](../analysis/missions/urban-variant5-browser.png).
`launch-scenery-check.json` records verified original root selections, coordinates and
headings for all placements in the checked maps.

B0_C1_20 and B0_C1_30 are retained sources rejected by the reference reader.
Selecting them now cancels pending scene loads, clears geometry and overlays,
and displays that failure. Previously they inherited the last scene/terrain,
explaining why B0_C1_20 appeared green, icy or red depending on prior selection.
