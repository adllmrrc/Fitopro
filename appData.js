(() => {
  const TAGLINES = [
    "crush it",
    "grind harder",
    "push limits",
    "get stronger",
    "stay consistent",
    "break records",
    "level up",
    "go hard",
  ];

  const DEFAULT_WORKOUTS = [
    {
      id: "d1",
      name: "Push Day A",
      icon: "💪",
      description: "Chest · Shoulders · Triceps",
      exercises: [
        { name: "Bench Press", icon: "🏋️", sets: 4, reps: 8, rest: 120, weight: 60 },
        { name: "Incline DB Press", icon: "💪", sets: 4, reps: 12, rest: 75, weight: 24 },
        { name: "Cable Fly", icon: "🔄", sets: 3, reps: 15, rest: 60, weight: 15 },
        { name: "Shoulder Press", icon: "🏋️", sets: 4, reps: 10, rest: 90, weight: 40 },
        { name: "Lateral Raise", icon: "🦾", sets: 3, reps: 15, rest: 45, weight: 10 },
        { name: "Tricep Dips", icon: "💥", sets: 3, reps: 12, rest: 60, weight: 0 },
      ],
    },
    {
      id: "d2",
      name: "Pull Day B",
      icon: "🤸",
      description: "Back · Biceps · Rear Delts",
      exercises: [
        { name: "Pull-ups", icon: "🤸", sets: 4, reps: 8, rest: 90, weight: 0 },
        { name: "Barbell Row", icon: "🏋️", sets: 4, reps: 10, rest: 90, weight: 60 },
        { name: "Lat Pulldown", icon: "🔄", sets: 3, reps: 12, rest: 75, weight: 50 },
        { name: "Face Pull", icon: "🔄", sets: 3, reps: 15, rest: 60, weight: 15 },
        { name: "Hammer Curl", icon: "💪", sets: 3, reps: 12, rest: 60, weight: 16 },
      ],
    },
    {
      id: "d3",
      name: "Leg Day",
      icon: "🦵",
      description: "Quads · Glutes · Hamstrings",
      exercises: [
        { name: "Barbell Squat", icon: "🦵", sets: 5, reps: 8, rest: 120, weight: 80 },
        { name: "Romanian Deadlift", icon: "🏋️", sets: 4, reps: 10, rest: 90, weight: 70 },
        { name: "Leg Press", icon: "💺", sets: 4, reps: 12, rest: 75, weight: 100 },
        { name: "Walking Lunge", icon: "🦵", sets: 3, reps: 20, rest: 60, weight: 20 },
        { name: "Calf Raise", icon: "⬆️", sets: 4, reps: 20, rest: 45, weight: 40 },
      ],
    },
    {
      id: "d4",
      name: "HIIT Cardio",
      icon: "🔥",
      description: "Fat Burn · No Equipment",
      exercises: [
        { name: "Burpees", icon: "🔥", sets: 4, reps: 15, rest: 30, weight: 0 },
        { name: "Jump Squats", icon: "⚡", sets: 4, reps: 20, rest: 30, weight: 0 },
        { name: "Mountain Climbers", icon: "🏔️", sets: 3, reps: 30, rest: 30, weight: 0 },
        { name: "High Knees", icon: "🦵", sets: 3, reps: 40, rest: 30, weight: 0 },
      ],
    },
    {
      id: "d5",
      name: "Push-Up Power",
      icon: "🤸",
      description: "Bodyweight · No Equipment",
      exercises: [
        { name: "Push-Ups", icon: "🤸", sets: 4, reps: 20, rest: 60, weight: 0 },
        { name: "Wide Push-Ups", icon: "🤸", sets: 3, reps: 15, rest: 60, weight: 0 },
        { name: "Diamond Push-Ups", icon: "💎", sets: 3, reps: 12, rest: 75, weight: 0 },
        { name: "Pike Push-Ups", icon: "⬆️", sets: 3, reps: 10, rest: 75, weight: 0 },
      ],
    },
  ];

  const EXERCISE_POOL = [
    "Bench Press",
    "Squat",
    "Deadlift",
    "Pull-ups",
    "Push-ups",
    "Shoulder Press",
    "Bicep Curl",
    "Tricep Extension",
    "Leg Press",
    "Leg Curl",
    "Calf Raise",
    "Lat Pulldown",
    "Cable Row",
    "Dumbbell Fly",
    "Incline Press",
    "Romanian Deadlift",
    "Barbell Row",
    "Face Pull",
    "Lateral Raise",
    "Hammer Curl",
    "Hip Thrust",
    "Bulgarian Split Squat",
    "Arnold Press",
    "Upright Row",
    "Close Grip Bench",
    "Overhead Press",
    "Skull Crusher",
    "Cable Crunch",
    "Plank",
    "Russian Twist",
  ];

  window.FITOPRO_DATA = Object.freeze({
    TAGLINES,
    DEFAULT_WORKOUTS,
    EXERCISE_POOL,
  });
})();
