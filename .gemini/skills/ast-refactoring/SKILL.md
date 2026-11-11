---
name: ast-refactoring
description: 'Safe and scalable mass-refactoring of TypeScript/React codebase using ts-morph (AST manipulation) instead of dangerous Regular Expressions.'
---

# AST Refactoring Skill

This skill equips agents with the knowledge and templates to modify TypeScript (`.ts`) and React (`.tsx`) files safely using Abstract Syntax Trees (AST) via the `ts-morph` Node.js library.

**DO NOT use Python Regular Expressions to refactor React/TSX files**, as it frequently breaks syntax (e.g. `useState<string>`).

## Prerequisites

1. Ensure the user's project has a `tsconfig.json`.
2. Install `ts-morph` locally or globally: `npm install ts-morph` (if not already present).

## How to use this skill

When you are asked to perform mass refactoring (like wrapping texts in a translation hook, renaming components, or extracting interfaces):

1. Copy the template script located at `scripts/ast-template.js` to a temporary location (e.g., `tmp_refactor.js`).
2. Modify the logic inside the script to traverse the AST nodes (`CallExpression`, `StringLiteral`, `JsxText`, etc.) according to the specific refactoring goal.
3. Run the script using Node: `node tmp_refactor.js`
4. Run `npm run types:check` and `npm run format` after to ensure everything remains valid.

## Example Usage: Wrapping Strings in JsxText

```javascript
const { Project, SyntaxKind } = require('ts-morph');
const project = new Project({ tsConfigFilePath: './tsconfig.json' });

const sourceFiles = project.getSourceFiles('resources/js/components/**/*.tsx');

for (const sourceFile of sourceFiles) {
    let modified = false;

    sourceFile.forEachDescendant((node) => {
        if (node.getKind() === SyntaxKind.JsxText) {
            const text = node.getText().trim();
            if (text.length > 0 && /^[a-zA-Z]/.test(text)) {
                // Safely replace JsxText with an expression: {t('text')}
                node.replaceWithText(`{t('${text.replace(/'/g, "\\'")}')}`);
                modified = true;
            }
        }
    });

    if (modified) {
        // Automatically adds import if not present
        if (
            !sourceFile.getImportDeclaration(
                (decl) =>
                    decl.getModuleSpecifierValue() === '@/hooks/useTranslate',
            )
        ) {
            sourceFile.addImportDeclaration({
                defaultImport: 'useTranslate',
                moduleSpecifier: '@/hooks/useTranslate',
            });
        }
        sourceFile.saveSync();
    }
}
```

## Useful SyntaxKinds in React

- `SyntaxKind.JsxElement` (Full element `<div/>`)
- `SyntaxKind.JsxOpeningElement` (Opening tag `<div>`)
- `SyntaxKind.JsxAttribute` (Attribute `className="..."`)
- `SyntaxKind.StringLiteral` (String `"..."`)
- `SyntaxKind.Identifier` (Variable names, components)

Rely on `ts-morph`'s `.replaceWithText()` or `.addStatements()` for structural safety.
