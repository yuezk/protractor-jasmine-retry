# protractor-jasmine-retry [![CircleCI](https://circleci.com/gh/yuezk/protractor-jasmine-retry.svg?style=svg)](https://circleci.com/gh/yuezk/protractor-jasmine-retry)
A Protractor plugin to automatically re-run failed test specs for Jasmine test framework.

Inspired by [protractor-retry](https://github.com/yahoo/protractor-retry), but added some improvements.

1. Support Windows
1. Support non parallel mode, fix [#62](https://github.com/yahoo/protractor-retry/issues/62)
1. Collect failed files from the stacktrace, which is more accurate
1. Converted to a Protractor plugin, which would simplify the configuration
1. Provide more APIs to make it easier to integrate with other plugins, like
[protractor-beautiful-reporter](https://www.npmjs.com/package/protractor-beautiful-reporter)
and [protractor-screenshoter-plugin](https://github.com/azachar/protractor-screenshoter-plugin)

But the bad news is it only supports Jasmine framework now.

## Usage

1. Install with npm/yarn
```sh
npm install --save-dev protractor-jasmine-retry
```

2. Use it in the protractor config file

```js
const ProtractorJasmineRetry = require('protractor-jasmine-retry'); 

exports.config = {
    plugins: [
        ProtractorJasmineRetry(/* { maxAttempts: 2 } */),
    ],

    afterLaunch(exitCode) {
        return ProtractorJasmineRetry.afterLaunch(exitCode);
    }
};
```

## API

### `ProtractorJasmineRetry(opts)`

The plugin constructor.

- `opts.maxAttempts`: The max attempts before success. Default is `2`
- `opts.resultPath`: The folder used to save the temp result file relative to the current working directory. Default is `protractorFailedSpecs`

### `ProtractorJasmineRetry.afterLaunch(exitCode)`

This function should be called with exit code of the Protractor's `afterLaunch` callback and return it.

### `ProtractorJasmineRetry.retriedTimes`

Returns the retried times, it could be `0`, `1`, `2` if the `maxAttempts` is `2`.

### `ProtractorJasmineRetry.isLastAttempt()`

Returns whether current run is the last attempt.

## Integrate with other plugins

The idea is that construct a run ID using the `ProtractorJasmineRetry.retriedTimes` and use it to distinct the configuration of other plugins.

```js
const ProtractorJasmineRetry = require('protractor-jasmine-retry'); 
const runId = `run_${ProtractorJasmineRetry.retriedTimes + 1}`; // it could be `run_1`, `run_2`, `run_3`...

exports.config = {
    plugins: [
        {
            package: 'protractor-screenshoter-plugin',
            screenshotPath: path.join('screenshoter', runId), // The reports can be saved in different folders
            // ... ...
        }
    ]
};
```

## License

[MIT](LICENSE)
