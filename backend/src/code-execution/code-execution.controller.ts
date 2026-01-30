import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CodeExecutionService } from './code-execution.service';
import { ExecuteCodeDto } from './dto/execute-code.dto';

@ApiTags('Code Execution')
@Controller('code-execution')
export class CodeExecutionController {
  constructor(private readonly codeService: CodeExecutionService) {}

  @Post('run')
  @ApiOperation({ summary: 'Run code with multiple test cases using Piston API' })
  async runCode(@Body() executeCodeDto: ExecuteCodeDto) {
    return this.codeService.executeCode(executeCodeDto);
  }
}
