
export enum JarvisStatus {
  IDLE = 'IDLE',
  LISTENING = 'LISTENING',
  PROCESSING = 'PROCESSING',
  SPEAKING = 'SPEAKING',
  ERROR = 'ERROR',
}

export interface Transcript {
  id: number;
  speaker: 'USER' | 'JARVIS';
  text: string;
  isFinal: boolean;
}
