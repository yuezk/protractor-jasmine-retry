describe('Test Retry', () => {
    it('should pass for the second retry', () => {
        expect(browser.retriedTimes).toBe(2);
    });
});
