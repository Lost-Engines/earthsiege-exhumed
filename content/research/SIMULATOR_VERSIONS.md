# Comparing the Earthsiege simulators

The October 1994 base game and the March 1995 expansion use the same underlying
3Space renderer and much of the same simulation. The expansion changes both
code and data. Its floppy executable contains a scanner correction absent from
our expansion CD; the April patch includes that correction and two further fixes.

This comparison concerns **Earthsiege 1**. The Earthsiege 2 demo on the 1996
compilation is a separate game. All 31 files from its `ES2DEMO` directory have
been copied, without making an install, to
`../earthsiege2-reverse/install media/demo_cd_1996_10`. The handoff record is
[es2-demo-handoff.json](../analysis/releases/es2-demo-handoff.json).

## Which builds?

| Build | EXE bytes | Identification |
|---|---:|---|
| Base CD, October 1994 | 730,581 | Earthsiege 1.0; retained reference |
| Expansion CD, March 1995 | 760,401 | Mission Disk CD |
| Expansion floppy package | 760,465 | Same expansion VOL payloads, different simulator |
| Expansion April patch | 760,481 | Exact match to `DBSIM.EXE` inside supplied `ESXPANPT.ZIP` |

The 1996 compilation contains the original base executable byte for byte. It is
not a newer base-game revision. Floppy ZIP member timestamps were flattened in
redistribution; the executable establishes a code relationship, not a reliable
release date or authorship of that distribution.

The patch ZIP timestamps its executable April 10, 1995. Its README describes
lockups, usually around Campaign 4, Mission 8. It was present in the top-level
`ESXPANPT.ZIP`; the earlier media audit overlooked that archive. Its executable
matches the loose one in the complete bundle. Original patch instructions are
now retained in `install media/expansion_patch_1995_04/README.TXT`.
See [INSTALL_MEDIA.md](INSTALL_MEDIA.md) for full hashes, media provenance and
separate comparison installs.

## Method and scope

Application virtual address zero maps to EXE file offset `0x48fd` in all four
builds. `compare_simulators.py` aligns instruction sequences while retaining
operand differences. This supplies candidate correspondences, not a semantic
equivalence test: x86 decoders can mistake inline jump tables for instructions,
and a similar prologue alone cannot identify a function.

The small expansion revisions receive a stronger check.
`verify_expansion_regions.py` compares every initialized application byte outside
the manually inspected changed routines. Differences must resolve to an exact
address relocation, an alignment change, or the identified assertion line.
Both comparisons finish with **zero unexplained bytes**. This covers initialized
code/data, including embedded pointers and tables; it does not treat an entire
changed function as proved equivalent.

`check_expansion_changes.py`, `check_simulator_crossbuild.py` and
`check_expansion_weapons.py` then execute original instructions with explicit
inputs and recording boundaries. Reports are in
[executables/](../analysis/releases/executables/). The base-to-expansion survey
below traces the affected systems; it is not an exhaustive equivalence proof
for every controller or a replay of all expansion campaigns.

All addresses below are expansion **CD** addresses unless another build is named.
Ghidra's `windows` compiler specification was selected for analysis calling
conventions. It does not identify the compiler used to build Earthsiege.

## The floppy scanner correction

CD scanner drawing at `0x38fb4` rotates each contact's relative XY position with
the renderer's current object matrix, reached through `0xc5712`. That makes
scanner placement depend on transform state left by drawing code.

The floppy routine instead constructs its own 2D rotation with `0x6b904`.
The angle is the subject actor's virtual `+0x40` orientation result minus its
heading at `+0x0a`. Contact projection consumes this local matrix. The April
patch retains the same correction.

The probe uses one contact, fixed subject orientation and two different current
renderer matrices. The CD draws the contact at different pixels; the floppy and
April executables draw it at the same pixel in both cases. Widget presentation
callbacks are controlled; distance, rotation and pixel-coordinate calculations
execute original instructions.

No other functional change was found between the CD and floppy initialized
application images. Their seven supplied expansion VOLs, GO shell and launchers
also match as described in the media audit. This supports treating the floppy
simulator as a small corrected revision, rather than a different game mode.
Its distributor's exact provenance remains unknown.

## Two additional April fixes

### Retired effects are collected after damage

The damage method begins at `0x15084`. The April executable inserts a call at
`0x1588c` to the existing helper `0x77f4` before returning. That helper drains the
pending flat-effect queue through `0x6b1ec`, returning slots to its object pool.

