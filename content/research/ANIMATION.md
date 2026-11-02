# Original articulated animation channels

The model browser now runs the original queued-transition state machine in JavaScript. Direct sequence selection remains useful for inspection; the request selector asks the controller to find an authored transition, wait for its exit frame, blend into the destination and optionally stop on arrival. Reverse playback changes the signed Q8 rate and re-searches a queued route. A missing route leaves the current sequence running.

## Verified consumers

All addresses refer to the DBSIM flat image:

| Routine | Role |
|---|---|
| `0x619f0` | Construct an 82-byte channel |
| `0x6200c` | Reset sequence, frame and elapsed time |
| `0x621ac` | Search authored transition exits |
| `0x6265c` | Request a destination sequence/frame |
| `0x626c8` | Change signed Q8 playback rate |
| `0x62718` | Advance frames, queued transitions and root motion |
| `0x61bc8` / `0x61c4c` / `0x61cd4` | Retrieve and accumulate forward/reverse movement |
| `0x62dfc` / `0x61810` | Apply blended poses and build hierarchy transforms |
| `0x61da8` | Interpolate accumulated root motion |

`tools/check_animation_channels.py` captures 8,955 request/playback traces across all sixteen resources with transition tables. Its independent JavaScript counterpart compares **98,505 channel and accumulated-motion states**, including forward, reverse, half-speed, cancellation, unavailable routes and stop-on-arrival. This covers requests for any destination frame (`-1`), used by the ordinary HERC animation consumers. Exact destination-frame requests now have the additional captures described below.

`tools/check_channel_poses.py` captures **5,120** poses, hierarchical transforms and interpolated root-motion results from those traces; `check_channel_poses.js` compares the browser implementation independently. Matrix byte 19 is unwritten padding, as verified with five sentinel values. Only that byte is excluded; basis, type and translation fields are compared.

## Time and movement

Authored frame durations are used directly. The original simulation scales a nominal 100 ms step with its signed Q8 frame ratio; there is no universal ten-animation-frames-per-second rule. The browser speed multiplier is an inspection control; LOCOMOTION.md documents how player and AI controllers choose their rates.

Blend fraction is the original rounded integer `(duration / 2 + elapsed * 1024) / duration`. Reverse stepping and overshoot follow the native short-width arithmetic. Root movement is kept separate from skeletal node zero. The browser defaults to an in-place preview. **Apply world movement** applies the accumulated/interpolated root transform and draws a fixed ground grid and travelled path; **Fit travelled path** adjusts the camera only when requested. Locomotion examples similarly apply their verified world position and heading relative to the starting position.

Sequence numbers are resource-specific. Identical indices should not be labelled as universally meaning walk, damage or firing. Transition priorities and the source's part list affect the route and pose application. Lower-detail HERC roots share the full-detail animation instance and use verified part-ID remapping.

## Runtime integration

The native game now connects the animation channels to movement, aiming, damage, AI and weapons. Complete original recordings check frame ordering and accumulated state; see [the comparison audit](ANALYSIS_STATUS.md). The browser uses a depth buffer for convenient inspection. The native game uses the separately verified original painter/span renderer.

## Exact destination frames

`capture_exact_animation.py` adds 6,144 request traces across all sixteen
transition-bearing resources. `check_animation_channels.js
analysis/models/native-exact-channels.json` independently matches **61,400**
request, advance and root-motion states, including explicit arrival frames,
already-satisfied requests, stop-on-arrival, reverse playback and rerouting.
The previous 98,505 any-frame comparison states still match.

`0x6265c` immediately satisfies a request only when its sequence/frame already
matches at elapsed time zero (or the sequence is -1, cancelling the request).
`0x621ac` searches transitions in playback order. A cyclic destination accepts
any entry frame; a noncyclic destination accepts an entry before the requested
frame when going forward, or after it in reverse. An equal entry is accepted
only when the current elapsed time is zero. Arrival checks require both the
requested sequence and requested frame, unless the requested frame is -1.

Eight probes exhaust the original search budget when direction is reversed
during a blend: its next-frame index belongs to the other sequence, exceeds
the current sequence's frame table, and the cyclic search cannot return to
that invalid starting index. These are retained with before-state and failure
address, not counted as successful complete traces. The browser bounds that
search and displays a message asking for the blend to finish before another
request. It does not reproduce an unbounded original table walk. This is an
inspection safeguard, not evidence that ordinary gameplay requests trigger it.

The inspector now accepts an explicit destination frame (−1 means any).
`check_model_motion_browser.py` exercises Pitbull/BULLDOG sequence 4 and an
original Samson movement example, checks visible displacement with unchanged
camera matrices, verifies explicit path framing and the request controls.
