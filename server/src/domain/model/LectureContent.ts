export class LectureContent {
  constructor(
    public readonly id: string,
    public youtubeId: string,
    public title: string,
    public refinedScript: string,
    public version: number,
    public qualityScore: number,
    public readonly createdAt: Date = new Date(),
    public updatedAt: Date = new Date()
  ) {}

  public updateScript(newScript: string, qualityScore: number): void {
    this.refinedScript = newScript;
    this.qualityScore = qualityScore;
    this.version += 1;
    this.updatedAt = new Date();
  }
}
