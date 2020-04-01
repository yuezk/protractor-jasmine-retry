const ProtractorJasmineRetry = require('../..');

exports.config = {
    specs: ['./specs/*.js'],

    plugins: [
        ProtractorJasmineRetry({ maxAttempts: 2 }),
    ],

    capabilities: {
        shardTestFiles: true,
        maxInstances: 4,
        browserName: 'chrome',
        chromeOptions: {
            args: ['--headless']
        }
    },

    onPrepare() {
        browser.ignoreSynchronization = true;
        browser.retriedTimes = ProtractorJasmineRetry.retriedTimes;
        browser.isLastAttempt = ProtractorJasmineRetry.isLastAttempt;
    },

    afterLaunch(exitCode) {
        return ProtractorJasmineRetry.afterLaunch(exitCode);
    }
};
