# Mission launch state and random alternatives

The mission browser defaults to **Game launch**. Each preview keeps the original
GO launch outputs (`SCRIPT.DAT`, `MISSION.VAR` and `PLAYER.MEC`) together and feeds
that same set to the original DBSIM loader and actor constructors. The launch
runs counter preparation, compilation, terrain/options overrides, player roster
generation and the original handoff writers. It does not mix compiled geometry
with the old unrelated DEMO1 test roster.

There are **674 captured states**: two original-generator warm-up values for
every supported campaign occurrence and single-mission template, plus four
original TAP handoffs. The **Context** selector distinguishes occurrences in
different campaign stages; **Variation** selects repeatable random examples.
Battle-set graph links select the corresponding node and step. Inputs, roster,
all 100 counters and relevant briefing/condition counters are inspectable.

Campaign examples start from the original new-career hangar and fresh event
history at the chosen stage. They are explicitly labelled inspection scenarios,
not recordings of a completed campaign. Later mission outcomes and equipment
cannot be inferred from the filename. Original TAP handoffs preserve actual
recorded states; a career/hangar import restores its working state before a new
launch with the selected repeatable RNG initialization.

The old compiler-only fixtures remain under **Advanced compiler diagnostics**.
They bypass launch preparation and header overrides, and retain their separate
DEMO1 equipment fixture. They are useful conditional-branch tests, not authentic
campaign saves. Changing context, randomness or display options preserves the
camera; selecting a different mission resets framing.

## Original launch preparation

GO `0x35873` loads a mission and calls compiler `0x3276c` at `0x35aac`.
Before that call, `0x359d9..0x35aa5` prepares the 100 signed shorts at `0xab244`:

| Counter | Campaign launch | Single-mission launch |
|---|---|---|
| 0 | Retained result/history value | Cleared to zero |
| 1 | Current campaign node from selected career block +6 | 99, the single-mission marker |
| 2 | Current step from selected career block +8 | Zero |
| 3 | Menu time/palette option at `0xaacc4` | Same menu option |
| 4, 5, 6 | Three successive bounded random draws, each 0–11 | Same |
| 7–99 | Retained from current campaign state | Cleared to zero |

Single-mission mode clears the entire vector before setting counters 1 and 3–6.
Campaign mode preserves all entries except 1–6. The career loader restores the
saved counter vector; mission results, destruction notifications and spatial
triggers can subsequently alter it. Entering a new campaign node clears the career record's counters through
`0x161ae`, called by `0x16f22`. The live GO counter array is separate: the ordinary
Next Mission path does not clear it, so compilation and the following save
restore the live values over that cleared record. Consecutive native campaign
cycles confirm this distinction. Completing another step within the same node
also preserves the live counters. See [CAMPAIGN.md](CAMPAIGN.md) and
[MISSION_RUNTIME.md](MISSION_RUNTIME.md).

There is therefore no unique full counter vector determined solely by a later
mission filename. Earlier events and the selected battle-set path matter. For
example, B0_C1_61 is step 6 in BTLSET_0, but step 4 in BTLSET_1 and BTLSET_2.
Source B0_C1_10 checks counter 15 > 0 and conditionally patches one building's
initial condition to zero. The all-one fixture exercises many such branches at
once; it does not stand for a coherent successful campaign history.

## Original random generator

GO startup calls `0x386f4` with the time-derived value modulo 128. The constructor
copies 56 original nonzero seed words from `0x81720`, starts indices at 24 and 55,
then advances the generator that many times. Other shell operations consume
this same stream before a mission starts. A new seed value of **zero still uses
the original nonzero word table**; it is not the browser's old all-zero RNG state.

Mission compilation consumes further random draws for authored alternatives,
including late-bound group/member variants. Fixed randomness is useful for a
repeatable inspection, but the existing `seeded` fixture uses an explicitly
invented word vector for compiler verification. It should not be described as a
capture of the normal startup generator state.

## Post-compilation overrides

`0x35ab9..0x35b7a` applies settings before writing SCRIPT.DAT:

- Campaign mode clears the unlimited-ammunition/power and invulnerability
  options, writes difficulty 2, and selects terrain from the current node using
  `[1,2,2,0,0,3,3,3]` (DESERT=0, TEMPER=1, ICE=2, URBAN=3).
- Single-mission mode applies the five menu options for those cheats,
  difficulty, environment and time/palette, and chooses terrain with another
  bounded random draw of 0–3.

The old compiler-only fixtures omit these changes as well. For example,
B0_C1_61's source compilation produces TEMPER, but a campaign launch in node 1
changes it to ICE. B0_C3_2A remains DESERT in node 3. The Game launch view now applies these changes; older compiler diagnostics
retain their unmodified headers.

## What randomness changes

Comparing the existing zero and seeded fixtures with identical counter inputs:

| Changed compiled table | Missions affected, out of 75 |
|---|---:|
| Points | 23 |
| Routes | 20 |
| HERC definitions | 54 |
| Flyer definitions | 5 |
| Building definitions | 13 |
| Groups | 16 |
| Triggers | 3 |
| Areas | 2 |

Header environment and palette fields differ in 37 and 55 missions respectively.
After original actor construction, 63 missions have different HERC positions,
headings, chassis or weapons, five have different flyers, and ten have different
buildings. These comparisons exclude native heap pointers. Terrain-placement
lists are identical between these two old fixtures; that does not remove the
terrain-bank overrides in the real launcher.

The preparation probe also initializes the **original** RNG and runs original launch
preparation, compiler and header overrides with warm-up counts 0 and 17:

