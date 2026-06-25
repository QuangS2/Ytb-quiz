export interface GenerateQuizRequestDto {
  url: string;
  creatorId: string;
  apiKey: string;
  devicePerformance?: 'low' | 'high';
}