The pool has 150 slots of 59 bytes. Its retirement queue has room for twenty
pointers, followed immediately by its count. Without collection, a twenty-first
queued pointer overwrites that count. A controlled sequence through the original
allocator and enqueue code reproduces the overwrite in the CD and floppy builds.
Executing the April epilogue after each retirement drains all 24 requests in the
probe and returns every slot to the pool.

This provides a concrete explanation for one class of lockup. It also relates to
the base game's deferred-effect overflow described in [EFFECTS.md](EFFECTS.md).
We have not replayed the patch README's Campaign 4, Mission 8 failure, and the
patch leaves the twenty-entry queue in place. It should not be described as
fixing every possible overflow.

### A finished radio message releases its start latch

Radio update `0x32634` removes a completed message and clears its active state.
The original CD and floppy routines leave byte `+0x461` set. The April revision
also clears that byte, allowing the next queued message to run its presentation
start callback.

A two-message probe executes the original state machine. CD/floppy finish and
remove the first message but skip starting the second; April performs all three
operations. Queue access and presentation callbacks are explicit boundaries, so
this is a state-transition test rather than an audio-device timing test.

The remaining non-address change is an assertion source line in
`C:\P\M\s\c\appinput.cpp`, from 768 to 774. It changes a diagnostic, not gameplay.

## Base game to expansion: weapons

### Records and constructors

Base `0xbf48` loads seventeen fixed weapon records, followed by nineteen
projectile definitions in the same `WEAPONS.DAT`. Expansion `0xd700` reads a count
of **22 weapon records** and opens the separate, counted `PROJ.DAT` for projectile
records. Original reader `0xd340` consumes every expansion weapon record exactly.
The additional slots include the empty placeholder at 17 and ELF2, EMP2, PBW2
and plasma at 18 through 21.

Expansion weapon factory `0xdb3c` routes ELF2 through the specialized ELF class,
while EMP2, PBW2 and plasma use the energy-weapon class. Beam construction
`0x98d0` extends the segmented, jittered ELF treatment to beam subtype 7.
The geometry uses paired vertices along the ray and the original secondary RNG.
These are extensions to the existing beam machinery.

### EMP2's double tap

Energy discharge `0xc748` recognizes projectile definition 19. On the first
partial-charge shot it retains capacitor charge, sets byte `+0x4d` and uses one
quarter of the normal refire delay. On the second shot it clears the latch and
charge, leaving the full delay. Ordinary EMP takes the one-shot path.

Using the actual weapon record, a 961-unit EMP2 charge produces two requests
with that power. After the first, charge remains 961 and delay is 500; after the
second, charge is zero and delay is 2,000. The original discharge instructions
run unchanged; muzzle setup and projectile creation are recording boundaries.
Readiness and the passage of the delay are separate caller responsibilities.

### Plasma guidance and impact

Scaled projectile creation `0x979c` assigns the owner's selected target to bullet
subtype 9. The new guidance helper `0x924c` turns toward it with pitch/yaw errors
limited to 640 turn units before frame-ratio scaling, compared with 1,280 in the
rocket guidance helper `0x8100`.

The subtype-9 branch in `0x9360` also tests whether it has passed behind a target
within 2,000 world units and dispatches an area effect at impact with a 4,000-unit
radius. This establishes the manual's limited homing description in code. These
paths have been instruction-traced; a complete plasma-to-destruction campaign
comparison has not been added to the base-game native tests.

### Ordinary bullets change too

Base bullet update `0x7f84` increments its age by one per update and expires it
when age exceeds the definition's lifetime. Expansion `0x9360` accumulates
`frame_scale(512)` and compares against `lifetime * 512`. The movement already
uses frame scaling in both versions.

An original-code fixture with lifetime four gives:

| Frame ratio (256 = nominal) | Base expiry update | Expansion expiry update |
|---:|---:|---:|
| 64 | 5 | 17 |
| 256 | 5 | 5 |
| 512 | 5 | 3 |

Thus lifetime now follows simulation time rather than update count. The bullet
record grows from five to seven shorts. New fields support launch spread and
power falloff. Creation routine `0x967c` consumes the spread field, and falloff
is consumed by `0x9360`. The latter is gated by
the applicable preference/development state. These differences must be retained
when implementing expansion weapons rather than reusing the base path blindly.

## Arrivals, terrain and resources

`LC_WPNS.DAT` is loaded at `0x5000` as counted 22-byte landing-craft weapon records.
Ground-actor construction `0x4320` has new specialized cases, with landing-craft
behavior in `0x3760`. It is more than a replacement mesh.

