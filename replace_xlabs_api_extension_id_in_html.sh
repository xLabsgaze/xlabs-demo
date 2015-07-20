#!/bin/bash

# Process all html files.
find . -name '*.html' | while IFS=$'\n' read -r FILE; do
    echo "Processing: $FILE"  
 
    sed -i'' '/chrome-extension:\/\//s/[^\/]*\/xlabs.js/'$1'\/xlabs.js/g' $FILE

done

