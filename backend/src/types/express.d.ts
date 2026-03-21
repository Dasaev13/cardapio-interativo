import 'express';

declare global {
  namespace Express {
    interface Request {
      lojaId?: string;
      operadorId?: string;
      operadorRole?: string;
      rawBody?: Buffer;
    }
  }
}
