import { PrismaClient, SubjectCategory, LocationType, EquipmentSlot, ItemRarity, MaterialRarity, QuestType, OlympiadDifficulty } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create subjects
  const subjects = await Promise.all([
    prisma.subject.upsert({
      where: { name: 'Mathematics' },
      update: {},
      create: { name: 'Mathematics', category: SubjectCategory.exact },
    }),
    prisma.subject.upsert({
      where: { name: 'Physics' },
      update: {},
      create: { name: 'Physics', category: SubjectCategory.natural },
    }),
    prisma.subject.upsert({
      where: { name: 'Chemistry' },
      update: {},
      create: { name: 'Chemistry', category: SubjectCategory.natural },
    }),
    prisma.subject.upsert({
      where: { name: 'Biology' },
      update: {},
      create: { name: 'Biology', category: SubjectCategory.natural },
    }),
    prisma.subject.upsert({
      where: { name: 'Literature' },
      update: {},
      create: { name: 'Literature', category: SubjectCategory.humanitarian },
    }),
    prisma.subject.upsert({
      where: { name: 'History' },
      update: {},
      create: { name: 'History', category: SubjectCategory.humanitarian },
    }),
    prisma.subject.upsert({
      where: { name: 'Foreign Language' },
      update: {},
      create: { name: 'Foreign Language', category: SubjectCategory.humanitarian },
    }),
    prisma.subject.upsert({
      where: { name: 'Physical Education' },
      update: {},
      create: { name: 'Physical Education', category: SubjectCategory.physical },
    }),
    prisma.subject.upsert({
      where: { name: 'Art' },
      update: {},
      create: { name: 'Art', category: SubjectCategory.creative },
    }),
  ]);
  console.log(`Created ${subjects.length} subjects`);

  // Create default city
  const city = await prisma.city.upsert({
    where: { id: 'default-city' },
    update: {},
    create: {
      id: 'default-city',
      name: 'Eduville',
      country: 'Learnland',
    },
  });
  console.log(`Created city: ${city.name}`);

  // Create Prep School
  // In Prep School, students only learn numbers and letters (Math + Literature)
  const mathSubject = subjects.find(s => s.name === 'Mathematics');
  const litSubject = subjects.find(s => s.name === 'Literature');
  const prepSchoolSubjects = [mathSubject?.id, litSubject?.id].filter(Boolean) as string[];

  const prepSchool = await prisma.location.upsert({
    where: { id: 'prep-school' },
    update: {
      allowedSubjects: prepSchoolSubjects,
    },
    create: {
      id: 'prep-school',
      cityId: city.id,
      type: LocationType.prep_school,
      name: 'Prep School',
      orderIndex: 0,
      allowedSubjects: prepSchoolSubjects,
    },
  });

  // Create Prep School class
  await prisma.class.upsert({
    where: { id: 'prep-class-1' },
    update: {},
    create: {
      id: 'prep-class-1',
      locationId: prepSchool.id,
      gradeNumber: 0,
      requiredGradesPerSubject: 5,
    },
  });
  console.log('Created Prep School with 1 class');

  // Create School
  // Requirements: Math Lv.4 + Literature Lv.5 + 100% Prep School completion
  const school = await prisma.location.upsert({
    where: { id: 'school' },
    update: {
      unlockRequirement: {
        previous_location_id: prepSchool.id,
        previous_location_percent: 100,
        required_subject_levels: [
          { subject_id: mathSubject?.id, subject_name: 'Mathematics', min_level: 4 },
          { subject_id: litSubject?.id, subject_name: 'Literature', min_level: 5 },
        ],
      },
    },
    create: {
      id: 'school',
      cityId: city.id,
      type: LocationType.school,
      name: 'School',
      orderIndex: 1,
      unlockRequirement: {
        previous_location_id: prepSchool.id,
        previous_location_percent: 100,
        required_subject_levels: [
          { subject_id: mathSubject?.id, subject_name: 'Mathematics', min_level: 4 },
          { subject_id: litSubject?.id, subject_name: 'Literature', min_level: 5 },
        ],
      },
    },
  });

  // Create School classes (1-11) with grade-appropriate subjects
  // Get subject IDs
  const physicsSubject = subjects.find(s => s.name === 'Physics');
  const chemistrySubject = subjects.find(s => s.name === 'Chemistry');
  const biologySubject = subjects.find(s => s.name === 'Biology');
  const historySubject = subjects.find(s => s.name === 'History');
  const foreignLangSubject = subjects.find(s => s.name === 'Foreign Language');
  const peSubject = subjects.find(s => s.name === 'Physical Education');
  const artSubject = subjects.find(s => s.name === 'Art');

  // Define allowed subjects per grade
  // Grade 1-2: Math, Literature, PE, Art (basic subjects)
  // Grade 3-4: + History, Foreign Language
  // Grade 5+: All subjects including Physics, Chemistry, Biology
  const getClassSubjects = (gradeNumber: number): string[] => {
    const basicSubjects = [mathSubject?.id, litSubject?.id, peSubject?.id, artSubject?.id].filter(Boolean) as string[];

    if (gradeNumber <= 2) {
      return basicSubjects;
    }

    if (gradeNumber <= 4) {
      return [...basicSubjects, historySubject?.id, foreignLangSubject?.id].filter(Boolean) as string[];
    }

    // Grade 5+: All subjects
    return [];  // Empty means all subjects allowed
  };

  // Define requirements per grade
  // Requirements structure:
  // - min_subject_level: required level for all subjects
  // - subject_levels: specific level requirements per subject
  // - min_grade_quality: { subject_id, min_grade, count } - e.g., need 2 grades of C+ or higher
  type ClassRequirements = {
    min_subject_level?: number;
    subject_levels?: { subject_id: string; subject_name: string; min_level: number }[];
    min_grade_quality?: { subject_id: string; subject_name: string; min_grade: number; count: number }[];
  };

  const getClassRequirements = (gradeNumber: number): ClassRequirements | null => {
    // Grade 1: level 5 all subjects
    if (gradeNumber === 1) {
      return { min_subject_level: 5 };
    }
    // Grade 2: level 7 all subjects
    if (gradeNumber === 2) {
      return { min_subject_level: 7 };
    }
    // Grade 3: level 9 all subjects
    if (gradeNumber === 3) {
      return { min_subject_level: 9 };
    }
    // Grade 4: level 11 all subjects
    if (gradeNumber === 4) {
      return { min_subject_level: 11 };
    }
    // Grade 5+: level increases + quality requirements for some subjects
    if (gradeNumber === 5) {
      return {
        min_subject_level: 13,
        min_grade_quality: [
          { subject_id: mathSubject!.id, subject_name: 'Mathematics', min_grade: 70, count: 2 }, // 2 grades C+ or higher
        ],
      };
    }
    if (gradeNumber === 6) {
      return {
        min_subject_level: 15,
        min_grade_quality: [
          { subject_id: mathSubject!.id, subject_name: 'Mathematics', min_grade: 70, count: 2 },
          { subject_id: physicsSubject!.id, subject_name: 'Physics', min_grade: 70, count: 2 },
        ],
      };
    }
    if (gradeNumber === 7) {
      return {
        min_subject_level: 17,
        min_grade_quality: [
          { subject_id: mathSubject!.id, subject_name: 'Mathematics', min_grade: 75, count: 3 }, // 3 grades B- or higher
          { subject_id: physicsSubject!.id, subject_name: 'Physics', min_grade: 70, count: 2 },
        ],
      };
    }
    // Grade 8+: higher requirements
    const baseLevel = 17 + (gradeNumber - 7) * 2;
    return {
      min_subject_level: baseLevel,
      min_grade_quality: [
        { subject_id: mathSubject!.id, subject_name: 'Mathematics', min_grade: 75, count: 3 },
        { subject_id: litSubject!.id, subject_name: 'Literature', min_grade: 70, count: 2 },
      ],
    };
  };

  for (let i = 1; i <= 11; i++) {
    const allowedSubjects = getClassSubjects(i);
    const requirements = getClassRequirements(i);
    await prisma.class.upsert({
      where: { id: `school-class-${i}` },
      update: {
        allowedSubjects,
        requiredGradesPerSubject: 5,
        requirements: requirements ?? undefined,
      },
      create: {
        id: `school-class-${i}`,
        locationId: school.id,
        gradeNumber: i,
        requiredGradesPerSubject: 5,
        allowedSubjects,
        requirements: requirements ?? undefined,
      },
    });
  }
  console.log('Created School with 11 classes (grade-appropriate subjects + requirements)');

  // Create College
  const college = await prisma.location.upsert({
    where: { id: 'college' },
    update: {},
    create: {
      id: 'college',
      cityId: city.id,
      type: LocationType.college,
      name: 'College',
      orderIndex: 2,
      unlockRequirement: {
        previous_location_id: school.id,
        previous_location_percent: 60,
      },
    },
  });
  console.log('Created College');

  // Create College Specializations
  const collegeSpecializations = [
    {
      id: 'spec-computer-science',
      name: 'Computer Science',
      requirements: {
        required_subject_levels: [
          { subject_id: mathSubject?.id, subject_name: 'Mathematics', min_level: 20 },
          { subject_id: physicsSubject?.id, subject_name: 'Physics', min_level: 15 },
        ],
        min_grade_average: 70,
      },
      unlockCost: 2000,
    },
    {
      id: 'spec-engineering',
      name: 'Engineering',
      requirements: {
        required_subject_levels: [
          { subject_id: mathSubject?.id, subject_name: 'Mathematics', min_level: 18 },
          { subject_id: physicsSubject?.id, subject_name: 'Physics', min_level: 18 },
          { subject_id: chemistrySubject?.id, subject_name: 'Chemistry', min_level: 12 },
        ],
        min_grade_average: 65,
      },
      unlockCost: 2500,
    },
    {
      id: 'spec-natural-sciences',
      name: 'Natural Sciences',
      requirements: {
        required_subject_levels: [
          { subject_id: biologySubject?.id, subject_name: 'Biology', min_level: 20 },
          { subject_id: chemistrySubject?.id, subject_name: 'Chemistry', min_level: 18 },
        ],
        min_grade_average: 70,
      },
      unlockCost: 2000,
    },
    {
      id: 'spec-literature-languages',
      name: 'Literature & Languages',
      requirements: {
        required_subject_levels: [
          { subject_id: litSubject?.id, subject_name: 'Literature', min_level: 20 },
          { subject_id: foreignLangSubject?.id, subject_name: 'Foreign Language', min_level: 18 },
          { subject_id: historySubject?.id, subject_name: 'History', min_level: 12 },
        ],
        min_grade_average: 65,
      },
      unlockCost: 1800,
    },
    {
      id: 'spec-business',
      name: 'Business Administration',
      requirements: {
        required_subject_levels: [
          { subject_id: mathSubject?.id, subject_name: 'Mathematics', min_level: 15 },
          { subject_id: historySubject?.id, subject_name: 'History', min_level: 15 },
          { subject_id: foreignLangSubject?.id, subject_name: 'Foreign Language', min_level: 12 },
        ],
        min_grade_average: 60,
      },
      unlockCost: 2200,
    },
    {
      id: 'spec-arts-design',
      name: 'Arts & Design',
      requirements: {
        required_subject_levels: [
          { subject_id: artSubject?.id, subject_name: 'Art', min_level: 20 },
          { subject_id: litSubject?.id, subject_name: 'Literature', min_level: 15 },
        ],
        min_grade_average: 60,
      },
      unlockCost: 1500,
    },
  ];

  for (const spec of collegeSpecializations) {
    await prisma.specialization.upsert({
      where: { id: spec.id },
      update: {},
      create: {
        ...spec,
        locationId: college.id,
      },
    });
  }
  console.log(`Created ${collegeSpecializations.length} college specializations`);

  // Create University
  const university = await prisma.location.upsert({
    where: { id: 'university' },
    update: {},
    create: {
      id: 'university',
      cityId: city.id,
      type: LocationType.university,
      name: 'University',
      orderIndex: 3,
      unlockRequirement: {
        previous_location_id: school.id,
        previous_location_percent: 85,
      },
    },
  });
  console.log('Created University');

  // Create Materials
  const materials = await Promise.all([
    prisma.material.upsert({
      where: { name: 'Paper' },
      update: {},
      create: { name: 'Paper', rarity: MaterialRarity.common, description: 'Basic paper for notes' },
    }),
    prisma.material.upsert({
      where: { name: 'Ink' },
      update: {},
      create: { name: 'Ink', rarity: MaterialRarity.common, description: 'Standard writing ink' },
    }),
    prisma.material.upsert({
      where: { name: 'Paper Clips' },
      update: {},
      create: { name: 'Paper Clips', rarity: MaterialRarity.common, description: 'Keeps papers together' },
    }),
    prisma.material.upsert({
      where: { name: 'Quality Paper' },
      update: {},
      create: { name: 'Quality Paper', rarity: MaterialRarity.uncommon, description: 'High-quality paper' },
    }),
    prisma.material.upsert({
      where: { name: 'Special Ink' },
      update: {},
      create: { name: 'Special Ink', rarity: MaterialRarity.uncommon, description: 'Premium ink' },
    }),
    prisma.material.upsert({
      where: { name: 'Binding' },
      update: {},
      create: { name: 'Binding', rarity: MaterialRarity.rare, description: 'For creating books' },
    }),
  ]);
  console.log(`Created ${materials.length} materials`);

  // Create Items
  const items = [
    // Pens
    { name: 'Ballpoint Pen', slot: EquipmentSlot.pen, rarity: ItemRarity.common, stats: { xp_bonus: 1 }, npcSell: 10, npcBuy: 25 },
    { name: 'Gel Pen', slot: EquipmentSlot.pen, rarity: ItemRarity.uncommon, stats: { xp_bonus: 3 }, npcSell: 35, npcBuy: 80 },
    { name: 'Parker Pen', slot: EquipmentSlot.pen, rarity: ItemRarity.rare, stats: { xp_bonus: 6, grade_bonus: 2 }, npcSell: 150, npcBuy: 350 },
    { name: 'Fountain Pen', slot: EquipmentSlot.pen, rarity: ItemRarity.epic, stats: { xp_bonus: 10, grade_bonus: 4 }, npcSell: 750, npcBuy: 1500 },

    // Notebooks
    { name: 'Basic Notebook', slot: EquipmentSlot.notebook, rarity: ItemRarity.common, stats: { xp_bonus: 1 }, npcSell: 10, npcBuy: 25 },
    { name: 'Spiral Notebook', slot: EquipmentSlot.notebook, rarity: ItemRarity.uncommon, stats: { xp_bonus: 3 }, npcSell: 35, npcBuy: 80 },
    { name: 'Moleskine', slot: EquipmentSlot.notebook, rarity: ItemRarity.rare, stats: { xp_bonus: 7, cash_bonus: 3 }, npcSell: 150, npcBuy: 350 },

    // Backpacks
    { name: 'School Bag', slot: EquipmentSlot.backpack, rarity: ItemRarity.common, stats: { cash_bonus: 2 }, npcSell: 10, npcBuy: 25 },
    { name: 'Sports Backpack', slot: EquipmentSlot.backpack, rarity: ItemRarity.uncommon, stats: { cash_bonus: 4 }, npcSell: 35, npcBuy: 80 },
    { name: 'Leather Satchel', slot: EquipmentSlot.backpack, rarity: ItemRarity.rare, stats: { cash_bonus: 8, xp_bonus: 3 }, npcSell: 150, npcBuy: 350 },

    // Calculators
    { name: 'Basic Calculator', slot: EquipmentSlot.calculator, rarity: ItemRarity.common, stats: { grade_bonus: 1 }, npcSell: 10, npcBuy: 25 },
    { name: 'Scientific Calculator', slot: EquipmentSlot.calculator, rarity: ItemRarity.uncommon, stats: { grade_bonus: 3 }, npcSell: 35, npcBuy: 80 },
    { name: 'Graphing Calculator', slot: EquipmentSlot.calculator, rarity: ItemRarity.rare, stats: { grade_bonus: 6, xp_bonus: 2 }, npcSell: 150, npcBuy: 350 },

    // Glasses
    { name: 'Reading Glasses', slot: EquipmentSlot.glasses, rarity: ItemRarity.common, stats: { xp_bonus: 1 }, npcSell: 10, npcBuy: 25 },
    { name: 'Designer Glasses', slot: EquipmentSlot.glasses, rarity: ItemRarity.uncommon, stats: { xp_bonus: 4 }, npcSell: 35, npcBuy: 80 },
    { name: 'Smart Glasses', slot: EquipmentSlot.glasses, rarity: ItemRarity.rare, stats: { xp_bonus: 8, grade_bonus: 3 }, npcSell: 150, npcBuy: 350 },
  ];

  for (const item of items) {
    await prisma.item.upsert({
      where: { name: item.name },
      update: {},
      create: {
        name: item.name,
        description: `A ${item.rarity} ${item.slot}`,
        slot: item.slot,
        rarity: item.rarity,
        stats: item.stats,
        npcSellPrice: item.npcSell,
        npcBuyPrice: item.npcBuy,
      },
    });
  }
  console.log(`Created ${items.length} items`);

  // Get items for recipes
  const ballpointPen = await prisma.item.findUnique({ where: { name: 'Ballpoint Pen' } });
  const gelPen = await prisma.item.findUnique({ where: { name: 'Gel Pen' } });
  const basicNotebook = await prisma.item.findUnique({ where: { name: 'Basic Notebook' } });

  // Get materials for recipes
  const paper = materials.find(m => m.name === 'Paper');
  const ink = materials.find(m => m.name === 'Ink');
  const qualityPaper = materials.find(m => m.name === 'Quality Paper');
  const specialInk = materials.find(m => m.name === 'Special Ink');
  const binding = materials.find(m => m.name === 'Binding');

  // Create Study Notes material (crafted material)
  const studyNotes = await prisma.material.upsert({
    where: { name: 'Study Notes' },
    update: {},
    create: { name: 'Study Notes', rarity: MaterialRarity.uncommon, description: 'Organized study notes' },
  });

  // Create crafted items
  const craftedNotebook = await prisma.item.upsert({
    where: { name: 'Handmade Notebook' },
    update: {},
    create: {
      name: 'Handmade Notebook',
      description: 'A carefully crafted notebook',
      slot: EquipmentSlot.notebook,
      rarity: ItemRarity.uncommon,
      stats: { xp_bonus: 4 },
      npcSellPrice: 50,
      npcBuyPrice: null,
    },
  });

  const qualityPen = await prisma.item.upsert({
    where: { name: 'Quality Pen' },
    update: {},
    create: {
      name: 'Quality Pen',
      description: 'An upgraded pen with special ink',
      slot: EquipmentSlot.pen,
      rarity: ItemRarity.uncommon,
      stats: { xp_bonus: 4, grade_bonus: 1 },
      npcSellPrice: 60,
      npcBuyPrice: null,
    },
  });

  // Create Recipes
  const recipes = [
    {
      id: 'recipe-study-notes',
      name: 'Study Notes',
      resultMaterialId: studyNotes.id,
      resultQuantity: 1,
      ingredients: [
        { type: 'material', id: paper?.id, quantity: 5 },
        { type: 'material', id: ink?.id, quantity: 2 },
      ],
      requiredCharacterLevel: 1,
    },
    {
      id: 'recipe-handmade-notebook',
      name: 'Handmade Notebook',
      resultItemId: craftedNotebook.id,
      resultQuantity: 1,
      ingredients: [
        { type: 'material', id: qualityPaper?.id, quantity: 10 },
        { type: 'material', id: binding?.id, quantity: 2 },
      ],
      requiredCharacterLevel: 3,
    },
    {
      id: 'recipe-quality-pen',
      name: 'Quality Pen',
      resultItemId: qualityPen.id,
      resultQuantity: 1,
      ingredients: [
        { type: 'item', id: ballpointPen?.id, quantity: 1 },
        { type: 'material', id: specialInk?.id, quantity: 3 },
      ],
      requiredCharacterLevel: 2,
    },
  ];

  for (const recipe of recipes) {
    await prisma.recipe.upsert({
      where: { id: recipe.id },
      update: {},
      create: recipe,
    });
  }
  console.log(`Created ${recipes.length} recipes`);

  // Create Quests (cooldowns set to 3s for testing, adjust for production)
  const quests = [
    {
      name: 'Basic Tutoring',
      description: 'Help a younger student with their homework',
      type: QuestType.tutoring,
      energyCost: 5,
      cooldownSeconds: 3,
      rewards: { cashMin: 5, cashMax: 15, subjectXpMin: 15, subjectXpMax: 30, itemChance: 0.03 },
      requiredCharacterLevel: 1,
      requiredSubjectLevel: 1,
    },
    {
      name: 'Advanced Tutoring',
      description: 'Tutor students on more complex topics',
      type: QuestType.tutoring,
      energyCost: 10,
      cooldownSeconds: 3,
      rewards: { cashMin: 15, cashMax: 35, subjectXpMin: 35, subjectXpMax: 60, itemChance: 0.05 },
      requiredCharacterLevel: 5,
      requiredSubjectLevel: 5,
    },
    {
      name: 'Expert Tutoring',
      description: 'Provide expert-level tutoring sessions',
      type: QuestType.tutoring,
      energyCost: 20,
      cooldownSeconds: 3,
      rewards: { cashMin: 40, cashMax: 80, subjectXpMin: 70, subjectXpMax: 120, itemChance: 0.08 },
      requiredCharacterLevel: 10,
      requiredSubjectLevel: 10,
    },
    {
      name: 'Quick Review Session',
      description: 'A quick review of basic concepts',
      type: QuestType.tutoring,
      energyCost: 3,
      cooldownSeconds: 3,
      rewards: { cashMin: 3, cashMax: 8, subjectXpMin: 8, subjectXpMax: 15, itemChance: 0.02 },
      requiredCharacterLevel: 1,
      requiredSubjectLevel: 1,
    },
    {
      name: 'Study Group Leader',
      description: 'Lead a study group session',
      type: QuestType.tutoring,
      energyCost: 15,
      cooldownSeconds: 3,
      rewards: { cashMin: 25, cashMax: 50, subjectXpMin: 50, subjectXpMax: 90, itemChance: 0.06 },
      requiredCharacterLevel: 7,
      requiredSubjectLevel: 7,
    },
  ];

  for (const quest of quests) {
    await prisma.quest.upsert({
      where: { name: quest.name },
      update: { cooldownSeconds: quest.cooldownSeconds },
      create: quest,
    });
  }
  console.log(`Created ${quests.length} quests`);

  // Create Olympiad Types
  const olympiads = [
    // School level - easiest
    {
      id: 'olympiad-school-general',
      name: 'School Olympiad',
      difficulty: OlympiadDifficulty.school,
      subjectId: null,
      energyCost: 5,
      npcLevelRange: { min: 1, max: 3 },
      rewards: { cash_min: 20, cash_max: 50, xp_min: 10, xp_max: 25, item_chance: 0.05 },
      requiredCharacterLevel: 1,
    },
    {
      id: 'olympiad-school-math',
      name: 'School Math Competition',
      difficulty: OlympiadDifficulty.school,
      subjectId: mathSubject?.id,
      energyCost: 5,
      npcLevelRange: { min: 1, max: 3 },
      rewards: { cash_min: 25, cash_max: 60, xp_min: 15, xp_max: 30, item_chance: 0.06 },
      requiredCharacterLevel: 1,
    },
    // District level
    {
      id: 'olympiad-district-general',
      name: 'District Olympiad',
      difficulty: OlympiadDifficulty.district,
      subjectId: null,
      energyCost: 10,
      npcLevelRange: { min: 3, max: 6 },
      rewards: { cash_min: 50, cash_max: 120, xp_min: 25, xp_max: 50, item_chance: 0.10 },
      requiredCharacterLevel: 3,
    },
    {
      id: 'olympiad-district-lit',
      name: 'District Literature Contest',
      difficulty: OlympiadDifficulty.district,
      subjectId: litSubject?.id,
      energyCost: 10,
      npcLevelRange: { min: 3, max: 6 },
      rewards: { cash_min: 60, cash_max: 140, xp_min: 30, xp_max: 55, item_chance: 0.12 },
      requiredCharacterLevel: 3,
    },
    // City level
    {
      id: 'olympiad-city-general',
      name: 'City Olympiad',
      difficulty: OlympiadDifficulty.city,
      subjectId: null,
      energyCost: 15,
      npcLevelRange: { min: 6, max: 10 },
      rewards: { cash_min: 100, cash_max: 250, xp_min: 50, xp_max: 100, item_chance: 0.15 },
      requiredCharacterLevel: 6,
    },
    // National level - hardest
    {
      id: 'olympiad-national-general',
      name: 'National Olympiad',
      difficulty: OlympiadDifficulty.national,
      subjectId: null,
      energyCost: 25,
      npcLevelRange: { min: 10, max: 15 },
      rewards: { cash_min: 200, cash_max: 500, xp_min: 100, xp_max: 200, item_chance: 0.25 },
      requiredCharacterLevel: 10,
    },
  ];

  for (const olympiad of olympiads) {
    await prisma.olympiadType.upsert({
      where: { id: olympiad.id },
      update: {},
      create: olympiad,
    });
  }
  console.log(`Created ${olympiads.length} olympiad types`);

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
