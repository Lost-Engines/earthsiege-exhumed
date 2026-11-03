Near the end of our Earthsiege image comparisons, six frames still disagreed with the original. The differences were tiny: 230 pixels across all six images. They belonged to distant radar buildings.

The models were present. Their positions, cameras and palettes agreed. Changing a pointer in the original game's memory nevertheless moved eleven visible pixels, without changing any model, pose or camera data.

That was enough to explain the last discrepancy, but reaching it took more than comparing screenshots. We needed to ask the original program smaller questions, control the conditions under which it answered, and then assemble those answers into complete recorded missions.

## Start with something the program can answer

A file format often admits several plausible interpretations. A field might be a count, an index or a byte offset. A model may look convincing with either of two rotation orders. A music value of 120 could be a tempo, a tick resolution or a timer frequency.

Following the consumer narrows those possibilities. The instruction that uses a field tells us whether it is signed, what it is multiplied by, and which table it indexes. Running that instruction with controlled inputs checks the interpretation against an observable result.

A useful experiment is deliberately small. Give a shield routine a known charge and a known incoming packet, then record the charge and damage it returns. Supply a target selector with a few carefully placed actors, then compare its choice and random state. Draw a narrow polygon and record exactly which pixels it touches.

The resulting fixture has three parts: a known starting state, the inputs at the routine's boundary, and the state or output after it runs. The new implementation receives equivalent inputs. Its answers can then be checked independently.

<figure><img src="../articles/reconstruction-loop.svg" width="800" height="420" alt="Known inputs go to an original routine and an independent implementation, whose outputs and state are compared"><figcaption>A controlled comparison. Expected outputs are checked after execution; they are not fed into the replacement as instructions for what to do.</figcaption></figure>

That last distinction is essential. Assigning the expected final position would make a motion test pass while testing no motion at all. We compare the calculated position, the pose that produced it, and the state that will influence the next update.

## Getting a usable copy of a live DOS world

Earthsiege runs protected-mode code through a DOS extender. Finding a recognisable instruction sequence in a host process does not give a single reliable offset for every game address. The extender's paging has to be followed.

We captured an initialized mission in a private DOSBox process. Independent executable signatures identified code pages and their page table. Following the mappings reconstructed the application's flat address space, including its existing heap objects. The retained initial capture contains eleven active actors and enough initialized state to call individual methods.

Video memory needs separate treatment. DOSBox stores VGA planes outside ordinary guest RAM. We identified candidate buffers from independent cockpit rows, then selected the one whose displayed page agreed with all 64,000 pixels of the 320 by 200 screenshot.

Even converting the palette can introduce a discrepancy. Earthsiege writes six-bit colour components. The reference expands each component by repeating its upper bits: `(v << 2) | (v >> 4)`. Scaling by `255 / 63` can differ by one level. A perfectly placed polygon can therefore fail an RGB comparison before any drawing algorithm is wrong.

The snapshot is useful because it contains a world the original program has already constructed. It saves us from guessing every constructor side effect before examining the routine that actually interests us. [Capturing and reconstructing the original address space](../research/reference-capture/)

## Running one routine without pretending to run a whole PC

For isolated experiments, we load the captured memory into Unicorn, an instruction emulator, and call original routines at known addresses. The x86 instructions execute. Hardware and operating-system interactions need explicit handling.

A music-driver experiment can record writes to emulated sound ports. A renderer experiment can implement the VGA operations exercised by that drawing path. A menu experiment can supply an in-memory file and retain what the original writer puts into it. Each experiment identifies the boundary it supplies.

Those boundaries keep the result interpretable. A target-selection test with controlled contacts tells us about selecting targets. It does not establish that the perception system would discover those contacts in a real landscape. A visibility test with no occluders cannot settle whether a building blocks sight. Those questions need their own experiments and later integration.

A harness can also introduce its own bugs. Earthsiege defers some object destruction until a later callback phase. If a headless experiment skips that phase, a destroyed projectile may remain in its pool with a teardown virtual-method table. Calling it again on the next frame can fail. Restoring the missing phase fixes the experiment. This failure tells us about the harness's incomplete frame ordering.

This is why we keep small comparisons and complete runs. The small ones make causes visible. Complete runs establish whether the pieces have been connected correctly.

