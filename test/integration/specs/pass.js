describe('Test Retry', () => {
    it('should pass for the first run', () => {
        expect(browser.retriedTimes).toBe(0);
    });
});
