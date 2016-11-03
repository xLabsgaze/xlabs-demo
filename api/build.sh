#!/usr/bin/env bash

browserify="browserify"

dst="xlabs_dist.js"

echo "" > "${dst}"
echo "(function() {" >> "${dst}"
cat "./utils.js" >> "${dst}"
cat "./window_connection.js" >> "${dst}"
cat "./xlabs.js" >> "${dst}"
echo "})();" >> "${dst}"
