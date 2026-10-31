# Attribution and scope

Earthsiege Exhumed is part of the [Lost Engines Project](https://lostengines.com/). It presents selected results of our reverse engineering of **Metaltech: Earthsiege**, developed by **Dynamix** and published by **Sierra On-Line** in 1994.

Original models, textures, text, artwork and musical compositions remain the work of their original creators and rights holders. This site is an independent research and preservation project, not an official release or an endorsement by the game's creators. Free availability of the game does not make its assets public domain.

The site contains derived display data and short audio excerpts for its exhibits. It does not include a game installation, original executables, hardware ROMs or a playable game. Its source repository is not a grant of rights over the original game material.

## What the exhibits show

The HERC gallery and mission atlas use original geometry, resource bindings, palettes and recovered animation rules with modern WebGL drawing. They are inspection tools; their pixels, visibility and simulation state can differ from the DOS game. The mission atlas shows starting-state captures, including groups waiting to activate.

The sky exhibit shows captured output from original drawing routines with explicit camera and random inputs. Its panorama unwraps the horizon artwork; it does not simulate a 360-degree camera.

Audio excerpts follow the original HMI scheduler and OPL2/OPL3 driver paths. FM synthesis uses [Nuked OPL3](https://github.com/nukeykt/Nuked-OPL3), an LGPL project. Host mixing, resampling and analogue output are not hardware-perfect reproductions. No synthesizer emulator source or ROMs are bundled in this site.

## Evidence and related work

The [investigation](../story/) links findings to the [supporting research notes](https://lostengines.com/earthsiege/). A claim-by-claim source guide and snapshot hashes are also kept in the [site repository](https://github.com/Lost-Engines/earthsiege-exhumed). The native reconstruction, Earthsiege C++, is a separate project and is not yet published.

The visual design follows our companion projects: [Darker Discovered](https://lost-engines.github.io/darker-discovered/), [TFX Traced](https://lost-engines.github.io/tfx-traced/) and [Corncob Contemplated](https://lost-engines.github.io/corncob-contemplated/).

We label interpretations and limits explicitly. The northern map pattern may be a signature, but its author is unknown. A key combination absent from the sources we checked is not automatically a first discovery.
