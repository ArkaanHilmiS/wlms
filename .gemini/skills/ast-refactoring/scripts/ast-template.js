const { Project, SyntaxKind } = require('ts-morph');

// 1. Initialize Project based on tsconfig
const project = new Project({
    tsConfigFilePath: './tsconfig.json',
});

// 2. Target specific files (modify glob as needed)
// Example: "resources/js/pages/**/*.tsx"
const sourceFiles = project.getSourceFiles('resources/js/components/**/*.tsx');

console.log(`Found ${sourceFiles.length} files to process.`);

for (const sourceFile of sourceFiles) {
    let modified = false;

    // 3. Traverse AST nodes
    sourceFile.forEachDescendant((node) => {
        // Example: Find all JSX Text nodes
        if (node.getKind() === SyntaxKind.JsxText) {
            const text = node.getText();

            // TODO: Add your refactoring logic here
            // Example condition: if (text.trim() !== "") { ... }

            /*
             * Safely replace text
             * node.replaceWithText(`{t('${text.trim()}')}`);
             * modified = true;
             */
        }
    });

    // 4. Save changes if the AST was modified
    if (modified) {
        console.log(`Saving changes to: ${sourceFile.getFilePath()}`);
        sourceFile.saveSync();
    }
}

console.log('AST manipulation complete.');
