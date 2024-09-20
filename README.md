This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

# Before testing: Settings
Right at the beginning, you need to make two decisions: what parameters you want the tests to run on and what data you want to extract.

## 1) Parameters

Open the `test/constants.ts` file and have a look at the... well, the constants: 

- **MEASUREMENT_INTERVAL** (time, ms): how often the code saves the metrics you selected - default is 15 sec


- **MAX_NODES** (number): how many nodes to insert into the editor - default is 20k to make sure the test doesn't finish before the set timeout


- **NODECOUNT_CHECKPOINT** (number): the node count at which you want to save the time-nodeCount pair - default is 200


- **TIMEOUT** (time, ms): how long the test would run - default is 1 hour


- **GLOBALTIMEOUT** (time, ms): how long the test would run WITH the before/after hooks included - default is 70 mins


- ...and now select the performance metrics you are interested in from the `metrics` array.

***Please note that the tests of the two editors will run one after the other. Set the timeout and the max node count accordingly.***

## 2) Result options

Open the `test/stressTest.spec.ts` file and have a look at the afterEach and afterAll hooks.
You will see comments like\
`//* do you need a JSON file of nodeCount-time pairs?` \
If so, there's nothing to see here, just move on to the next comment. \
If you don't need it though, please *remove the first slash* from the beginning of the comment: this will disable the function you don't want to run.

### What you can choose from:
- `.json` file with an array of the selected metric names and values with the current node count, at the time of the measurement (set with MEASUREMENT_INTERVAL)
- `.json` file with an array of timestamps and the node count, at the specified nodeCount-checkpoint (set with NODECOUNT_CHECKPOINT)
- `.json` files generated from the first one, with each metric having its own
- `.png` images of graphs, generated from the values of each metric and the nodeCounts - you can choose to have one graph comparing the two editors by metric, or two graphs for the two editors, or both

*On the JSHeapUsedSize graph the y-values are converted from bytes to MB* - you can disable it in the `processDataHelper` function

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


# After testing: 

You will find all the data you have enabled to run in the afterEach / afterAll hooks in the `test/results` folder.\
\
*Please let us know if you find any bugs or if you encounter any unforeseen problems!*