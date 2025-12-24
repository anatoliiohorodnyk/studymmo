export interface User {
  id: string;
  email: string;
  username: string;
  gradeDisplaySystem: 'letter' | 'five_point' | 'twelve_point';
  createdAt: string;
  lastLogin: string | null;
}

export interface CharacterSubject {
  id: string;
  subjectId: string;
  subjectName: string;
  category: string;
  level: number;
  currentXp: number;
  xpToNextLevel: number;
}

export interface CharacterEquipment {
  slot: string;
  item: {
    id: string;
    name: string;
    rarity: string;
    stats: Record<string, number>;
  } | null;
}

export interface NextLocationRequirementSubject {
  subjectId: string;
  subjectName: string;
  minLevel: number;
  currentLevel: number;
  met: boolean;
  gradesCollected: number;
  gradesRequired: number;
}

export interface NextLocationRequirementPercent {
  percent: number;
  current: number;
  met: boolean;
}

export interface NextLocation {
  id: string;
  name: string;
  requirements: {
    subjectLevels?: NextLocationRequirementSubject[];
    locationPercent?: NextLocationRequirementPercent;
  };
  canUnlock: boolean;
}

export interface NextClassRequirementSubject {
  subjectId: string;
  subjectName: string;
  gradesCollected: number;
  gradesRequired: number;
  gradesMet: boolean;
  currentLevel: number;
  minLevel: number;
  levelMet: boolean;
}

export interface NextClass {
  id: string;
  gradeNumber: number;
  requirements: {
    subjects: NextClassRequirementSubject[];
    minSubjectLevel?: number;
  };
  canAdvance: boolean;
}

export interface Character {
  id: string;
  username: string;
  level: number;
  totalXp: string;
  xpToNextLevel: number;
  cash: string;
  questEnergy: number;
  questEnergyMax: number;
  olympiadEnergy: number;
  olympiadEnergyMax: number;
  currentLocation: {
    id: string;
    name: string;
    type: string;
  };
  currentClass: {
    id: string;
    gradeNumber: number;
  } | null;
  currentSpecialization: {
    id: string;
    name: string;
  } | null;
  totalStudyClicks: string;
  studyClicksInCurrentClass: number;
  subjects: CharacterSubject[];
  equipment: CharacterEquipment[];
  nextClass: NextClass | null;
  nextLocation: NextLocation | null;
  createdAt: string;
}

export interface SubjectXpGain {
  subjectId: string;
  subjectName: string;
  xpGained: number;
  newXp: number;
  newLevel: number;
  leveledUp: boolean;
}

export interface GradeResult {
  subjectId: string;
  subjectName: string;
  score: number;
  displayGrade: string;
}

export interface StudyResult {
  characterXpGained: number;
  newCharacterXp: string;
  newCharacterLevel: number;
  characterLeveledUp: boolean;
  subjectXpGains: SubjectXpGain[];
  cashGained: number;
  newCash: string;
  grade: GradeResult | null;
  materialDrop: {
    materialId: string;
    materialName: string;
  } | null;
  itemDrop: {
    itemId: string;
    itemName: string;
    rarity: string;
  } | null;
  studyClicksInCurrentClass: number;
  clicksUntilNextGrade: number;
  cooldownUntil: number;
}

export interface LocationProgress {
  locationId: string;
  locationName: string;
  locationType: string;
  completionPercent: number;
  isCompleted: boolean;
  isUnlocked: boolean;
  currentClass?: {
    gradeNumber: number;
    gradesCollected: Record<string, number>;
    gradesRequired: number;
  };
}

export interface City {
  id: string;
  name: string;
  country: string;
}

export interface Subject {
  id: string;
  name: string;
  category: string;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}
