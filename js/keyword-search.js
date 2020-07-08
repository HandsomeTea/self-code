/**vue项目中饿关键字搜索
 * 待输入完成再搜索
 */
const watch = {
    keyword() {
        const waitTime = 600;
        if (this.waitForKeywordInputEndTimer === null) {
            this.waitForKeywordInputEndTimer = setTimeout(() => {
                this.getUserListAndSetListChosedData();
            }, waitTime);
        } else {
            clearTimeout(this.waitForKeywordInputEndTimer);
            this.waitForKeywordInputEndTimer = setTimeout(() => {
                this.getUserListAndSetListChosedData();
            }, waitTime);
        }
    }
}
