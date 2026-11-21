/**
 * Text form guides for the built-in exercises: step-by-step execution cues
 * and the most common form mistake to avoid. Keys match the seeded
 * `ExerciseDef.id` values in constants.ts — custom exercises added in the
 * Program Builder simply don't render a guide button.
 */

export interface ExerciseGuide {
  /** Ordered execution cues */
  steps: string[];
  /** The #1 form mistake to avoid */
  mistake: string;
}

export const EXERCISE_GUIDES: Record<string, ExerciseGuide> = {
  "floor-press": {
    steps: [
      "Lie on your back on the floor, knees bent, dumbbells held above your chest with straight arms.",
      "Lower with control until the backs of your upper arms gently rest on the floor.",
      "Pause briefly — no bouncing off the floor.",
      "Press up and slightly back until the dumbbells finish above your chest.",
    ],
    mistake:
      "Flaring the elbows out to 90°. Tuck them to about 45° to protect your shoulders and keep the chest working.",
  },
  "single-arm-row": {
    steps: [
      "Place one hand and the same-side knee on a bench, chair or bed — back flat, parallel to the floor.",
      "Let the dumbbell hang straight down from the free arm.",
      "Pull the dumbbell to your hip, driving the elbow up and back close to your body.",
      "Squeeze the shoulder blade at the top, then lower with a full stretch — no torso twisting.",
    ],
    mistake:
      "Rotating the torso to help heave the weight up. Think \"elbow to hip pocket\", not \"hand to chest\".",
  },
  "overhead-press": {
    steps: [
      "Stand or sit tall with dumbbells at shoulder height, palms facing forward.",
      "Brace your core and squeeze your glutes before pressing.",
      "Press both dumbbells overhead until your arms are straight — biceps by your ears.",
      "Lower under control back to the shoulders and reset your brace.",
    ],
    mistake:
      "Arching the lower back and turning the press into an incline press. Keep the ribs stacked over the pelvis.",
  },
  "bicep-curls": {
    steps: [
      "Stand tall, a dumbbell in each hand at your sides, palms forward, elbows pinned to your ribs.",
      "Curl both dumbbells toward shoulder height without swinging or leaning back.",
      "Squeeze the biceps hard for one beat at the top.",
      "Lower slowly — 2 to 3 seconds — to a fully stretched arm.",
    ],
    mistake:
      "Rocking the hips and upper back to launch the reps. If you must swing, the weight is too heavy.",
  },
  "tricep-extension": {
    steps: [
      "Sit or stand with a dumbbell in each hand, palms facing each other, pressed straight overhead.",
      "Keep your upper arms vertical and your elbows narrow — pointing forward, not out to the sides.",
      "Bend only at the elbows, lowering both dumbbells behind your head until you feel a deep tricep stretch.",
      "Extend back to lockout without letting the elbows drift apart.",
    ],
    mistake:
      "Elbows drifting wide apart. Keep them pointing forward — flaring turns it into a shoulder press.",
  },
  "goblet-squat": {
    steps: [
      "Hold one dumbbell vertically against your chest like a goblet, elbows tucked down.",
      "Set feet shoulder-width with the toes turned slightly out.",
      "Sit down between your hips until your thighs reach at least parallel — chest stays tall.",
      "Drive the floor away to stand and squeeze the glutes at the top.",
    ],
    mistake:
      "Heels lifting off the floor or knees caving inward. Knees track over the toes the whole way down.",
  },
  "romanian-deadlift": {
    steps: [
      "Stand tall holding dumbbells in front of your thighs, feet hip-width apart.",
      "Soften the knees slightly, then push your hips straight back — don't bend at the waist.",
      "Slide the dumbbells down your legs until you feel a strong hamstring stretch, back flat.",
      "Drive the hips forward to stand tall; finish with the glutes, never hyperextend.",
    ],
    mistake:
      "Rounding the lower back instead of hinging at the hips. The dumbbells should stay glued to your legs.",
  },
  "split-squat": {
    steps: [
      "Stand about two feet from a bench or chair and rest the top of your rear foot on it — or keep the rear foot flat on the floor for a standard split squat.",
      "Hold dumbbells at your sides, torso upright with a slight forward lean.",
      "Lower straight down until the front thigh is parallel; the back knee hovers just off the floor.",
      "Push through the entire front foot to stand back up.",
    ],
    mistake:
      "Stance too short, jamming the front knee far past the toes. Long stance, vertical shin, stable knee.",
  },
  "calf-raises": {
    steps: [
      "Stand with the balls of your feet on a step or plate with heels hanging free — flat on the floor works too, just with a shorter range.",
      "Lower your heels slowly for a deep calf stretch at the bottom.",
      "Press up onto your toes as high as possible and pause for one second.",
      "Keep the knees straight but never locked; repeat with control.",
    ],
    mistake:
      "Bouncing at the bottom using elastic recoil. Slow, full-range reps grow calves — momentum doesn't.",
  },
  plank: {
    steps: [
      "Set forearms on the floor with elbows directly under your shoulders.",
      "Extend the legs and form one straight line from head to heels.",
      "Squeeze the glutes, brace your abs like you're about to be poked, and breathe steadily.",
      "Hold for the target time and stop the moment your hips sag or pike.",
    ],
    mistake:
      "Sagging hips or a piked butt as fatigue sets in. A perfect 30-second hold beats a sloppy 60-second one.",
  },
};
