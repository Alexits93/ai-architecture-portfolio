const fs = require('fs');

const BANNED_WORDS = [
    'delve', 'robust', 'seamless', 'synergy', 'tapestry', 'cutting-edge', 
    'leverage', 'furthermore', 'moreover', 'ultimately', 'in conclusion', 'unlocking'
];

// Matches em-dashes
const EMDASH_REGEX = /—/g;
// Matches common emoji ranges
const EMOJI_REGEX = /[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}\u{1F191}-\u{1F251}]/gu;

try {
    const input = fs.readFileSync(0, 'utf-8');
    const payload = JSON.parse(input);
    const tool = payload.toolCall.name;
    const args = payload.toolCall.args;
    
    // Whitelist the rules/manifestos themselves so we can document the banned items
    const targetFile = args.TargetFile || '';
    if (targetFile.includes('anti-slop-guard.js') || 
        targetFile.includes('AI_INSTRUCTIONS.md') || 
        targetFile.includes('manifesto.md') ||
        targetFile.includes('global.mdc')) {
        console.log(JSON.stringify({ decision: 'allow' }));
        process.exit(0);
    }
    
    let content = '';
    if (tool === 'write_to_file') content = args.CodeContent || '';
    if (tool === 'replace_file_content') content = args.ReplacementContent || '';
    
    const contentLower = content.toLowerCase();
    
    for (const word of BANNED_WORDS) {
        if (contentLower.includes(word)) {
            console.log(JSON.stringify({
                decision: 'deny',
                reason: `CRITICAL RULE VIOLATION: Banned AI-slop word '${word}'. Rewrite without this word.`
            }));
            process.exit(0);
        }
    }
    
    if (EMDASH_REGEX.test(content)) {
        console.log(JSON.stringify({
            decision: 'deny',
            reason: `CRITICAL RULE VIOLATION: Em-dashes (—) are banned as they are a common AI formatting trope. Use standard commas or separate sentences.`
        }));
        process.exit(0);
    }
    
    if (EMOJI_REGEX.test(content)) {
         console.log(JSON.stringify({
            decision: 'deny',
            reason: `CRITICAL RULE VIOLATION: Emojis are banned to maintain a professional, high signal-to-noise ratio. Remove the emojis.`
        }));
        process.exit(0);
    }
    
    console.log(JSON.stringify({ decision: 'allow' }));
} catch (e) {
    console.log(JSON.stringify({ decision: 'allow', reason: "Hook error: " + e.message }));
}
