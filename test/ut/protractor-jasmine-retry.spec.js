const ProtractorJasmineRetry = require('../../');

describe('Protractor Retry UT', () => {
    describe('not initialized', () => {
        describe('#afterLaunch', () => {
            it('should throw', async () => {
                await expectAsync(ProtractorJasmineRetry.afterLaunch()).toBeRejectedWithError(/has not been initialized/);
            });
        });

        describe('#isLastAttempt', () => {
            it('should throw', () => {
                expect(() => ProtractorJasmineRetry.isLastAttempt()).toThrow();
            });
        });
    });

    describe('initialized', () => {
        let plugin;
        beforeEach(() => {
            plugin = ProtractorJasmineRetry({ maxAttempts: 0 });
        });

        describe('#onPrepare', () => {
            it('should resolved', async () => {
                await expectAsync(plugin.inline.onPrepare()).toBeResolved();
            });
        });

        describe('#postResults', () => {
            it('should resolved', async () => {
                await expectAsync(plugin.inline.postResults()).toBeResolved();
            });
        });

        describe('#afterLaunch', () => {
            it('should return the exitCode if maxAttempts <= 0', async () => {
                await expectAsync(ProtractorJasmineRetry.afterLaunch(100)).toBeResolvedTo(100);
            });

            it('should return 0 if the exitCode is 0', async () => {
                await expectAsync(ProtractorJasmineRetry.afterLaunch(0)).toBeResolvedTo(0);
            });
        });
    });
});
