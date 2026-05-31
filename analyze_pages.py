import os
import re

def analyze_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    results = {
        'path': file_path,
        'has_loading': False,
        'has_skeleton': False,
        'has_empty': False,
        'has_arabic_cta': False,
        'has_error': False,
        'has_retry': False,
        'has_smart_empty': False,
        'missing': []
    }

    # Loading check
    if re.search(r'isLoading|isFetching|status === [\'"]pending[\'"]|status === [\'"]loading[\'"]', content):
        results['has_loading'] = True
    if re.search(r'Skeleton|Spinner|Loading', content):
        results['has_skeleton'] = True
    
    if not results['has_loading'] and not results['has_skeleton']:
        results['missing'].append('Loading state')

    # Empty state check
    if 'EmptyState' in content or 'length === 0' in content or '.length === 0' in content:
        results['has_empty'] = True
    
    # Arabic CTA check (rough check for Arabic characters in EmptyState or similar)
    if results['has_empty']:
        # Look for Arabic text in quotes
        if re.search(r'[\u0600-\u06FF]', content):
            results['has_arabic_cta'] = True
    
    if not results['has_empty']:
        results['missing'].append('Empty state')
    elif not results['has_arabic_cta']:
        results['missing'].append('Arabic CTA in empty state')

    # Error state check
    if re.search(r'isError|error|onError|throw', content):
        results['has_error'] = True
    if re.search(r'refetch|retry|Reload', content):
        results['has_retry'] = True

    if not results['has_error']:
        results['missing'].append('Error state')
    elif not results['has_retry'] and results['has_error']:
        results['missing'].append('Retry button in error state')

    # Smart empty distinction
    # Look for patterns like "if (searchTerm) ... else ..." in empty state logic
    if re.search(r'search|filter|query|params', content) and results['has_empty']:
        if 'search' in content.lower() and ('no results' in content.lower() or 'search' in content.lower()):
            # This is hard to detect perfectly with regex, but we'll try to find conditional empty messages
            if re.search(r'\?.*:.*EmptyState', content, re.DOTALL) or 'if' in content:
                 results['has_smart_empty'] = True

    if not results['has_smart_empty'] and results['has_empty']:
        results['missing'].append('Smart empty/filter distinction')

    return results

pages_dir = 'src/pages'
all_results = []

for root, dirs, files in os.walk(pages_dir):
    for file in files:
        if file.endswith('.tsx'):
            full_path = os.path.join(root, file)
            all_results.append(analyze_file(full_path))

# Group by feature area
features = {}
for res in all_results:
    parts = res['path'].split('/')
    if len(parts) > 2:
        feature = parts[2]
        if feature.endswith('.tsx'):
             feature = 'Root'
    else:
        feature = 'Root'
    
    if feature not in features:
        features[feature] = []
    features[feature].append(res)

print("# UX States Audit Report")
print("\nGenerated automatically. Severity: High (Missing Loading/Error), Medium (Missing Empty/Smart Distinction), Low (Missing Arabic CTA/Retry).\n")

for feature, items in sorted(features.items()):
    print(f"## {feature.capitalize()}")
    for item in items:
        if item['missing']:
            severity = "Low"
            if "Loading state" in item['missing'] or "Error state" in item['missing']:
                severity = "High"
            elif "Empty state" in item['missing']:
                severity = "Medium"
            
            print(f"- **{item['path']}**")
            print(f"  - Missing: {', '.join(item['missing'])}")
            print(f"  - Severity: {severity}")
    print()