## The game supplied its own recordings

Earthsiege includes four TAP recordings. They contain inputs that the simulator can play back, giving us longer, repeatable sequences without asking a person to reproduce the same flight of mouse movements and button presses.

We built a DOSBox observer that reads guest state at verified instruction boundaries. The original executable, allocator, input packets, interrupts and game resources remain unchanged. The observer records actors, controls, damage, groups, random state, clocks, audio commands and video memory. It also retains the executable hash for the run.

The four recordings contain 9,300 packed input records. They do not correspond one-for-one with ordinary simulation frames. Dialogs consume inputs too, and reaching the end of a tape can execute a final frame without reading another packet. Summing every tape delta as though it were elapsed simulation time would conflate those paths.

<figure><img src="../articles/replay-path.svg" width="800" height="390" alt="Recorded inputs pass through ordinary frames or dialogs, then return results; observer samples are separate from the input stream"><figcaption>The recording supplies inputs. The observer supplies evidence about what happened after the original consumed them. Dialogs are part of that execution.</figcaption></figure>

The native reconstruction then runs the same inputs and calculates its own world. Across the retained comparisons, we check 7,032 simulation and exit states, camera values, both random streams and the returned mission files. Audio command order supplies another observable result.

Matching the random state is particularly useful. A missing draw may leave the current scene unchanged but shift every later choice. A selected target can agree by chance while the generator has already diverged. Comparing the complete generator state exposes that problem at the point it begins.

