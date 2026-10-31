## A machine is more than its silhouette

At first, Earthsiege looks like a collection of chunky robots on open ground. Then you lose an arm, discover that the weapon on it is gone too, and start thinking rather carefully about what to shoot off the next enemy. The shape of a HERC is also a description of what it can survive and what you might bring back to the hangar.

That made it a good candidate for a reconstruction—and a demanding one. A model viewer could show us the machines, but it could not tell us when a squad activates, which building a mission wants destroyed, or what a successful sortie changes in the campaign. We needed both the data and the code that gives it meaning.

The first job was to unpack the VOL archives and identify their contents. We catalogued 2,484 archive members: models, textures, palettes, fonts, cockpit artwork, speech, music and mission resources. This public selection concentrates on the parts that are most rewarding to explore. The [supporting research notes](https://lostengines.com/earthsiege/) preserve the detailed formats, instruction addresses and comparison results behind these exhibits.

<figure><a href="../models/"><img src="../images/models.png" width="1000" height="650" alt="The recovered Samson, assembled with its original weapons" loading="lazy"></a><figcaption>The Samson in our model inspector. Its body, articulated parts and fitted weapons come from the original game data.</figcaption></figure>

## Opening the hangar

The model files contain hierarchies: parts nested inside other parts, with transformations, animation sequences and alternative shapes. There are 44 model resources and 401 top-level shapes in the inspected set. Those numbers need a little interpretation. A HERC’s alternatives are usually distance detail levels; a scenery file can contain many completely different buildings or landforms.

Names need interpretation too. `HERCULES` becomes the Samson, `GUNSLING` the Outlaw, and `PANTHER` the Rhino in the game’s text. Enemy `SCORPION` is the Stingray. The manual and the shipped name tables make the gallery much easier to navigate than a list of filenames would.

Weapons are assembled onto hardpoints. Rendering a bare mesh can therefore leave peculiar placeholder shapes where equipment belongs. Our viewer follows the equipment bindings, so you can inspect the starting loadout, choose other weapons, or look at the chassis alone. Damage states show which sections and weapons survive a particular hit. These are captured outcomes, rather than an animation of an entire battle.

Movement brought another lesson. A walking animation changes the pose of the body as well as the legs. If a viewer recentres and refits the camera on every frame, that motion turns into an apparent zoom. Keeping the camera fixed lets the machine move naturally. The animation timing, pose blending and torso layers now follow the original fixed-point calculations; browser rendering makes them convenient to examine from any angle.

[Open the hangar →](../models/)

## A world built at launch

Our first mission scenery view had an embarrassing omission: almost no buildings. The terrain placement file was perfectly happy to supply hills, but the listening posts and factories lived somewhere else. They are constructed actors, with their own positions, model variants, allegiance and damage state.

There was a second trap. A mission source is a template, not a finished battlefield. The launcher resolves conditions and random choices, prepares campaign counters, selects terrain, generates equipment and writes the files that the simulator consumes. Reading only the source can combine alternatives that never coexist—or miss something the launcher adds.

The atlas therefore uses complete launch captures. Its campaign examples have an explicitly fresh chapter history and the original starting hangar. They are useful, repeatable examples, not substitutes for every possible saved campaign. Switching between the two random variations shows where a template permits different results while keeping each displayed state internally consistent.

<figure><a href="../missions/?focus=building:4#B0_C3_2A"><img src="../images/mission.png" width="1000" height="650" alt="A recovered Earthsiege base with buildings and route overlays" loading="lazy"></a><figcaption>Terrain placements, constructed buildings and mission routes meet in the atlas. The overlays and reference ground are inspection aids; the mission is not running.</figcaption></figure>

B0_C3_2A is a useful place to look. Its objectives concern enemy listening posts and radar towers. Those targets are members of a particular ground group; the nearby generator belongs to another. A collection of attractive buildings would not be enough to reproduce that mission. The relationships matter.

Even the colours have a runtime step. Much of the terrain references a material whose stored palette entry is only a placeholder. The engine fills it from the selected world’s colour ranges. Without that binding, very different environments all looked like the same beige hill. The launcher also selects urban scenery in the C5 and C6 chapters, not just the conspicuously red C7 maps.

[Visit the listening posts](../missions/?focus=building:4#B0_C3_2A), or [find the bent structures in urban variant 5](../missions/?focus=terrain:5#B0_C5_00).

## A possible signature at the edge

Near the northern edge of the map used by B0_C1_61, scattered scenery forms a shape that looks remarkably like **“Jö”**. It is easier to read from above than from the cockpit.

<figure><a href="../missions/?focus=pattern#B0_C1_61"><img src="../images/signature.png" width="1000" height="650" alt="Scenery at the northern map edge arranged in a pattern resembling Jö" loading="lazy"></a><figcaption>A possible signature, made from ordinary scenery placements. The interpretation is ours; the placement coordinates are in the game.</figcaption></figure>

We can establish where the objects are and how they are drawn. We cannot yet establish who placed them, or prove that the intended reading is a name. It is a lovely detail to find, but assigning it to a developer would go beyond the evidence.

Another leftover is less mysterious. The retained mission `SM_ESC50` has a briefing that exercises overlapping numeric ranges with placeholder phrases. The original text interpreter produces that strange prose too: it is not an extraction error. Its systematic cases strongly suggest a text-system test. We found no selection of it in the supplied single-mission or campaign tables. The atlas keeps it under retained missions so it can be inspected without presenting it as a normal campaign assignment.

[Look at the northern pattern →](../missions/?focus=pattern#B0_C1_61)

## What does “eggplant” unlock?

The executables contain a tempting command-line argument: `-eggplant`. It sounds like exactly the sort of secret password a 1990s game might hide. Following its parser gave a more prosaic answer. It is the internal handshake used when the launcher starts the shell or simulator. It does not enable invulnerability, and supplying it alone does not create the mission files those programs expect.

Another eye-catching argument, `-B1000000`, belongs to the movie player. It requests a one-million-byte preload buffer. The program receiving an option matters as much as the string itself.

There are more interesting controls in the simulation’s keyboard handler. **Alt plus the arrow keys** translates the player locally, while **Ctrl plus Left or Right** changes heading. **Alt+Ctrl+1 through 9** selects the step size. Controlled execution of the original handler verified those operations; the branches do not require a separate cheat-enable flag.

We did not find that exact Earthsiege 1 step-size combination in the public sources checked during the investigation. That makes it worth recording, without claiming nobody has ever found it before. Earthsiege 2 cheat lists are not evidence for what this earlier executable accepts. The [controls research](https://lostengines.com/earthsiege/docs/CHEATS_AND_DEVELOPMENT.md) separates confirmed handlers, known public tips and unresolved cases.

## Listening through the right driver

Earthsiege’s music is not adequately described by exporting a MIDI file and choosing a soundfont. Its HMI Sound Operating System can route different tracks to different devices, and the normal FM setup combines synthesised notes with the game’s own digital percussion.

We ran the original scheduler and drivers to recover their events, then used chip emulation to render the FM output. The header value 120 turned out to be a timer frequency in hertz, rather than a tempo or ticks-per-quarter-note declaration. That distinction changes how a score should be played.

In a mission, the game selects one of three paired scores. Nearby or detected threats can request the encounter variant. The old song fades down, stops, and the other starts; they are not crossfaded together. The controller even has an unusual check in which a sufficiently distant living flyer can prevent the return to the quieter version. We kept the verified comparison instead of replacing it with a more intuitive proximity rule.

[Compare OPL2 and OPL3, and hear a patrol/encounter pair →](../sound/)

## Asking the old program

When two interpretations of a file both look plausible, pictures alone are poor evidence. Our most useful tool has been to execute a small part of the original program with controlled inputs, capture its output, and compare that with the reconstruction. This works for animation transforms, mission compilation, damage, audio events and drawing routines.

The sky exhibit is an especially direct example. Its pixels come from the original routines, not a browser approximation of the artwork. You can compare all 24 environment/time/visibility combinations, play a short cloud sequence, and unwrap the four horizon sections into a complete panorama.

<figure><a href="../worlds/"><img src="../images/sky.png" width="1000" height="650" alt="Original Earthsiege sky drawing captured with a controlled camera" loading="lazy"></a><figcaption>The original sky renderer, isolated from the simulation. Cloud motion and the horizon strip can be inspected separately.</figcaption></figure>

Full recorded input sequences make a stronger check than isolated functions. Four original recordings supplied more than nine thousand input packets and seven thousand comparison states. Of 120 sampled images, 114 matched exactly. The remaining six contained only 230 differing pixels in total—but they led to a real bug in the old executable.

A radar/listening-post model could use invalid pose-matrix indices. Its appearance then depended on unrelated heap contents. Changing an allocator header changed the original pixels. Trying to imitate those pixels would mean reproducing an accidental memory state, not recovering an authored visual rule. The native reconstruction uses a bounded repair, and the [pixel-fidelity notes](https://lostengines.com/earthsiege/docs/PIXEL_FIDELITY.md) document the exception. Those sampled results are a defined comparison, not a claim that every possible frame has been checked.

## Traces of the workshop

Earthsiege also leaves evidence of how it was made. Embedded `.cpp` paths point to pieces of the career system, recorder and simulation. Executed virtual dispatch confirms C++ object machinery. The typed model hierarchies belong to Dynamix’s 3Space-style resource system, and the audio layer identifies HMI’s Sound Operating System.

Those clues do not establish an exact compiler version. The DOS extender identifies Doug Huffman, but that is not a reason to label the whole program Watcom or Borland. The movie player has separate ancestry: it retains a credit to Jim Kent’s READFLIC example and the March 1993 *Dr. Dobb’s Journal*. Different tools and libraries can coexist in one shipped game.

The result of this work is **Earthsiege C++**, alongside the analysis tools used to check it. The native program aims to reproduce the original rules and software drawing; these public viewers offer a more convenient way to inspect the recovered material. There is still a distinction between what a bounded comparison proves and what a complete playthrough might reveal. Keeping the evidence attached to each finding makes that distinction useful, rather than something to hide.
