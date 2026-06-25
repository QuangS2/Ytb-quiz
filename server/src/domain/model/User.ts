export class User {
  constructor(
    public readonly id: string,
    public googleId: string,
    public email: string,
    public displayName: string,
    public avatarUrl: string,
    public passwordHash?: string,
    public readonly createdAt: Date = new Date()
  ) {}

  public setPassword(passwordHash: string): void {
    this.passwordHash = passwordHash;
  }

  public hasPassword(): boolean {
    return !!this.passwordHash;
  }
}