These recordings cover four particular runs. They give much stronger evidence than a few screenshots of a working cockpit, while still leaving other campaign paths and unusual situations to additional checks. [The unmodified DOSBox replay procedure](../research/reference-capture/#complete-unmodified-dosbox-replay)

## Time has more than one owner

Simulation state can agree while a blinking display differs. Earthsiege polls clocks in different places. The map painter reads time when it draws, separately from the time observed at the start of the frame. Speech completion and interface timers also have their own schedules.

There is retained image state as well. An instrument whose value has not changed may keep its existing pixels instead of redrawing. A page copy can restore an older clock image without reverting the logical clock. Starting a comparison with blank video memory loses that history.

We therefore separated two questions. First, does the replacement calculate the same gameplay and interface state under the observed inputs? Second, does it draw the same image when the asynchronous clock polls and page-copy schedule are aligned?

The aligned pass supplies observed clock values and call context. It then checks the state produced by the replacement's clock and presentation code. Expected clock states are checked afterward. Expected pixels never become drawing inputs.

That makes a timer adjustment quite different from altering a colour until two screenshots look similar. The timing inputs come from an independent observation of the original, and the drawing still has to produce the right output. The unaligned reports remain available too. [Timing and comparison method](../research/pixel-fidelity/#timing-and-comparison-method)

## A wrong pixel can identify a wrong instruction

Several discrepancies led to quite specific corrections.

A few one-pixel-wide textured faces appeared in the replacement when the original omitted them. The original raster routine rejects a polygon if either projected width or projected height is zero. Our row-oriented path checked height twice. Controlled narrow-quad cases confirmed the missing width check.

Two intersections on the cockpit display came from painting order: the original draws HUD children before the attitude display. Tracing the writes at those coordinates established which component owned the final pixel.

A left-edge difference after changing views came from an inclusive copy boundary. The original used a right coordinate of 320, producing a 321-pixel operation that crossed a planar page boundary. The result depended on partial groups at the edges of the copy. Treating it as an ordinary 320-pixel rectangle changed the retained image.

Other errors lived in transitions. A weapon label that changed from OFFLINE to operational retained enlarged bounds. A charge slider saved and restored backing pixels, including initially zero ones. A static rendering of either state could look correct while the sequence between them was wrong.

Each of these cases became a small regression fixture as well as part of the complete replay comparison. A future failure can point to the particular boundary, write order or retained rectangle that changed. [The corrected differences](../research/pixel-fidelity/#errors-corrected)

## The radar that read its neighbour's memory

After those corrections and timing alignment, 114 of 120 sampled frames agreed pixel for pixel. The remaining six differed only on a distant radar or listening-post model.

<div class="interactive-figure" id="radar-example">
<div class="figure-controls" id="radar-controls" hidden><label for="radar-frame">Recorded frame</label><select id="radar-frame"><option value="1-120">DEMO1 / 120</option><option value="1-1020">DEMO1 / 1020</option><option value="1-1440">DEMO1 / 1440</option><option value="2-660" selected>DEMO2 / 660</option><option value="2-720">DEMO2 / 720</option><option value="4-0">DEMO4 / 0</option></select></div>
<div class="pixel-comparison"><figure><img id="radar-original" src="../articles/radar-2-660-original.png" width="51" height="30" alt="Original DOS radar crop"><figcaption>Original DOS</figcaption></figure><figure><img id="radar-native" src="../articles/radar-2-660-native.png" width="51" height="30" alt="Native radar crop with the invalid-reference repair"><figcaption>Native, with repair</figcaption></figure><figure><img id="radar-difference" src="../articles/radar-2-660-difference.png" width="51" height="30" alt="Changed pixels marked in red on a dark background"><figcaption>Changed pixels</figcaption></figure></div>
<p class="article-readout" id="radar-result" aria-live="polite">DEMO2, frame 660: 46 pixels differ in the complete 320 by 200 frame. All are inside this crop.</p>
<p class="example-note">Nearest-neighbour enlargement of retained comparison pixels. Red is a diagnostic overlay colour. The native repair is an intentional departure from the original's invalid memory access.</p>
<details class="article-detail"><summary>See the complete original frame</summary><img id="radar-full" class="pixel-image" src="../articles/radar-2-660-full.png" width="320" height="200" alt="Complete original DOSBox frame containing the radar building"></details>
</div>

The two affected radar resources have two pose matrices. Some partition nodes in their distant representation request matrices numbered two through four, beyond the array. The renderer reads whatever follows it.

In the captured heap, those bytes include the next allocation's `ABLK` header, an allocator pointer and animation data. They are not extra authored transforms. Changing just the allocator pointer by 4,096 changes eleven visible pixels while the real model, poses, camera and clocks stay fixed.

<figure><img src="../articles/radar-memory.svg" width="800" height="350" alt="Valid pose matrices zero and one are followed by allocation metadata that invalid indices two through four read as transforms"><figcaption>The distant model asks for transforms outside its two-entry array. An allocator address consequently influences the rendered shape.</figcaption></figure>

A constant invented matrix could not reproduce that result across arbitrary heap layouts. It would take enough of the original DOS address space and allocation history to make the invalid read find the same neighbouring bytes.

We instead interpret the seven invalid references in each radar resource as model-local partition planes. This is a narrow, documented repair in the authentic reconstruction, and the original resource files stay unchanged. The local-space interpretation is a deterministic choice; it does not establish what the artists intended those indices to be.

To check the diagnosis, we rendered each of the six retained snapshots twice with the original code: once unchanged, and once with only that repair. The unchanged redraw reproduced the original mismatched pixels. The repaired redraw agreed with the native pixels. The repair accounted for exactly 36, 33, 30, 46, 54 and 31 changed pixels, with no extra changes elsewhere.

That modified-original experiment is kept separately from the unchanged DOSBox references. It explains a deliberate difference rather than erasing the evidence that there was one. [The radar investigation](../research/pixel-fidelity/#why-the-radar-differs)

## What the comparison establishes

For these 120 samples, every remaining scene difference has an explanation. It is a useful stopping point for that investigation, and a set of concrete checks we can run again.

It does not exhaust Earthsiege. Four recordings cannot visit every campaign branch, equipment combination or rare collision. Broader gameplay checks exercise those separately, while the retained original captures keep the replacement tied to observable behaviour.

The browser galleries serve another purpose. They make models, worlds and animations easy to inspect, using WebGL where convenient. Their depth-buffered triangles are not the original DOS polygon rasteriser. Pixel comparisons use the original drawing code and the native software renderer described in [How Earthsiege draws a frame](../graphics/).

The detailed [reference-capture notes](../research/reference-capture/) and [pixel-fidelity report](../research/pixel-fidelity/) retain the procedures, addresses and results behind this article. The same method also supports the [AI](../ai/), [mission](../campaign/) and [damage](../combat/) research: choose a question small enough to answer, run the original, and keep the answer available to check the replacement.
