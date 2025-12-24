export class ClassRequirementsDto {
  min_subject_level?: number;
  subject_levels?: { subject_id: string; subject_name: string; min_level: number }[];
  min_grade_quality?: { subject_id: string; subject_name: string; min_grade: number; count: number }[];
}

export class LocationProgressDto {
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
    allowedSubjects: string[];
    requirements?: ClassRequirementsDto;
  };
}

export class LocationDetailsDto {
  id: string;
  name: string;
  type: string;
  classes: {
    id: string;
    gradeNumber: number;
    requiredGradesPerSubject: number;
  }[];
  specializations: {
    id: string;
    name: string;
    requirements: Record<string, any>;
    unlockCost: number;
  }[];
}