- B0_C1_61 changes route/HERC records and environmental settings.
- B0_C6_1A changes HERC, flyer, building and group records. These two samples
  contain 16 versus 17 source HERC definitions and 7 versus 8 building
  definitions; definitions are not necessarily all constructed active actors.
- SM_PTL01 changes points, routes, HERC/building/group records and terrain bank.
- B0_C3_2A keeps identical mission tables in these two samples; its environment
  and palette change. This observation is specific to the compared samples.

## Reproduction and imports

Build all coherent launch captures (four local worker processes):

```sh
PYTHONDONTWRITEBYTECODE=1 .venv/bin/python tools/build_launch_views.py --all --jobs 4 --resume
```

`analysis/missions/launches/` retains each raw file set alongside its typed
handoff, loader plan, constructed world, counters, RNG states, equipment,
context and SHA-256 hashes. Its `checks.json` records the 674-case run. Each
capture compares original loader output and actor/group construction with the
independent placement decoder. Original installed files and saves are never
written; the native harness supplies memory-only file transport and allocation.

Inspect the current state of an actual saved career with its matching hangar:

```sh
.venv/bin/python tools/build_launch_views.py --mission B0_C1_61 \
  --career /path/to/CAR_0.CAR --hangar /path/to/CAR_0.MEC \
  --seed 17 --id my-career --label 'My saved career'
```

The caller supplies the matching mission filename. The original career reader
restores the working state and equipment; the saved history slot is not a new
random seed. A save does not reproduce all intervening shell RNG consumption.
For an exact already-generated launch, import its coherent three-file handoff:

```sh
.venv/bin/python tools/build_launch_views.py --mission SM_PTL01 \
  --handoff-dir /path/to/DATA --id my-launch --label 'Captured original launch'
```

The folder must contain `SCRIPT.DAT`, `PLAYER.MEC` and `MISSION.VAR` from the
same launch; filename case is ignored. `--history` accepts an original
200-byte MISSION.VAR or a JSON array of 100 signed shorts for explicitly
controlled campaign examples. These are labelled supplied inputs. The exporter
writes both JSON and classic-script transport for HTTP and direct file opening.

`tools/check_mission_launch.py` retains 72 preparation checks and eight
compiler/header-override comparisons in `launch-state-checks.json`.
`tools/check_launch_import.py` checks original career creation, activation,
saving working/history slot 13 and importing that state with its counters and
roster; results are in `launch-import-check.json`.
`check_launch_scenery.py` checks actual launch terrain banks, every placement
and selected root in five representative maps, and captures urban variant 5
with the original rasterizer. `check_mission_browser.py` covers all 75 supported
mission scenes, contexts/random variations, terrain overrides, overlays,
camera preservation and clearing the two incompatible retained sources.

Six fresh-history C6 examples of SM_SCT50 produce authored HERC chassis `-1`.
The original indexes the byte before its type map and aliases the first loaded
chassis (Roadrunner in these captures), with empty weapons. The inspector
retains `authored_chassis: -1` and the resolved chassis separately. This is an
original out-of-range read, not evidence that all real campaign histories
produce those units; see [ACTORS.md](ACTORS.md).

## Portable launch verification

The companion C++ launcher now matches all **670** compiled launch captures
(the other four are recorded TAP handoffs). SCRIPT.DAT, MISSION.VAR and
PLAYER.MEC match byte for byte, together with the complete final RNG state.
Four additional original new-career captures check all 41 state records,
initial hangars, name permutations and RNG consumption. The constructor writes
the current armory to every initial on-disk history block, while its inactive
in-memory inventories remain empty until a saved career is loaded.

`capture_launch_roster.py` adds 32 original exports with inactive members,
nonzero selected crew and unequal pilot health. GO `0x22a05` uses the selected
pilot's health for **every** exported HERC. Its first per-HERC word is a portrait
identity, not a hangar slot: single-mission players receive a bounded random
identity, campaign players use the career-index record, and wingmates use
name × 3 + variant. The following word is the single-mission crew index or
campaign rank. The original writer retains its absolute selected-crew index
in the file header even while traversing the active roster cyclically.

Hangar artwork construction also changes data: `0x23883` replaces destroyed
weapons with empty slots and changes missile-type value 5 to 0 for weapon IDs
9–11. The complete launch comparisons exercise that normalization; checking
only the mission compiler would miss it. The ordinary single-mission hangar
writer saves its eight selectable player chassis, excluding the extra generated
wingmate slots.

### Consecutive launch and return comparisons

`capture_shell_preparation.py` retains 33 actual mission-choice paths, including
post-compilation crew activation and final roster export. `capture_campaign_cycles.py`
retains eighteen successive launch/return/repair/next-mission transitions across
all three battle sets and both favorable and unfavorable outcomes. Simulation
results are controlled inputs; compilation, saves, loading, rewards, automatic
repairs and graph transitions execute as original code. The C++ owner matches
all meaningful output bytes and both final random states for each transition.

Original SCRIPT.DAT writes do not truncate an older, longer file. The cycle
capture retains the full file and separately records the last written byte;
comparison uses that original write extent, excluding the stale tail.

The registration harness now supplies an allocated name record. Earlier
constructor-only captures used address zero, which left constructor data intact
but bypassed later saves guarded by a non-null record pointer.
`check_launch_index_storage.py` rechecks all 670 retained handoffs and confirms
that their SCRIPT.DAT, PLAYER.MEC, MISSION.VAR and RNG results are unchanged.
The new cycle captures require real working-state saves throughout.

## Full campaign journeys and authored runtime checks

The later [mission fidelity investigation](MISSION_FIDELITY.md) extends these
launch and short-cycle checks to six terminal campaign journeys and authored
mission simulations. It documents BST random-mission selection, actual later-career
handoffs, construction order, objective mapping and bounded original defects.
