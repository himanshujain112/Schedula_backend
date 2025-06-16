import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getRootMessage(): string {
    return 'Hello from Saraswat at PearlsThoughts Internship!';
  }

  getHelloMessage(): string {
    return 'Hello from Saraswat at PearlsThoughts Internship!';
  }
}
