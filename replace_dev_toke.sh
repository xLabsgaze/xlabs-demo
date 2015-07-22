#!/bin/bash

if [ "$#" -ne 1 ]; then   
    echo "Usage: ./replace_dev_token.sh token"
    exit
fi

# Process all html files.
find . -name '*.html' | while IFS=$'\n' read -r FILE; do
    echo "Processing: $FILE"  
 
    sed -i'' 's/\(xLabs.setup([^,]*,[^,]*,[^,]*,[ ]*"\)[^"]*\(.*\)/\1'$1'\2/' $FILE
done

# Process all js files.
find . -name '*.js' | while IFS=$'\n' read -r FILE; do
    echo "Processing: $FILE"  
 
    sed -i'' 's/\(xLabs.setup([^,]*,[^,]*,[^,]*,[ ]*"\)[^"]*\(.*\)/\1'$1'\2/' $FILE
done
