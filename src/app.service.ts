import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getRootMessage(): string {
    return 'Welcome to the NestJS Boilerplate!';
  }

  getHelloMessage(): string {
    return 'Hello from Saraswat at PearlsThoughts Internship!';
  }
}
