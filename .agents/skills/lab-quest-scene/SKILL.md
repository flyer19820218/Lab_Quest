---
name: lab-quest-scene
description: Plan or build a new traversable Lab Quest scene or science inquiry event using the project's scene card and science approval workflow; not for small unrelated bug fixes.
---

# Lab Quest scene workflow

Use this skill for a new scene or substantial new experiment in the Lab Quest game. The teacher's latest explicit decisions override older planning documents. Do not treat a drafted scene card as teacher approval.

1. Read the project-root AGENTS.md and the relevant parts of [scene production SOP](../../../docs/SCENE_PRODUCTION_SOP.md). For a new scene, start from the [scene card template](../../../docs/templates/SCENE_CARD.md); reuse an existing card for an in-progress scene.
2. Separate the room, the voluntary inquiry events, and any environmental puzzle. Record what the player can freely inspect, which button intentionally starts an interaction, and how the player exits or retries. Do not auto-start an event solely because March walks near an object.
3. Identify the original Physical-Boys lesson or a teacher-provided source for each scientific claim. Record initial state, manipulable variables, visible evidence, conservation or other invariants, wrong-order behavior, and the misconception the event should reveal. Flag disputed or absent science for teacher review before implementing a result-producing simulation. A non-scientific room graybox may proceed while science is pending.
4. Build one playable vertical slice with the existing input and scene conventions. Preserve proven apparatus and keep experiment state, animation and completion checks consistent. Extract shared infrastructure only when a second concrete use makes the boundary clear.
5. Verify the changed science module with tests, then the relevant interactions and 16:9 desktop/mobile layouts. Distinguish browser emulation from actual iPhone/iPad Safari results. Report what is implemented, what is planned, and what still awaits teacher confirmation.

Do not modify the original Physical-Boys教材, invent a final character/equipment/reward system, or publish to GitHub merely because a scene draft is ready.
