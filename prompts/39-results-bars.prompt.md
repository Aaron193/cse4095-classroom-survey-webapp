checked the results page on the live site. the counts and percentages are right and the CSV export is good, but none of the bars draw: every choice just shows the empty gray track. in the DOM each chart is a 958x20 recharts wrapper with no .recharts-bar-rectangle inside. I think it's the layout="vertical" BarChart with only a numeric XAxis. in vertical layout the bars sit on the y axis, and without a category YAxis recharts has nowhere to put them.

please fix it so each bar is filled to its percentage (a hidden category YAxis should do it, or whatever's cleanest in recharts 3). also add a test that renders the chart at a fixed size and checks that a bar is actually drawn with a width that matches the percentage, so this can't silently break again. keep the counts and percentages as text like now.

run build, lint, tests and prettier. no TODO edits, no commits.
