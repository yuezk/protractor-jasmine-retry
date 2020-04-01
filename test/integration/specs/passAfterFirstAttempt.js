describe('Test Retry', () => {
    it('should pass for the first retry', () => {
        expect(browser.retriedTimes).toBe(1);
    });
});
