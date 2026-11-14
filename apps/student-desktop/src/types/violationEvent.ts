export interface ViolationEvent {
  violationType: string;
  occurredAt: string;
  process?: { appName: string; executableName: string };
}
