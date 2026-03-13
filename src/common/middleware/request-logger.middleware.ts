import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    res.on('finish', () => {
      // eslint-disable-next-line no-console
      console.log(`${req.method} ${req.originalUrl} ${res.statusCode} - ${Date.now() - start}ms`);
    });
    next();
  }
}
