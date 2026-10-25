declare module 'express' {
  interface Request {
    user?: { id: string; role: string; isActive: boolean } & Record<string, any>;
    session?: Record<string, any>;
  }
}
export {};
