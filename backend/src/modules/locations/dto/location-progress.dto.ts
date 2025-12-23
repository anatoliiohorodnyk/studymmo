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
