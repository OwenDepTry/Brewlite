import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  hello() {
    return { name: 'BrewLite API', message: 'Hello BrewLite', status: 'ok' };
  }
}