Group-entry handler `0x1f1f8` handles arrival kinds 2/3 by constructing a
`METEOR` object through `0x7974`, associated with the waiting group. That object
starts at a randomized bearing and distance with a ballistic velocity. Kinds
4/5 position the group through separate entry branches. `METEOR.DTS` and
`IMPACT` resources therefore participate in scripted arrivals; their names alone
should not be taken as evidence of random weather or the plasma weapon.

Terrain loader `0x228cc` adds `WASTE` and `RUINS` terrain families and explicitly
binds `TERRAIN.DBA` to their shape roots. The base loader lacks that texture-bank
binding. The data and executable must be paired correctly when displaying these
new scenery resources.

Archive precedence is now traced. Loader `0x5be58` reads the usage mask from
header bytes 4-7 and priority from byte 8. Simulator startup requests mask 1;
`0x5c632` inserts matching volumes in **descending priority**, keeping encounter
order for ties. Lookup `0x5c748` returns the first matching member.

| Priority | Simulator volumes in our expansion install |
|---:|---|
| 20 | PZONES1 |
| 10 | PZONES, SIMPATCH |
| 5 | SIMLANG, SIMSOUND, SIMVOICE, SIMVOL0, ZONES |

This explains how SIMPATCH overrides base assets without rebuilding SIMVOL0.
Directory/alternate-drive enumeration can affect ties; alphabetical order is a
controlled probe input, not a claimed universal DOS order. Shell-only PSHELL
volumes use mask 256 and are excluded by the simulator's mask 1.

## Graphics and command-line differences

All **3,200** retained base projection/near-clipping fixtures give identical
positions, classifications, UVs and intensities in the expansion's default mode.
Another 512 Euler-matrix cases produce byte-identical results. This is strong
evidence for sharing those algorithms; it does not assert identical complete
frames when assets, scene state or cockpit code differ.

The expansion adds a lowercase `-v` option to main parser `0x5ef90`. It selects
the VGA driver's 320x400 mode and doubles the vertical perspective scale.
`-v1` and `-v2` additionally select different page/cockpit layouts. These are
unrelated to the pre-existing uppercase `-V<number>` field.

All three were launched with an unchanged expansion CD executable and the same
retained B1_C0_0A handoff in isolated DOSBox:

- `-v`: tall display, but ordinary 200-row page offsets leave overlapping views.
- `-v1`: side-by-side backing pages and both upper/lower cockpit artworks; the
  capture shows the normal view and command panel together.
- `-v2`: 320-pixel backing width with vertically separated 400-row pages and
  modified cockpit masks. The capture has gaps and misplaced instruments.

These are observed development layouts, not a supported arbitrary-resolution
feature or evidence of a particular VR peripheral. Captures are in
`analysis/releases/executables/dosbox-{v,v1,v2,default}/session/screen.png`.
The X11 captures are 640x400 because DOSBox doubles the horizontal pixels of
the 320x400 mode. They are ordinary running captures, not frozen identical
simulation instants.

Additional lowercase `-b` selects a 320x400 RAM bitmap target, with a copy to the
selected display backend. `-F` and `-G` set the language character used in
localized resource/speech paths. Parser probes cover these flags in all three
expansion executables. See [COMMAND_LINE.md](COMMAND_LINE.md).

## Renderer address cross-reference

These correspondences are identified from the routines and their consumers,
not merely from a matching instruction prologue.

| Operation | Base 1.0 | Expansion CD |
|---|---|---|
| Actor root LOD selection | `0x2b30` | `0x2b30` |
| Terrain loader | `0x20238` | `0x228cc` |
| World drawing | `0x21008` | `0x23704` |
| Scene insertion/order | `0x21bec` | `0x242fc` |
| Environment draw | `0x25b68` | `0x288f8` |
| Affine texture rasterizer | `0x534ac` | `0x59534` |
| Directional-light initialization | `0x5a888` | `0x60ecc` |
| Model light intensity | `0x5bc30` | `0x62688` |
| Model projection entry | `0x5c5d4` | `0x6303c` |
| Terrain projection | `0x5c9bc` | `0x63428` |
| Flat near clip | `0x5cc4c` | `0x636c0` |
| Texture near clip | `0x5ce10` | `0x6388c` |
| Vertex-light near clip | `0x5d06c` | `0x63af8` |
| Euler rotation | `0x5f0ac` | `0x66c24` |
| Polygon entry | `0x68be0` | `0x6effc` |
| Gouraud polygon dispatch | `0x7965c` | `0x823d4` |
| Planar VGA flat writer | `0x8aef8` | `0x91f90` |

The public graphics article explains the base pipeline. Expansion-specific
changes belong here so that readers can distinguish a renderer algorithm from
a particular release's content and integration.
