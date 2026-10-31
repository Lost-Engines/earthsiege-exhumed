# Build, language and library evidence

This describes the supplied Earthsiege 1.0 executables, not Earthsiege 2 or the
other games in the parent directory. The application is demonstrably C++.
The exact compiler and version have **not** been established.

## C++ and original source organization

Two independent kinds of evidence support the language identification:

- Assertion/diagnostic strings retain `.cpp` source filenames.
- Executed resource readers, actor constructors and render/control dispatch use
  class layouts, virtual-method tables and derived-class overrides. These are
  observed runtime structures, not an inference from filename extensions alone.

Many engine objects use two-byte packing. That is a layout characteristic, not
a unique compiler fingerprint. The resource system constructs typed objects
from serialized tags; those tags are not evidence of standard C++ RTTI.

Representative retained source paths:

| Executable | Paths | What they establish |
|---|---|---|
| GO.EXE | `src\main.cpp`, `src\career.cpp`, `src\dialog.cpp`, `src\inventor.cpp`, `src\mechman.cpp`, `src\mission.cpp`, `src\shell.cpp` | Separate shell, career, inventory, hangar and mission modules |
| DBSIM.EXE | `C:\P\M\s\c\vcr.cpp`, `memory.cpp`, `base.cpp`, `explo.cpp`, `debris.cpp`, `rocket.cpp`, `bullet.cpp`, `collide.cpp`, `damage.cpp` | Recording, allocation, actors, effects and collision/damage modules |
| DBSIM.EXE | `C:\P\M\s\c\gunlist.cpp`, `mechsys.cpp`, `flyersys.cpp`, `world.cpp`, `terrain.cpp`, `mechview.cpp`, `gndtex.cpp`, `panel.cpp`, `phdd.cpp` | Weapons, simulation, scene drawing and cockpit module boundaries |
| DBSIM.EXE | `C:\P\M\s\util\mods.cpp`, `ovl.cpp`, `my_math.cpp`, `libio.cpp`; `C:\P\M\s\uh\my_math.h` | Shared utility, module/overlay, math and I/O source organization |

In this table, a bare filename continues the preceding directory. The survey
retains the exact strings rather than expanding them into guessed source files.
GO has 43 source-path occurrences representing 17 unique paths; DBSIM has 41
occurrences representing 25 unique paths under the `.cpp`/`.h` suffix search.
These counts describe surviving strings, not the total original source tree.

Browse them in the [executable survey](../analysis/executable/index.html), using
its Source paths category. The machine-readable
[strings catalogue](../analysis/executable/strings.json) includes module, flat
image address and recovered direct references. Repeated paths often belong to
different assertions. Computed calls and tables can evade that reference scan;
no listed reference does not prove a string is unused.

Original routines are under `analysis/executable/decompiled/`. Decompiler output
is a research aid, not recovered source: switch tables and calling conventions
can be wrong and are checked against machine instructions. For example, the
actor's virtual callbacks and per-class strength overrides are documented in
[CONTROLLERS.md](CONTROLLERS.md) and [PERCEPTION.md](PERCEPTION.md); original tagged
model construction is documented in [FORMATS.md](FORMATS.md).

## DOS execution and tooling clues

GO and DBSIM contain the extender identification:

> DOS extender Copyright 1991-1994 by Doug Huffman

PLAYFLIC and ESCD contain the earlier `1991 1993` form. These strings are in the
DOS startup/extender portion, outside the flat application string survey. They
identify that component's credited author; they do not identify the C++ compiler.
Do not label the extender DOS/4GW or DOS/4G without further evidence.

The application uses 32-bit protected-mode code. DOS executable startup,
extender loading/paging and the flat application are separate layers. The
verified flat-image file offsets are `0x48fd` for GO/DBSIM, `0x47f2` for PLAYFLIC,
and `0x4831` for ESCD. [REFERENCE_CAPTURE.md](REFERENCE_CAPTURE.md) explains how
an actual DOSBox snapshot was unpaged and checked against executable signatures.

VGA ports, planar backing memory, selector-based texture access and fixed-point
math appear directly in the renderer. Specialized raster routines may include
hand-written assembly; their existence does not make the whole game an
assembly-language project. Distinguishing compiler output from every individual
assembly routine would require further provenance.

The binaries retain assertions with source lines, an `assert.log` name, stack
and null-code-pointer diagnostics, and an optional debugger-break assertion
path. They are production binaries with diagnostic machinery still present.
These clues do not establish that they are unoptimized developer builds.

The eight shell BND files are verified live module settings; the 63 simulator
BNDs are retained parameter snapshots rather than the source of its runtime
constants. See [RESOURCE_AUDIT.md](RESOURCE_AUDIT.md). They preserve leading values
that decode as plausible 1994 timestamps. Their interpretation as build times is
provisional: the shell loader copies them, but no timestamp consumer is identified. A plausible
date alone is not a release date or a compiler signature. Their raw bytes are
available in the [data-table inspector](../analysis/tables/index.html).

No original project files, makefiles, linker command files or complete debugging
symbols have been identified in the supplied material. Borland identification
in external Earthsiege 2 research is **not** confirmation for this ES1 build.
There is currently no basis for specifying a precise compiler version or IDE.

## Libraries and engine components

**HMI Sound Operating System (SOS)** is confirmed. The original SoundManager
initializes the protected-mode HMI music/digital interfaces; HMP songs retain
hardware-specific track routing. The installation contains archived hardware
drivers, including OPL2/OPL3, MPU-401, MT-32 and other device paths. Our analysis
executes the original HMI scheduler and FM drivers, with explicit emulated port
and sample-output boundaries. This is much stronger evidence than finding an
HMI string in isolation.

[MUSIC.md](MUSIC.md) documents driver identifiers, routing, timer callbacks,
instrument banks, digital percussion, in-game song selection, positional audio,
audition generation and remaining hardware/mixer approximations. The
[music browser](../analysis/music/index.html) provides the listening examples.
The manual's Audio Technology credits also identify HMI.

The model/resource system uses Dynamix 3Space-style typed object hierarchies,
custom streams, tag registries, articulated instances and virtual renderers.
Their serialized formats and original consumers are documented in FORMATS.md,
ANIMATION.md and RENDERING.md. This is an engine-specific object system; it does
not imply use of a modern C++ standard-library scene framework.

C-runtime facilities for formatted text, memory and file operations have been
identified and are explicit boundaries in the original-code harnesses. We have
**not identified** standard-library containers, standard C++ RTTI/type_info,
or a language-exception/unwinding implementation. That is a bounded negative
finding, not proof that the original compiler could not support those features.
Custom error/assertion handling and virtual tables must not be mistaken for
language exceptions or RTTI.

PLAYFLIC also retains explicit READFLIC credits: Jim Kent, copyright 1992,
with a reference to the March 1993 Dr. Dobb's Journal source. Its help describes
the original example as C; this applies to the movie-player component, not to
the C++ simulation. The shipped player includes Dynamix DFL/HMI adaptations.
See [COMMAND_LINE.md](COMMAND_LINE.md) for its embedded help and verified options.

The analysis tools themselves use Python, Unicorn, Capstone, Ghidra and a small
VGA adapter. Those are our tools, not evidence of what Dynamix used. Similarly,
Nuked OPL3 is the modern emulation core used for auditions, not an original game
library. See [REFERENCES.md](REFERENCES.md) for provenance.
