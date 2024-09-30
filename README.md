This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

# ProseMirror vs. Lexical Performance Comparison

[![made by Emergence Engineering](https://emergence-engineering.com/ee-logo.svg)](https://emergence-engineering.com)


# Before testing: Settings
Right at the beginning, you need to make two decisions: what parameters you want the tests to run on and what data you want to extract.

## 1) Parameters

Open the `test/constants.ts` file and have a look at the... well, the constants: 

- **MEASUREMENT_INTERVAL** (time, ms): how often the code saves the metrics you selected - default is 15 sec


- **MAX_NODES** (number): how many nodes to insert into the editor - default is 20k to make sure the test doesn't finish before the set timeout


- **NODECOUNT_CHECKPOINT** (number): the node count at which you want to save the time-nodeCount pair - default is 200


- **TIMEOUT** (time, ms): how long the test would run - default is 1 hour


- **GLOBALTIMEOUT** (time, ms): how long the test would run WITH the before/after hooks included - default is 130 mins


- ...and now select the performance metrics you are interested in from the `metrics` array.

***Please note that the tests of the two editors will run one after the other. Set the timeout and the max node count accordingly.***

## 2) Results

### What files are going to be created:
- `.json` file with an array of the selected metric names and values with the current node count, at the time of the measurement (set with MEASUREMENT_INTERVAL)
- `.json` file with an array of timestamps and the node count, at the specified nodeCount-checkpoint (set with NODECOUNT_CHECKPOINT)
- `.json` files generated from the first one, with each metric having its own\
you can disable this generation by opening the `test/stressTest.spec.ts` file and
  *removing the first slash* from the beginning of the `//* do you need JSON files of each enabled metric with the current nodecount?` comment: this will disable the file-generation.


# Testing: Here we go!

In the `playwright.config.ts` file we enabled the option to start the dev server along with the test with the single 
```bash
npm run test
# or
yarn test
```
command.\
If it's not your thing, or you want to check out the [app](http://localhost:3000) first, (after disabling the relevant part in the config) start the server with the 
```bash
npm run dev
# or
yarn dev
```
command and then run the test when you're ready.

***Please note that the tests of the two editors will run one after the other. Set the timeout and the max node count accordingly.***


# After testing: Graphs

You will find all the data you have enabled to run in the `test/results` folder.

### How to create graphs?
When your tests are done and all the json files are generated you can create graphs.\
First, open the file `test/createGraphs.ts` where you find two blocks: time(x)-nodecount(y) graph creation and nodecount(x)-metric(y) graph creation. Both blocks have three options: draw a graph with the results of both editors, or just Lexical, or just ProseMirror. Please comment out the `createGraph` function calls you don't need.

When you are done just run the script
```bash
npm run createGraphs
# or
yarn createGraphs
```

The graphs are `.png` images in the `/results/graphs` folder.

*On the time(x)-nodeCount(y) graphs the x-values are converted from milliseconds to seconds* - you can disable it in the `createTimeNodecountGraphs` function.\
*On the JSHeapUsedSize graph the y-values are converted from bytes to MB* - you can disable it in the `filterMetric` function.\

### Please let us know if you find any bugs or if you encounter any unforeseen problems!
### Have fun!