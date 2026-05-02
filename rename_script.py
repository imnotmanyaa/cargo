import os
import re

dirs_to_scan = ['backend/internal', 'src']
extensions = ['.go', '.tsx', '.ts']

replacements = [
    (r'\bemail\b', 'login'),
    (r'\bEmail\b', 'Login'),
    (r'\bclient_email\b', 'client_login'),
    (r'\bClientEmail\b', 'ClientLogin'),
    (r'\bErrDuplicateEmail\b', 'ErrDuplicateLogin'),
    (r'\bnormalizeEmail\b', 'normalizeLogin'),
    (r'emailPlaceholder', 'loginPlaceholder'),
    (r'emailRequired', 'loginRequired'),
]

for d in dirs_to_scan:
    for root, dirs, files in os.walk(d):
        for f in files:
            if any(f.endswith(ext) for ext in extensions):
                path = os.path.join(root, f)
                with open(path, 'r', encoding='utf-8') as file:
                    content = file.read()
                
                original_content = content
                for pattern, repl in replacements:
                    content = re.sub(pattern, repl, content)
                
                if content != original_content:
                    with open(path, 'w', encoding='utf-8') as file:
                        file.write(content)
                    print(f"Updated {path}")
