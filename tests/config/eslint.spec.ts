import { ESLint } from 'eslint';
import { describe, it, expect } from 'vitest';

describe('ESLint Configuration (Deterministic Enforcement)', () => {
  it('should explicitly ban "any" and "unknown" types', async () => {
    const eslint = new ESLint();
    const results = await eslint.lintText('let a: any = 1; let b: unknown = 2;');
    const messages = results[0].messages;
    const ruleIds = messages.map(m => m.ruleId);
    
    expect(ruleIds).toContain('@typescript-eslint/no-explicit-any');
    expect(ruleIds).toContain('no-restricted-syntax'); // Our custom unknown ban
  });

  it('should ban "as unknown as Type" casting bypasses', async () => {
    const eslint = new ESLint();
    const results = await eslint.lintText('const a = 1 as unknown as string;');
    const messages = results[0].messages;
    const ruleIds = messages.map(m => m.ruleId);
    
    expect(ruleIds).toContain('no-restricted-syntax');
  });

  it('should enforce Feature-Sliced Design (FSD) architecture boundaries', async () => {
    const eslint = new ESLint();
    
    // Simulate a file inside 'shared' improperly trying to import from 'features' (Upward dependency)
    const results = await eslint.lintText(
      "import { someFeature } from '@/features/auth';", 
      { filePath: "src/shared/ui/button.ts" }
    );
    
    const messages = results[0].messages;
    const ruleIds = messages.map(m => m.ruleId);
    
    // Layers-slices rule should catch the boundary violation
    expect(ruleIds).toContain('@conarti/feature-sliced/layers-slices');
  });

  it('should enforce strict complexity metrics natively', async () => {
    const eslint = new ESLint();
    
    // 4 parameters (exceeds our max-params of 3)
    const results = await eslint.lintText('function test(a, b, c, d) { return a + b + c + d; }');
    const messages = results[0].messages;
    const ruleIds = messages.map(m => m.ruleId);
    
    expect(ruleIds).toContain('max-params');
  });
});
