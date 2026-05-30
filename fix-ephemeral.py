#!/usr/bin/env python3
# ephemeral: true -> flags: MessageFlags.Ephemeral dönüştürücü

import re
import os

def fix_ephemeral_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # ephemeral: true -> flags: MessageFlags.Ephemeral
    pattern = r'ephemeral:\s*true'
    replacement = 'flags: MessageFlags.Ephemeral'
    
    new_content = re.sub(pattern, replacement, content, flags=re.IGNORECASE)
    
    # deferReply için özel kontrol
    defer_pattern = r'deferReply\(\s*\{\s*ephemeral:\s*true\s*\}\s*\)'
    defer_replacement = 'deferReply({ flags: MessageFlags.Ephemeral })'
    new_content = re.sub(defer_pattern, defer_replacement, new_content, flags=re.IGNORECASE)
    
    if content != new_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"✅ {filepath} güncellendi")
        return True
    else:
        print(f"ℹ️  {filepath} değişiklik yok")
        return False

def main():
    files_to_fix = [
        'index-full.js',
        'index-simple.js',
        'index.js'
    ]
    
    fixed_count = 0
    for filename in files_to_fix:
        if os.path.exists(filename):
            if fix_ephemeral_in_file(filename):
                fixed_count += 1
    
    print(f"\nToplam {fixed_count} dosya güncellendi")
    
    # Ayrıca MessageFlags import kontrolü
    for filename in ['index-full.js', 'index-simple.js', 'index.js']:
        if os.path.exists(filename):
            with open(filename, 'r', encoding='utf-8') as f:
                content = f.read()
            
            if 'MessageFlags' in content and 'require(\'discord.js\')' in content:
                # MessageFlags import kontrolü
                if 'MessageFlags' not in content.split('require(\'discord.js\')')[0]:
                    print(f"⚠️  {filename}: MessageFlags import edilmemiş olabilir")
                else:
                    print(f"✅ {filename}: MessageFlags import edilmiş")

if __name__ == '__main__':
    main()