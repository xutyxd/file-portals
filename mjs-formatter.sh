#!/bin/bash

folder_path="mjs"
extension="class.js"

# Find all .js files in the folder and its subdirectories
js_files=$(find "$folder_path" -type f -name "*$extension")

for file in $js_files; do
    # Use sed to replace lines ending with ".class" with ".class.js"
    sed -i 's/\.class\b/\.class.js/g' "$file"
done