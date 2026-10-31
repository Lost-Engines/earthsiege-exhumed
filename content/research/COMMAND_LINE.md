# Original executable command-line options

These are options in the supplied Earthsiege 1.0 DOS binaries, not options for
our C++ program. Arguments belong to different executables; identical letters
can have unrelated meanings. The [executable survey](../analysis/executable/index.html)
finds strings, but does not by itself identify the program that consumes them.

## The launcher and `-eggplant`

The normal entry point is `ES` (the installation's launcher). Its internal
child-process arguments include `-eggplant` for the shell/simulation handoff.
GO checks the complete, case-sensitive `-eggplant` string in `0x1272d`. DBSIM
also accepts only lowercase `-eggplant` through `0x58e74`, then requires the
authorization flag at startup. Its comparison branch contains an uppercase
`EGGPLANT` string too, but the case-sensitive dispatch table has only lowercase
`e`, so uppercase `-EGGPLANT` never reaches that branch. Original parser execution
confirms this otherwise easy-to-miss distinction. Without that flag the programs tell the user to launch ES.

This is an **internal launch handshake**, not an invulnerability or cheat-mode
switch. Supplying it manually does not create the mission, player and preference
handoff files that DBSIM normally receives from GO. The presence of the word
in the executable is not evidence of a secret gameplay command.

## Why ESCD contains `-B1000000`

ESCD's argument tables at `0x58c8` and `0x5904` construct these movie-player calls:

```text
playflic.exe flic\intro3.dfl -B1000000 -S83
playflic.exe flic\end.dfl    -B1000000 -S83
```

`-B1000000` selects a **1,000,000-byte movie preload buffer**. `-S83` overrides
movie timing to **83 milliseconds per frame**, about 12.05 frames/second.
Neither is a game cheat, a screen-resolution option or a general DOS memory
setting. These strings are in the launcher because it passes them to PLAYFLIC.

PLAYFLIC's own embedded help names the buffer and timing options. Its parser
branch `0x3ec` stores the B value at `0x155fc`; `0x3530` passes it to buffer
constructor `0x554`. That constructor allocates the smaller of the requested
buffer and the movie's stored length, then uses it for streamed reads. The
compiled default is 2,000,000 bytes; the launcher explicitly requests 1,000,000.

## PLAYFLIC.EXE

The movie filename is the first positional argument. The parser accepts `-` or
`/`, uppercase or lowercase option letters, and values attached directly to
the letter. Numeric conversion is decimal.

| Option | Meaning | Evidence |
|---|---|---|
| `-S<number>` | Milliseconds per frame; a nonzero value overrides the file timing | `0x398`, override at `0x499` |
| `-B<number>` | Movie preload-buffer limit in bytes; default 2,000,000 | `0x3ec`, `0x3530`, `0x554` |
| `-C<number>` | Read chunk size per frame in bytes; default 10,000 | `0x401`, `0x690` |
| `-D` | Diagnostic display | `0x3db`, debug readouts in playback |
| `-Q` | Disable sound; embedded help calls this “quit mode, no sound” | `0x416`, sound initialization at `0x23ec` |
| `-Z<number>` | Additional clock/audio synchronization zero-position adjustment in milliseconds | `0x3c6`, `0x213c`; absent from the embedded option list |

The retained help credits Jim Kent's READFLIC example, copyright 1992, and
points to the March 1993 Dr. Dobb's Journal source. The executable has adaptations
for Dynamix DFL data and HMI sound. This identifies a component's ancestry; it
does not mean Earthsiege's simulation was written in C rather than C++.

## GO.EXE shell

`0x1272d` accepts `-` or `/` for the following single-letter switches and folds
the letter to uppercase. It processes arguments from last to first. The special
`-eggplant` check remains exact and case-sensitive.

| Option | Confirmed effect | Remaining qualification |
|---|---|---|
| `-a` | Clears the initial-introduction flag at `0x7fd0a` | Consumed by shell dispatcher `0x3ba47` |
| `-c` | Enables alternate/CD resource-path handling | Uses `ALT_DRIVE` during startup |
| `-s` | Sets both shell sound/music enable flags at `0x7fcb8/9` | Does not choose a particular sound card |
| `-m` | Sets byte `0x7fd04` | Only the parser writes it; no direct consumer found in the supplied build |
| `-x` | Sets byte `0x7fd08`, bypassing several shell UI/input paths | Skips normal sound/input/cursor callback initialization; shutdown paths enter INT 3. A retained development bypass, not a supported headless mode |

## DBSIM.EXE simulation

The early parser `0x58e30` handles lowercase `-c` for the alternate/CD path.
The main parser `0x58e74` recognizes the table below. It accepts a leading `-`,
is **case-sensitive**, and consumes numeric/name values in the same argument:
`-CHERCULES`, not `-C HERCULES`. These are direct-program findings; forwarding
every option through the outer ES launcher has not been established.

| Option | Confirmed effect | Evidence / boundary |
|---|---|---|
| `-eggplant` | Permit internally launched execution | Checked again by main startup |
| `-c` | Alternate/CD resource-path handling | Early parser `0x58e30` |
| `-C<name>` | Override cockpit selection | `0x24394`; does not change the player's chassis |
| `-s` | Toggle sound-enable state | Byte `0xb5b68` starts enabled before parsing: one `-s` disables it, two re-enable it |
| `-l` | Low-memory mode | Byte `0xbda98`; also set automatically by the memory check |
| `-p<name>` | Recorded-input playback | Opens a TAP and restores its embedded handoff files |
| `-r<name>` | Record a TAP | Saves initial handoff files and enables recording |
| `-D` | Select demo playback through the resource/demo selector | `0x5771c`; sets both demo and playback flags when found |
| `-d` | Companion recording/playback data stream | Opens `<tape>.dmp`; comparison helper retained, but no supplied sidecars or verified gameplay producers (see below) |
| `-B` | Enter debugger on selected assertion failures | `0x57298` executes INT 3 instead of the ordinary diagnostic/exit path |
| `-t<number>` | Override the first HERC/wingmate portrait selector | `0x3ea50` → `0x3dab4`; full presentation interaction still unverified |
| `-S` | Use one drawing/presentation page instead of the normal double-buffer pair | Startup `0x5a9dc`: page pair 0/0 rather than 0/2; swap consumer `0x59b40`; does not change resolution |
| `-m` | Clear the auxiliary text display during startup | `0x5a9dc` calls `0x60d78`: fills 2,000 text cells with attribute-7 spaces when the auxiliary display is available; does not alter the game view |
| `-P` | Set flag `0xb5b69` | No direct consumer found; retained field with no demonstrated effect |
| `-V<number>` | Set signed-short field `0xb5bb2` | No direct consumer found; retained field with no demonstrated effect |
| `-W<number>` | Set signed-short field `0xb5bb4` | No direct consumer found; retained field with no demonstrated effect |
| `-T<number>` | Set signed-short field `0xb5bb6` | No direct consumer found; retained field with no demonstrated effect |

The accepted cockpit names are `ROADRUNNER`, `GUNSLINGER`, `RAPTOR`, `TOMAHAWK`,
`PATRIOT`, `PANTHER`, `HERCULES`, `COLOSSUS`; the name comparison is case-insensitive.
These are internal names, which differ from some displayed HERC names.

In particular, DBSIM's **`-B` is unrelated to PLAYFLIC's `-B<number>`**. DBSIM's
branch does not parse a numeric suffix; sending it `-B1000000` would merely set
the debugger flag. Unknown V/W/T meanings must not be advertised as arbitrary
resolution controls based on their letters alone.

## Research boundary

The switch branches, stored values, movie buffer consumer and launch tables have
been checked in machine instructions as well as decompiled output. `tools/check_command_line.py` additionally executes 34 original parser cases
without launching hardware or modifying handoff files; inputs and state are in
[command-line.json](../analysis/executable/command-line.json). All four supplied tapes now have complete `-p` DOSBox runs, including exact input consumption and original exit files. This does not establish the unsupported development modes as useful user options. Named
unknowns are retained here so future work can close them without presenting
inferences as working user options. Keyboard development controls are documented
separately in CHEATS_AND_DEVELOPMENT.md.

## Retained VCR sidecar and development bypasses

`check_vcr_sidecar.py` executes original `0xbd4` in inactive, recording, equal
comparison and unequal comparison states. It copies an 18-byte fixture into the
record buffer, or reads/compares that fixture and sets the mismatch latch at
`0x90190`. The registered phase-6 consumer `0xc84` flushes recordings by reopening
`<tape>.dmp` in append mode. The playback branch merely formats a local diagnostic
string: that alone neither reports a failure nor proves a state comparison ran.
There are no supplied DMP files and no direct call or embedded pointer to `0xbd4`
in the inspected DBSIM image. This is a retained diagnostic facility with no
verified gameplay producer in this release, not a ready-made determinism oracle.
See [the probe](../analysis/executable/vcr-sidecar.json).

GO `-x` skips input/timer callback installation in `0x45d24`, sound initialization
in `0x46235`, GUI callback setup in `0x1b0ff`, and mouse cursor callbacks in
`0x2bbbd/0x2bf15`; keyboard text dispatch also tests it in `0x12be8`. Cleanup
`0x45a68` and main shutdown `0x12ec7` can enter debugger traps. These consumers
explain its observed bypass behavior, but no supplied launch script establishes
an intended standalone workflow for it.
