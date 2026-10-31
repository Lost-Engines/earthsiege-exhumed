# Cheats, development keys and public reports

Scope: the supplied Earthsiege **1.0** DOS simulator. These findings were checked
against its command tables and instructions; the direct movement controls also
have original-code execution captures. They must not be mixed with Earthsiege 2
cheat lists. Launch arguments, including `-eggplant`, are explained separately
in [COMMAND_LINE.md](COMMAND_LINE.md).

## Direct movement controls

These branches are in the ordinary HERC command handler `DBSIM 0x11050`.
The weapon list receives the command first. There is no separate cheat-enable
condition inside these branches. These are immediate actor-position/heading
writes, bypassing the ordinary gait movement for that command; a subsequent
simulation update can still apply its normal collision or mission rules.

| Keys | Original effect | Branch |
|---|---|---|
| Alt + Left / keypad 4 | Move by minus the selected step along local X | `0x110fc` |
| Alt + Right / keypad 6 | Move by plus the selected step along local X | `0x1114f` |
| Alt + Up / keypad 8 | Move by plus the selected step along local Y | `0x111a0` |
| Alt + Down / keypad 2 | Move by minus the selected step along local Y | `0x111f2` |
| Ctrl + Left / keypad 4 | Add the selected angular step to heading | `0x11244` |
| Ctrl + Right / keypad 6 | Subtract the selected angular step from heading | `0x11264` |
| Alt + Ctrl + 1–9 | Choose the translation and angular step | `0x110d7` |

The nine numeric choices are **500, 1000, 1500, 2000, 3000, 4500, 6000, 7500,
9000**, respectively. Both values start at **2000** in the constructed original
fixture. Translation uses world-coordinate units; rotation uses the engine's
65,536-units-per-turn angles. The same number therefore has different units in
the two operations. Local axes rotate with the HERC; these are not fixed compass
north/east movements.

`tools/check_development_controls.py` executes **216** commands: all nine step
settings, four cardinal headings and six movement/turn commands. The real world,
player, weapon-command precedence and complete HERC handler run unchanged.
[development-controls.json](../analysis/interface/development-controls.json)
retains inputs and resulting positions/headings. This establishes handler
behavior, not every possible cockpit/dialog event-routing context.

## Other unusual controls

- **Ctrl+1** toggles `0x919ce` between +1 and -1 (`0x5a070`). The normal movement
  consumer `0x11afc` uses this for its forward/reverse control regime and throttle
  limits. It is a movement-mode control, not a weapon or invulnerability cheat.
- **Alt+S** toggles the recording/playback pause flag `0xb5b92`, but only when
  recording or playback is enabled (`0x59e5d`). It is not an unrestricted
  normal-mission AI freeze in this ES1 build.
- **Alt+Ctrl+P** calls `0x15a5c`. This computes nearby friendly and opposing
  strength, subtracts 600 from friendly strength with a floor at zero, then
  repeatedly calls the controlled HERC's damage routine with `(64,64)` while
  opposing strength exceeds it, reducing the assessed excess by 400 each time.
  This can damage the player; it is not a kill-all-enemies or god-mode command.
  The branch and full consumer are identified statically; an interactive purpose
  and complete execution trace are still unconfirmed.

Ordinary controls and dispatch precedence remain in [INPUT.md](INPUT.md).
The [raw command tables](../analysis/interface/input.json) retain the complete
numeric codes and branch addresses, including normal cockpit/weapon controls.

## What was already public?

The public ES1 material checked describes a **single-mission/instant-action
loadout leaking into a career** exploit. One archived description also discusses
swapping patched and unpatched GO.EXE versions. This is a reported shell/save
state exploit, not evidence for a secret simulator key. It has not yet been
reproduced in our supplied installation. See the
[Game-Cheater ES1 entry](https://thelp.zdrojak.dev/?file=Game-Cheater+9.02%2Fcheaty.json.gz&topic=1814).

ES2 has a published `-SPRUNKNOWN` cheat mode, repositioning/turning keys, AI
pause and other commands. Their existence is relevant prior art, but does not
establish the ES1 key mapping or gating. In particular ES2's reported Alt+S
meaning must not be copied over the ES1 recording guard. See
[GameFAQs' ES2 list](https://gamefaqs.gamespot.com/pc/197196-earthsiege-2/cheats).

The exact ES1 step selector and handler behavior above were not found in the
ES1 sources checked during this audit. That makes them useful findings for this
analysis, **not a substantiated claim of first discovery**. Old FAQs, magazine
material or other research may already document them.

The manual also exposes invulnerability/unlimited-ammunition choices in mission
parameters. Those are ordinary game options, not newly discovered cheats.
A systematic search of every text-entry, shell and modal callback is still
needed before claiming this is an exhaustive list of all possible secrets.
