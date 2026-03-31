/* eslint-disable prettier/prettier */
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CodeExecutionService } from './code-execution.service';
import { ExecuteCodeDto } from './dto/execute-code.dto';
import { JwtOrApiKeyAuthGuard } from '../auth/guards/jwt-or-api-key.guard';
import { ActionRateLimitGuard, RateLimitAction } from '../common/action-rate-limit.guard';

@ApiTags('Code Execution')
@Controller('code-execution')
export class CodeExecutionController {
  constructor(private readonly codeService: CodeExecutionService) {}

  @Post('run')
  @UseGuards(JwtOrApiKeyAuthGuard, ActionRateLimitGuard)
  @RateLimitAction('code_run')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Run code with multiple test cases using Piston API' })
  async runCode(@Body() executeCodeDto: ExecuteCodeDto) {
    return this.codeService.executeCode(executeCodeDto);
  }
}
