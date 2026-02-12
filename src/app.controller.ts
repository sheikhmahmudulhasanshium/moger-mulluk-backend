import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';
import { readFileSync } from 'fs';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('System')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'Serve Home Page' })
  getHome(@Res() res: Response): void {
    const indexPath = join(process.cwd(), 'public', 'index.html');
    const html = readFileSync(indexPath, 'utf8');

    // Explicit Node.js response handling to pass ESLint and Vercel Build
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');
    res.end(html);
  }

  @Get('status')
  @ApiOperation({ summary: 'System Health Check' })
  getStatus() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
