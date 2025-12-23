export class SubjectXpGain {
  subjectId: string;
  subjectName: string;
  xpGained: number;
  newXp: number;
  newLevel: number;
  leveledUp: boolean;
}

export class GradeResult {
  subjectId: string;
  subjectName: string;
  score: number;
  displayGrade: string;
}

export class StudyResultDto {
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
