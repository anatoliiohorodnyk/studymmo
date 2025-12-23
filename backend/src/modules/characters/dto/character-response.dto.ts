export class CharacterSubjectDto {
  id: string;
  subjectId: string;
  subjectName: string;
  category: string;
  level: number;
  currentXp: number;
  xpToNextLevel: number;
}

export class CharacterEquipmentDto {
  slot: string;
  item: {
    id: string;
    name: string;
    rarity: string;
    stats: Record<string, number>;
  } | null;
}

export class NextLocationRequirementSubjectDto {
  subjectId: string;
  subjectName: string;
  minLevel: number;
  currentLevel: number;
  met: boolean;
  gradesCollected: number;
  gradesRequired: number;
}

export class NextLocationRequirementPercentDto {
  percent: number;
  current: number;
  met: boolean;
}

export class NextLocationDto {
  id: string;
  name: string;
  requirements: {
    subjectLevels?: NextLocationRequirementSubjectDto[];
    locationPercent?: NextLocationRequirementPercentDto;
  };
  canUnlock: boolean;
}

export class NextClassRequirementSubjectDto {
  subjectId: string;
  subjectName: string;
  gradesCollected: number;
  gradesRequired: number;
  met: boolean;
}

export class NextClassDto {
  id: string;
  gradeNumber: number;
  requirements: {
    subjects: NextClassRequirementSubjectDto[];
  };
  canAdvance: boolean;
}

export class CurrentSpecializationDto {
  id: string;
  name: string;
}

export class CharacterResponseDto {
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
  currentSpecialization: CurrentSpecializationDto | null;
  totalStudyClicks: string;
  studyClicksInCurrentClass: number;
  subjects: CharacterSubjectDto[];
  equipment: CharacterEquipmentDto[];
  nextClass: NextClassDto | null;
  nextLocation: NextLocationDto | null;
  createdAt: Date;
}
