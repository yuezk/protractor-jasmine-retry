const PLUGIN_NAME = 'ProtractorJasmineRetry';
const path = require('path');
const util = require('util');
const fs = require('fs');
const del = require('del');
const { argv } = require('yargs');
const stacktraceParser = require('stacktrace-parser');
const unparse = require('yargs-unparser');
const spawn = require('cross-spawn');
const makeDir = require('make-dir');
const chalk = require('chalk');
const semver = require('semver');

const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

const { retry: retriedTimes = 0 } = argv;
const builtInSpec = '__protractor_internal_afterEach_setup_spec.js';
const DEFAULT_RESULT_PATH = path.join(process.cwd(), 'protractorFailedSpecs');

let maxAttempts;
let resultPath;

const log = console.log.bind(console, `[${PLUGIN_NAME}]`);

function resultFile() {
    return path.join(resultPath, `${retriedTimes + 1}.json`);
}

async function getFailedSpecs() {
    try {
        return JSON.parse(await readFile(resultFile(), 'utf8'));
    } catch (err) {
        return [];
    }
}

async function updateResultFile(failedSpecs) {
    const savedSpecs = await getFailedSpecs();
    savedSpecs.push.apply(savedSpecs, Array.from(failedSpecs));
    await writeFile(
        resultFile(),
        JSON.stringify(Array.from(new Set(savedSpecs)))
    );
}

function ProtractorRetry(opts = {}) {
    maxAttempts = typeof opts.maxAttempts === 'number' ? opts.maxAttempts : 2;
    resultPath = opts.resultPath || DEFAULT_RESULT_PATH;

    let allSpecs;

    const failedSpecs = new Set();

    function extractSpecFile(stack) {
        const stackFrames = stacktraceParser.parse(stack);
        for (const frame of stackFrames.reverse()) {
            const file = path.normalize(frame.file);
            if (allSpecs.includes(file)) {
                return file;
            }
        }
        return null;
    }

    function addFailedSpecs({ failedExpectations }) {
        for (const expectation of failedExpectations) {
            const file = extractSpecFile(expectation.stack);
            if (file) {
                failedSpecs.add(file);
            } else {
                log(chalk.red('Failed to extract the failed spec file, treat all spec files as the failed specs.'));
                if (semver.lt(process.version, '12.0.0')) {
                    log(chalk.red('Please consider upgrading Node.js to v12.x or newer to fix this issue.'));
                }
                log('The stack is:', chalk.yellow(expectation.stack));
                allSpecs.forEach(failedSpecs.add, failedSpecs);
            }
        }
    }

    return {
        inline: {
            name: PLUGIN_NAME,
            async onPrepare() {
                if (maxAttempts <= 0) {
                    return;
                }

                // Create a custom report to hook into the suite information
                const env = jasmine.getEnv();
                env.addReporter({
                    specDone: addFailedSpecs,
                    suiteDone: addFailedSpecs,
                    jasmineDone: addFailedSpecs
                });

                // Get all spec files from the processed config
                const { specs } = await browser.getProcessedConfig();
                allSpecs = specs.filter(spec => !spec.includes(builtInSpec))
                    .map(path.normalize);

                // Clean the result folder for the first run
                if (retriedTimes === 0) {
                    await del(resultPath);
                    await makeDir(resultPath);
                }
            },
            async postResults() {
                if (maxAttempts <= 0) {
                    return;
                }
                await updateResultFile(failedSpecs);
            },
        }
    };
}

// Whether the current run is the last attempt
function isLastAttempt() {
    if (typeof maxAttempts === 'undefined') {
        throw new Error('isLastAttempt() cannot be called before the plugin initialized');
    }
    return retriedTimes >= maxAttempts;
}
ProtractorRetry.isLastAttempt = isLastAttempt;
ProtractorRetry.retriedTimes = retriedTimes;
ProtractorRetry.afterLaunch = async function afterLaunch(exitCode) {
    if (typeof maxAttempts === 'undefined') {
        throw new Error(`[${PLUGIN_NAME}] has not been initialized, please initialized it first`);
    }

    // No need to retry for this case
    if (maxAttempts <= 0) {
        return exitCode;
    }

    if (exitCode === 0) {
        if (retriedTimes) {
            log(`Test passed after ${retriedTimes} attempts`);
        }
        return 0;
    }

    if (isLastAttempt()) {
        log(`Test failed after ${retriedTimes} attempts, exiting with code`, exitCode);
        return exitCode;
    }

    const failedSpecs = await getFailedSpecs();
    if (!failedSpecs.length) {
        log(`Hasn't collected any failed specs, nothing to retry, exiting with code`, exitCode);
        return exitCode;
    }

    const specs = failedSpecs.join(',');
    // Generate the protractor command
    const protractorArgs = unparse(Object.assign({}, argv, {
        specs,
        suite: specs ? '' : null, // Override suite to empty if specs is not empty
        retry: retriedTimes + 1,
        disableChecks: true
    }));

    log('Re-running tests, attempt:', retriedTimes + 1);
    log('Re-running the following test files:', specs);

    log('Running command', argv.$0, protractorArgs.join(' '));

    const child = spawn(argv.$0, protractorArgs, { stdio: 'inherit' });
    return new Promise((resolve) => {
        child.on('exit', resolve);
    });
};

module.exports = ProtractorRetry;
