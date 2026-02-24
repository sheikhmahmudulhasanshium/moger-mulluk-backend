import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';
import { readFileSync } from 'fs';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service'; // Import the service

@ApiTags('System')
@Controller()
export class AppController {
  // Inject AppService to access getSystemStatus()
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Serve Home Page' })
  getHome(@Res() res: Response): void {
    const indexPath = join(process.cwd(), 'public', 'index.html');
    const html = readFileSync(indexPath, 'utf8');

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');
    res.end(html);
  }

  @Get('status')
  @ApiOperation({ summary: 'System Health Check' })
  getStatus() {
    // Return the detailed status from the service (which includes DB connection checks)
    return this.appService.getSystemStatus();
  }
}
