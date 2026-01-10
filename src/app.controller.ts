import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('System')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'System Health Check' })
  @ApiResponse({
    status: 200,
    description: 'Returns system and database status',
  })
  getStatus() {
    return this.appService.getSystemStatus();
  }
}
