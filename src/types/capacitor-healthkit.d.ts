declare module '@perfood/capacitor-healthkit' {
  export const CapacitorHealthkit: {
    isAvailable(): Promise<void>;
    requestAuthorization(options: {
      all: string[];
      read: string[];
      write: string[];
    }): Promise<void>;
    queryHKitSampleType<T>(options: {
      sampleName: string;
      startDate: string;
      endDate: string;
      limit: number;
    }): Promise<{ resultData: T[] }>;
  };
  export const SampleNames: {
    STEP_COUNT: string;
    DISTANCE_WALKING_RUNNING: string;
    ACTIVE_ENERGY_BURNED: string;
    WORKOUT_TYPE: string;
  };
}
