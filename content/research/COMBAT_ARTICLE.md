# Combat article: focused original-code checks

The public damage and physics article builds on DAMAGE.md, WEAPONS.md,
LOCOMOTION.md, COLLISION.md, EFFECTS.md, CAMPAIGN.md and
MULTIFUNCTION_DISPLAYS.md. Its scope is the October 1994 base CD simulator.
`tools/build_combat_article.py` captures additional controlled examples in
`analysis/combat/`. Analysis changes remain uncommitted for manual inspection.

## Engine damage is latched

Internal component names are STRINGS0.STR groups 12 (armour) and 13 (internals).
Component 5 is labelled ENGINE; its consumer is the reactor/power generator.
At `0x139e9`, in `0x13250`, the engine checks run only when both actor bytes
`+0xa4` and `+0xa5` are zero. A Q8 damage fraction greater than 128 sets the
light flag; a fraction of at least 193 sets the heavy flag. Once either flag
is set, subsequent hits do not reassess it.

A constructed Samson has capacity 700. Supplying accumulated damage 400,
then 600, then destroyed (-1), and running consequence checks after each
change retains `(light,heavy)=(1,0)` throughout. A fresh actor supplied 600
immediately becomes `(0,1)`. The fixture supplies internal damage directly
and invokes a zero-damage hit on a present section; it isolates consequence
logic rather than claiming a naturally occurring shot sequence.

The actual `0x14ee0` generation prefix at frame ratio 256 produces 15, 9 and
3 units for healthy, light and heavy states. Weapon allocation is the recorded
budget boundary; the prefix and shield update are original instructions.
This confirms a path-dependent original behavior, without inferring intent.

## The 150-point salvage cutoff is absolute

`0x10c38` compares each accumulated damage word against literal `0x96`.
It is not a percentage. An otherwise intact Samson left upper leg has armour
capacity 4,000 and salvage weight 2,000. At damage 149 its contribution is
1,925. At 150 it contributes zero despite 3,850 armour remaining.
The total hull score changes from 27,925 to 26,000. Samson's profile multiplier
is 1,024, so `0x14034` returns those same values before mission-level scaling.

All 201 values from 0 through 200 agree with the independent formula and
original valuation routines. The fixture bypasses mission collection eligibility
on purpose: it measures the value function for one section, not the reward
for leaving an enemy alive. Mission collection still requires an eligible
opposing HERC to be disabled or dead. `0x1d434` converts collected values using
Q10 factor 2,500; mission counter 7 adds 25,000 per unit separately.

## Shield exhaustion is a gate

The complete original HERC hit routine `0x13b44` is run on real articulated
Samson collision geometry, using an incoming packet with armour damage 360,
shield damage 60 and no splash. Attacker side 1 avoids the side-0 difficulty
multiplier. Speech/cockpit paths are avoided by using a non-player victim;
geometry, damage, effects and RNG run unchanged.

For starting shield charges 0 through 59, the body receives all 360 damage.
At 60 through 100, it receives none. There are 101 original cases. The packet's
armour field is independent of the shield remainder: `local_96` is retained
across `0xfca8`, and used in the body branch at `0x13b44`. This example assumes
the body is actually intersected; a shield volume hit need not hit a limb.

## Movement and damage illustrations

Three unobstructed 100-update Samson traces run `0x12038` and `0x14148`, with
speed request 500, fixed frame ratio 256 and supplied healthy/light/heavy leg
flags. Actual final rates are 150, 110 and 59 after chassis limiting. Travel
is 24,288, 9,183 and 5,060 native coordinate units. Acceleration, gait selection,
authored transitions and root displacement explain why travel over this finite
window does not simply equal the requested-rate multipliers 750/1024 or
400/1024. No elapsed-time or maximum-km/h claim is made for this fixture.

Six model images apply existing original `0x13250` captures to original model
cells and weapon visibility, then execute the original armed drawing code.
They retain a standing pose to compare missing sections; they precede collapse
animation and omit live smoke/debris. Upper-leg removal visits sections 7, 9,
11; foot removal visits only 11. Both kill the shared left leg actuator and
disable the biped. Shoulder 4 removes weapon sections 23 and 20, disabling two
mounted weapons. The attachment walk is LIFO, hence this visitation order.

The shield, damage-state, salvage and movement JSON files, original instruction
addresses, executable SHA-256 and illustration hashes are retained with the
article assets. The site generates explanatory SVG diagrams from these data.
